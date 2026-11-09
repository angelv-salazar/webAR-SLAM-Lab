/*
 * Estudio SLAM colaborativo — v1
 * Editor existente en IndexedDB + Supabase para aportes individuales.
 * Cada contribuyente usa identidad anónima, el organizador prepara el ZIP oficial.
 */
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
import {composeMarker,routeURL} from './marker-composer.js?v=7';

const URL_SUPABASE='https://kflgqbqbpzhxmiyovsvg.supabase.co';
const CLAVE_PUBLICA='sb_publishable_sECvt4oXZdOkZQVFpth6XA_oG3fA5Vh';
const BUCKET='slam-colaboraciones';
const $=id=>document.getElementById(id);
const panel=$('slamCollab');
if(!panel)throw new Error('Falta el panel de colaboración.');
const elements={
 status:$('collabStatus'), joinName:$('collabName'),projectName:$('collabProjectName'),
 invite:$('collabInvite'),newBtn:$('collabCreate'),joinBtn:$('collabJoin'),
 projectPicker:$('collabProjectPicker'),workspace:$('collabWorkspace'),
 projectHeading:$('collabHeading'),role:$('collabRole'),inviteTools:$('collabInviteTools'),
 localPicker:$('collabLocalPicker'),sendBtn:$('collabSend'),refreshBtn:$('collabRefresh'),
 entries:$('collabEntries'),syncBtn:$('collabSync'),lockBtn:$('collabLock'),
 copyBtn:$('collabCopy'),listBtn:$('collabRefreshLocal'),publishHelp:$('collabPublishHelp'),
  summary:$('collabSummary'),overview:$('collabOverview'),
  coordinatorBox:$('collabCoordinatorBox'),coordinatorLogin:$('collabCoordinatorLogin'),
  createFields:$('collabCreateFields'),participantBox:$('collabParticipantBox'),
  pickerBox:$('collabProjectSelector'),adminEmail:$('collabAdminEmail'),
  adminLogin:$('collabAdminSignIn'),adminSignOut:$('collabAdminSignOut')
};
let client=null,person=null,ready=false,active=null,role='',projects=[],contributions=[];
const invitation=new URLSearchParams(location.hash.slice(1)).get('slam-invite')||'';
const invited=!!invitation;
let verifiedCoordinator=false,joinedProjectId=null;

function status(m,err=false){elements.status.textContent=m;elements.status.dataset.error=err?'true':'false';}
function checked(result){if(result.error)throw result.error;return result.data;}
function friendly(error){
 const s=String(error?.message||error||'Error desconocido');
 if(/anonymous.*disabled|anonymous.*not.*allowed/i.test(s))
   return 'Activá Authentication → Providers → Anonymous Sign-Ins en Supabase. No requiere cuentas de los participantes.';
 return s;
}
function randomToken(){
 const a=new Uint8Array(36);crypto.getRandomValues(a);
 return Array.from(a,v=>v.toString(16).padStart(2,'0')).join('');
}
function newRouteId(){return 'id-'+Date.now().toString(36)+'-'+Array.from(crypto.getRandomValues(new Uint8Array(4)),v=>v.toString(36)).join('');}
function entryPaths(projectId,ownerId,entryId){
 const path=projectId+'/'+ownerId+'/'+entryId+'/';
 return {model:path+'model.glb',art:path+'art.png',print:path+'print.png',patt:path+'pattern.patt'};
}
function fileSizeOk(blob,label){
 if(!blob || blob.size<=0 || blob.size>20*1024*1024)throw Error(label+' debe tener entre 1 byte y 20 MB.');
}
function localEntries(){
 const bridge=window.SLAM_COLLAB_BRIDGE;
 return typeof bridge?.list==='function'?bridge.list():[];
}
function refreshLocal(){
 const selected=elements.localPicker.value;
 elements.localPicker.replaceChildren();
 for(const entry of localEntries()){
   const option=document.createElement('option');option.value=entry.id;
   option.textContent=entry.name+(entry.ready?' · listo':' · faltan archivos');
   elements.localPicker.add(option);
 }
 if(Array.from(elements.localPicker.options).some(opt=>opt.value===selected))elements.localPicker.value=selected;
}
function projectOption(p){
 const opt=document.createElement('option');opt.value=p.id;
 opt.textContent=p.title+' · '+(p.state==='locked'?'cerrado':'editable');
 return opt;
}
function nameOrDefault(){return elements.joinName.value.trim();}

function setupScreen(){
 elements.coordinatorBox.hidden=invited;
 elements.participantBox.hidden=!invited || !!joinedProjectId;
 elements.pickerBox.hidden=invited || !verifiedCoordinator;
 elements.coordinatorLogin.hidden=invited || verifiedCoordinator;
 elements.createFields.hidden=invited || !verifiedCoordinator;
 if(invited){
   elements.summary.textContent='Recorrido compartido · invitación para artistas';
   elements.overview.textContent='Sumate al recorrido de la invitación. No necesitás cuenta, correo ni crear un proyecto.';
   elements.invite.value=invitation;
 }else{
   elements.summary.textContent='Colaboración · panel de coordinación';
   elements.overview.textContent='Creá y administrá recorridos. Cada artista entra por su propio enlace, sin elegir proyectos ni tener acceso a GitHub.';
 }
}
function keyForInvitation(){
 return 'slam-colab-joined-'+invitation.slice(0,24);
}
async function claimPreviousProjects(){
 // Protect the pre-existing test project created under the old anonymous model.
 const tokens=[];
 try{
   for(let i=0;i<localStorage.length;i++){
     const key=localStorage.key(i);
     if(key?.startsWith('slam-colab-invite-')){
       const token=localStorage.getItem(key);
       if(token)tokens.push(token);
     }
   }
 }catch(error){console.warn('No se pudo leer la lista anterior de invitaciones',error)}
 for(const token of tokens.slice(0,10)){
   const result=await client.rpc('slam_claim_legacy_project',{p_invite_token:token});
   if(result.error)console.info('Recorrido anterior no transferido:',result.error.message);
 }
}
async function init(){
 if(ready)return;
 status('Conectando con Supabase…');
 client=createClient(URL_SUPABASE,CLAVE_PUBLICA,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
   global:{headers:{'X-Client-Info':'estudio-slam-colaborativo/2'}}
 });
 let authSession=checked(await client.auth.getSession())?.session;
 if(invited){
   if(!authSession)authSession=checked(await client.auth.signInAnonymously())?.session;
   if(!authSession?.user)throw Error('No fue posible iniciar el acceso anónimo.');
   person=authSession.user;
   const stored=localStorage.getItem(keyForInvitation());
   if(stored && /^[0-9a-f-]{36}$/i.test(stored))joinedProjectId=stored;
   ready=true;
   setupScreen();
   await refreshProjects();
   setupScreen(); // Restore the invitation form if an old anonymous session was lost.
   if(joinedProjectId && active){
     await window.SLAM_COLLAB_BRIDGE?.activateGuest(active);
     document.documentElement.classList.remove('slam-invite-pending');
     status('Ya estás dentro de «'+active.title+'». Podés continuar editando tu aporte.');
   }else status('Invitación detectada. Escribí tu nombre y pulsá «Unirme y crear mi marcador».');
 }else{
   person=authSession?.user||null;
   if(person?.email){
     verifiedCoordinator=checked(await client.rpc('slam_is_coordinator'))===true;
     if(verifiedCoordinator){
       await claimPreviousProjects();
       status('Coordinador verificado. Elegí un recorrido o creá uno nuevo.');
     }else status('Este correo no está autorizado como coordinador. Verificá que uses tu correo de administración.',true);
   }else status('Acceso de coordinación: solicitá un enlace de verificación a tu correo.');
   ready=true;
   setupScreen();
   if(verifiedCoordinator)await refreshProjects();
 }
}
async function requestCoordinatorEmail(){
 if(invited)throw Error('Los artistas no necesitan correo ni cuentan con permisos de coordinación.');
 const email=elements.adminEmail.value.trim();
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('Escribí un correo electrónico válido.');
 const callback=new URL('./estudio.html',location.href);
 checked(await client.auth.signInWithOtp({
   email,
   options:{emailRedirectTo:callback.href,shouldCreateUser:true}
 }));
 status('Enviamos un enlace de acceso a tu correo. Abrilo en este navegador y luego desplegá «Colaboración». Si el enlace no vuelve al editor, agregá su URL en Supabase → Authentication → URL Configuration.');
}
async function coordinatorSignOut(){
 if(invited)return;
 checked(await client.auth.signOut());
 person=null;verifiedCoordinator=false;active=null;role='';projects=[];contributions=[];
 elements.workspace.hidden=true;
 setupScreen();
 status('Sesión de coordinación cerrada.');
}


async function refreshProjects(){
 if(!person)return;
 const members=checked(await client.from('slam_members')
   .select('project_id,role,display_name').eq('user_id',person.id))||[];
 const ids=members.map(m=>m.project_id);
 const rows=ids.length?checked(await client.from('slam_projects')
   .select('id,title,route_id,state,created_by').in('id',ids)):[];
 projects=(rows||[]).map(p=>({...p,member:members.find(m=>m.project_id===p.id)}));
 const old=invited?joinedProjectId:active?.id||elements.projectPicker.value;
 elements.projectPicker.replaceChildren();
 const blank=document.createElement('option');
 blank.value='';blank.textContent='Elegí un recorrido a administrar';
 elements.projectPicker.add(blank);
 for(const p of projects.filter(p=>p.member.role==='owner' || invited))elements.projectPicker.add(projectOption(p));
 if(old && projects.some(p=>p.id===old))await chooseProject(old);
 else if(!invited && projects.filter(p=>p.member.role==='owner').length===1)
   await chooseProject(projects.find(p=>p.member.role==='owner').id);
 else{active=null;role='';elements.workspace.hidden=true;joinedProjectId=invited?null:joinedProjectId;}
}

async function chooseProject(id){
 const p=projects.find(row=>row.id===id);
 if(!p || (!invited&&p.member.role!=='owner') || (invited&&p.id!==joinedProjectId)){
   active=null;role='';elements.workspace.hidden=true;return;
 }
 active=p;role=p.member.role;
 elements.projectPicker.value=id;elements.workspace.hidden=false;
 elements.projectHeading.textContent=p.title;
 elements.role.textContent=role==='owner'?'Organización y publicación':'Participación';
 elements.inviteTools.hidden=role!=='owner';
 const hasLink=!!localStorage.getItem('slam-colab-invite-'+id);
 elements.copyBtn.disabled=!hasLink;
 elements.copyBtn.title=hasLink?'Compartir invitación':'Enlace de invitación disponible en el navegador donde se creó el recorrido';
 elements.syncBtn.hidden=role!=='owner';
 elements.lockBtn.hidden=role!=='owner';
 elements.lockBtn.textContent=p.state==='locked'?'Reabrir aportaciones':'Cerrar aportaciones';
 elements.sendBtn.disabled=p.state!=='draft';
 elements.publishHelp.hidden=role!=='owner';
 refreshLocal();
 await reloadContributions();
}
async function reloadContributions(){
 if(!active)return;
 contributions=checked(await client.from('slam_entries')
   .select('id,project_id,user_id,source_entry_id,author_label,title,description,model_path,marker_image_path,marker_print_path,patt_path,x_cm,y_cm,z_cm,size_cm,rotation_deg,rotation_vertical_deg,animation,updated_at')
   .eq('project_id',active.id).order('updated_at',{ascending:false}))||[];
 elements.entries.replaceChildren();
 if(!contributions.length){
   const empty=document.createElement('p');empty.className='muted';empty.textContent='Todavía no hay obras compartidas.';elements.entries.append(empty);
 }else{
   for(const entry of contributions){
     const item=document.createElement('div');item.className='collab-entry';
     const label=document.createElement('strong');label.textContent=entry.title;
     const aside=document.createElement('span');aside.textContent=entry.author_label+
       (entry.user_id===person.id?' · tu aporte':' · participante')+
       ' · '+new Date(entry.updated_at).toLocaleDateString('es-AR');
     item.append(label,aside);elements.entries.append(item);
   }
 }
 status(contributions.length+' obra(s) compartida(s). '+(active.state==='locked'?'Aportaciones cerradas.':'Se pueden agregar o actualizar obras.'));
}
async function upload(path,blob,mime){
 fileSizeOk(blob,path.split('/').pop());
 checked(await client.storage.from(BUCKET).upload(path,blob,{
   upsert:true,contentType:mime,cacheControl:'120'
 }));
}
async function toPng(blob){
 const url=URL.createObjectURL(blob);
 try{
   const img=new Image();img.decoding='async';img.src=url;
   await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   if(!canvas.width||!canvas.height||canvas.width>8000||canvas.height>8000)throw Error('Dimensiones de imagen no admitidas.');
   canvas.getContext('2d').drawImage(img,0,0);
   return await new Promise((resolve,reject)=>canvas.toBlob(
     b=>b?resolve(b):reject(Error('No se pudo convertir la imagen.')),'image/png'
   ));
 }finally{URL.revokeObjectURL(url);}
}
async function submitContribution(){
 if(!active||active.state!=='draft')throw Error('El recorrido no admite nuevos aportes.');
 const e=window.SLAM_COLLAB_BRIDGE?.get(elements.localPicker.value);
 if(!e)throw Error('Seleccioná un marcador del editor.');
 if(!e.modelBlob||!e.markerImageBlob||!e.markerValidation?.ok)throw Error('Primero cargá un GLB, una imagen admitida y completá la validación del marcador en el editor.');
 if(!/^id-[a-z0-9-]{8,60}$/i.test(e.id))throw Error('Identificador de marcador no admitido.');
 fileSizeOk(e.modelBlob,'Modelo GLB');
 const head=new Uint8Array(await e.modelBlob.slice(0,4).arrayBuffer());
 if(String.fromCharCode(...head)!=='glTF')throw Error('El archivo no contiene un GLB válido.');
 const path=entryPaths(active.id,person.id,e.id);
 status('Generando marcador y QR del recorrido compartido…');
 const {finalBlob,pattern}=await composeMarker({imageBlob:e.markerImageBlob,sessionId:active.route_id});
 const art=await toPng(e.markerImageBlob);
 const patt=new Blob([pattern],{type:'text/plain'});
 status('Subiendo GLB y marcadores al espacio compartido…');
 await upload(path.model,e.modelBlob,'model/gltf-binary');
 await upload(path.art,art,'image/png');
 await upload(path.print,finalBlob,'image/png');
 await upload(path.patt,patt,'text/plain');
 const payload={
   project_id:active.id,user_id:person.id,source_entry_id:e.id,
   author_label:nameOrDefault()||active.member.display_name||'Participante',
   title:(e.name||'Marcador').slice(0,100),
   description:String(e.description||'').slice(0,500),
   model_path:path.model,marker_image_path:path.art,marker_print_path:path.print,patt_path:path.patt,
   x_cm:e.x||0,y_cm:e.y||0,z_cm:e.z||0,size_cm:e.size||12,
   rotation_deg:e.rotation||0,rotation_vertical_deg:e.rotationVertical||0,
   animation:e.animation||'none',updated_at:new Date().toISOString()
 };
 const found=checked(await client.from('slam_entries').select('id')
   .eq('project_id',active.id).eq('user_id',person.id).eq('source_entry_id',e.id).maybeSingle());
 if(found?.id){
   const {project_id,user_id,source_entry_id,...changes}=payload;
   checked(await client.from('slam_entries').update(changes).eq('id',found.id).select('id').single());
 }else checked(await client.from('slam_entries').insert(payload).select('id').single());
 await reloadContributions();
 status('«'+e.name+'» guardado en la nube. Los demás integrantes ya pueden verlo.');
}
async function getBlob(path){
 const data=checked(await client.storage.from(BUCKET).download(path));
 if(!(data instanceof Blob))throw Error('No se pudo obtener '+path);
 return data;
}
async function importProject(){
 if(role!=='owner')throw Error('Solo el organizador puede reunir el recorrido.');
 if(!contributions.length)throw Error('Todavía no hay obras compartidas.');
 if(!window.SLAM_COLLAB_BRIDGE?.importAll)throw Error('El editor no está listo.');
 if(!confirm('¿Importar '+contributions.length+' obras al editor? Se reemplazará el recorrido local con el mismo identificador, si existe. Tus demás recorridos locales permanecerán intactos.'))return;
 status('Recuperando obras compartidas y comprobando sus marcadores…');
 const files=[];
 for(const row of contributions){
   const [model,image,print,patt]=await Promise.all([
     getBlob(row.model_path),getBlob(row.marker_image_path),
     getBlob(row.marker_print_path),getBlob(row.patt_path)
   ]);
   files.push({row,model,image,print,pattText:await patt.text()});
 }
 await window.SLAM_COLLAB_BRIDGE.importAll(active,files);
 status('Recorrido reunido en el editor: '+files.length+' obras. Revisá la vista 3D y pulsá «Preparar publicación» para descargar el ZIP definitivo.');
 window.scrollTo({top:0,behavior:'smooth'});
}
async function createProject(){
 const title=elements.projectName.value.trim();
 if(!verifiedCoordinator||invited)throw Error('Solo el coordinador verificado puede crear recorridos.');
 if(!title)throw Error('Escribí el título del recorrido compartido.');
 const token=randomToken(),routeId=newRouteId();
 const id=checked(await client.rpc('slam_create_project',{p_title:title,p_route_id:routeId,p_invite_token:token}));
 localStorage.setItem('slam-colab-invite-'+id,token);
 await refreshProjects();await chooseProject(id);
 status('Recorrido creado. Copiá el enlace de invitación para tus participantes.');
}
async function joinProject(){
 const token=elements.invite.value.trim();
 const displayName=nameOrDefault();
 if(!displayName)throw Error('Indicá tu nombre para identificar la aportación.');
 if(!token)throw Error('Pegá el enlace de invitación o entrá desde el enlace compartido.');
 const match=token.match(/(?:#|[?&])slam-invite=([0-9a-f]+)/i);
 const clean=match?match[1]:token;
 const id=checked(await client.rpc('slam_join_project',{p_invite_token:clean,p_display_name:displayName}));
 joinedProjectId=id;
 localStorage.setItem(keyForInvitation(),id);
 await refreshProjects();
 setupScreen();
 if(!active)await chooseProject(id);
 await window.SLAM_COLLAB_BRIDGE?.activateGuest(active);
 document.documentElement.classList.remove('slam-invite-pending');
 status('Te sumaste al recorrido «'+active.title+'». Creá un marcador en el editor y enviá tu aporte.');
}
async function copyInvite(){
 if(!active||role!=='owner')return;
 const token=localStorage.getItem('slam-colab-invite-'+active.id);
 if(!token)throw Error('El enlace de invitación se guarda solamente en el navegador que creó el recorrido.');
 const url=new URL('estudio.html',location.href);
 url.hash='slam-invite='+token;
 await navigator.clipboard.writeText(url.href);
 status('Enlace de invitación copiado. Las personas no necesitarán cuenta de GitHub.');
}
async function toggleLock(){
 if(role!=='owner')return;
 const next=active.state==='locked'?'draft':'locked';
 checked(await client.from('slam_projects').update({state:next}).eq('id',active.id).select('id').single());
 await refreshProjects();await chooseProject(active.id);
 status(next==='locked'?'Aportaciones cerradas. Ya podés preparar la publicación.':'Aportaciones reabiertas.');
}
function busy(btn,fn){
 return async()=>{
  if(btn.disabled)return;
  btn.disabled=true;
  try{await init();await fn();}
  catch(e){console.error('[Estudio SLAM colaborativo]',e);status(friendly(e),true);}
  finally{btn.disabled=false;if(active?.state==='locked'&&btn===elements.sendBtn)btn.disabled=true;}
 };
}
elements.newBtn.onclick=busy(elements.newBtn,createProject);
elements.adminLogin.onclick=busy(elements.adminLogin,requestCoordinatorEmail);
elements.adminSignOut.onclick=busy(elements.adminSignOut,coordinatorSignOut);
elements.joinBtn.onclick=busy(elements.joinBtn,joinProject);
elements.sendBtn.onclick=busy(elements.sendBtn,submitContribution);
elements.copyBtn.onclick=busy(elements.copyBtn,copyInvite);
elements.syncBtn.onclick=busy(elements.syncBtn,importProject);
elements.lockBtn.onclick=busy(elements.lockBtn,toggleLock);
elements.refreshBtn.onclick=busy(elements.refreshBtn,reloadContributions);
elements.listBtn.onclick=()=>refreshLocal();
elements.projectPicker.onchange=()=>busy(elements.projectPicker,async()=>chooseProject(elements.projectPicker.value))();
const details=$('collabDetails');
details.addEventListener('toggle',()=>{
 if(details.open&&!ready)init().catch(e=>status(friendly(e),true));
});
const hash=new URLSearchParams(location.hash.slice(1));
if(hash.has('slam-invite')){
 details.open=true;
 elements.invite.value=hash.get('slam-invite');
 status('Invitación detectada. Escribí tu nombre y pulsá «Unirme y crear mi marcador».');
}

