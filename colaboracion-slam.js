/*
 * Estudio SLAM colaborativo — v1
 * Editor existente en IndexedDB + Supabase para aportes individuales.
 * Cada contribuyente usa identidad anónima, el organizador prepara el ZIP oficial.
 */
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
import {composeMarker,routeURL,makeQR} from './marker-composer.js?v=7';
import {STUDIO_CONFIG} from './studio-config.js?v=1';

const URL_SUPABASE=STUDIO_CONFIG.supabaseUrl;
const CLAVE_PUBLICA=STUDIO_CONFIG.supabasePublishableKey;
const BUCKET='slam-colaboraciones';
const $=id=>document.getElementById(id);
const panel=$('slamCollab');
if(!panel)throw new Error('Falta el panel de colaboración.');
const elements={
 status:$('collabStatus'), joinName:$('collabName'),projectName:$('collabProjectName'),
 projectDescription:$('collabProjectDescription'),
 invite:$('collabInvite'),newBtn:$('collabCreate'),joinBtn:$('collabJoin'),
 projectPicker:$('collabProjectPicker'),workspace:$('collabWorkspace'),
 projectHeading:$('collabHeading'),role:$('collabRole'),inviteTools:$('collabInviteTools'),
 projectStateBanner:$('collabProjectStateBanner'),
 localPicker:$('collabLocalPicker'),sendBtn:$('collabSend'),refreshBtn:$('collabRefresh'),
 entries:$('collabEntries'),syncBtn:$('collabSync'),lockBtn:$('collabLock'),
 copyBtn:$('collabCopy'),listBtn:$('collabRefreshLocal'),publishHelp:$('collabPublishHelp'),
  summary:$('collabSummary'),overview:$('collabOverview'),
  coordinatorBox:$('collabCoordinatorBox'),coordinatorLogin:$('collabCoordinatorLogin'),
  createFields:$('collabCreateFields'),participantBox:$('collabParticipantBox'),
  pickerBox:$('collabProjectSelector'),adminEmail:$('collabAdminEmail'),
  organizerEditorTools:$('collabOrganizerEditorTools'),
  editHeading:$('collabEditHeading'),editHint:$('collabEditHint'),
  duplicateNotice:$('collabDuplicateNotice'),duplicateRows:$('collabDuplicateRows'),
  ownerSaveBtn:$('collabOwnerSave'),legacyPublishBtn:$('collabLegacyPublish'),
  adminLogin:$('collabAdminSignIn'),adminSignOut:$('collabAdminSignOut'),
  deleteZone:$('collabDeleteZone'),deleteProjectBtn:$('collabDeleteProject'),
  publishBtn:$('collabPublishNow'),publishedState:$('collabPublishedState'),
  publishedResult:$('collabPublishedResult'),publishedQR:$('collabPublishedQR'),
  publishedURL:$('collabPublishedURL'),publishedOpen:$('collabPublishedOpen'),
  publishedCopy:$('collabPublishedCopy'),
  publishedAllMarkers:$('collabPublishedAllMarkers'),
  publishedMarkers:$('collabPublishedMarkers'),
  previewBtn:$('collabPreviewCreate'),printBtn:$('collabMarkerDownload'),
  previewResult:$('collabPreviewResult'),previewQR:$('collabPreviewQR'),
  previewUrlInput:$('collabPreviewUrl'),previewCopy:$('collabPreviewCopy'),
  previewOpen:$('collabPreviewOpen'),previewExpires:$('collabPreviewExpires')
};
let client=null,person=null,ready=false,active=null,role='',projects=[],contributions=[];
const invitation=new URLSearchParams(location.hash.slice(1)).get('slam-invite')||'';
const invited=!!invitation;
let verifiedCoordinator=false,joinedProjectId=null;
let currentPreviewUrl='',publishedManifest=null;
const modeIndividualBtn=$('modeIndividual'),modeCollectiveBtn=$('modeCollective');
const modeHelp=$('modeHelp');
let editorMode=invited?'collective':
  (localStorage.getItem('slam-editor-mode')==='collective'?'collective':'individual');
let modeChangePending=false;
const PUBLIC_BUCKET_URL=URL_SUPABASE+'/storage/v1/object/public/slam-publicaciones/';


/* Two workflows, one editor:
 * Individual = IndexedDB local sessions, no Supabase dependency.
 * Collective = one existing Supabase project, same route_id in IndexedDB
 * and in cloud for both coordinator and invited contributors.
 */
function renderEditorMode(){
 const collective=editorMode==='collective';
 const container=$('slamCollab');
 container.hidden=!collective;
 modeIndividualBtn.setAttribute('aria-pressed',String(!collective));
 modeCollectiveBtn.setAttribute('aria-pressed',String(collective));
 modeIndividualBtn.classList.toggle('is-active',!collective);
 modeCollectiveBtn.classList.toggle('is-active',collective);
 modeHelp.textContent=collective
   ? 'Colectivo: elegí o creá un proyecto en Supabase. Este mismo recorrido reúne tus marcadores y los de los invitados.'
   : 'Individual: creá y guardá recorridos en este navegador. La prueba AR funciona en este equipo; podés exportar ZIP para publicar en GitHub.';
 document.documentElement.classList.toggle('slam-individual-active',!collective);
 if(!collective){
   document.documentElement.classList.remove('slam-collective-active');
   $('localDraftExplanation').hidden=false;
 }else{
   $('localDraftExplanation').hidden=true;
 }
}
async function useEditorMode(next){
 if(invited)return;
 if(modeChangePending)return;
 if(next!=='individual'&&next!=='collective')return;
 // Clicking the already selected Individual tab must never replace an
 // unsaved independent draft with a different local session.
 if(next==='individual'&&editorMode==='individual')return;
 modeChangePending=true;
 modeIndividualBtn.disabled=true;modeCollectiveBtn.disabled=true;
 try{
   if(next==='collective'){
     // Do not require a coordinator login until the user actually chooses
     // a shared workspace. Existing local art remains intact meanwhile.
     editorMode='collective';
     localStorage.setItem('slam-editor-mode',editorMode);
     renderEditorMode();
     const details=$('collabDetails');
     details.open=true;
     await init();
     if(active?.member?.role==='owner')await connectCoordinatorWorkspace(active);
     if(verifiedCoordinator&&active)
       status('Recorrido «'+active.title+'» activo. Podés agregar tu propia obra o editar aportaciones recibidas.');
   }else{
     await window.SLAM_COLLAB_BRIDGE?.activateIndividual?.();
     editorMode='individual';
     localStorage.setItem('slam-editor-mode',editorMode);
     renderEditorMode();
   }
 }finally{
   modeChangePending=false;
   modeIndividualBtn.disabled=false;modeCollectiveBtn.disabled=false;
 }
}
async function connectCoordinatorWorkspace(project){
 if(invited||!verifiedCoordinator||project?.member?.role!=='owner')return;
 if(!window.SLAM_COLLAB_BRIDGE?.activateCoordinator){
   // ESM dependencies for the 3D editor can load after the collaboration
   // module. Wait for the real editor rather than binding a wrong draft.
   await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{
       window.removeEventListener('slam-bridge-ready',readyBridge);
       reject(Error('No se pudo cargar el editor 3D. Recargá la página.'));
     },20000);
     function readyBridge(){clearTimeout(timer);resolve();}
     window.addEventListener('slam-bridge-ready',readyBridge,{once:true});
     if(window.SLAM_COLLAB_BRIDGE?.activateCoordinator){
       window.removeEventListener('slam-bridge-ready',readyBridge);
       clearTimeout(timer);resolve();
     }
   });
 }
 await window.SLAM_COLLAB_BRIDGE.activateCoordinator(project);
 refreshLocal();
 updatePreviewAvailability();
}

function status(m,err=false){elements.status.textContent=m;elements.status.dataset.error=err?'true':'false';}
function checked(result){if(result.error)throw result.error;return result.data;}
function friendly(error){
 const s=String(error?.message||error||'Error desconocido');
 if(/row.level security policy|42501/i.test(s)){
   if(active?.state==='locked')
     return 'El recorrido está cerrado a nuevos aportes después de publicar. Pedile al coordinador que pulse «Reabrir aportaciones» y volvé a guardar.';
   return 'Supabase rechazó esta aportación por permisos. Verificá tu invitación y que el recorrido esté abierto. Actualizá las aportaciones e intentá de nuevo.';
 }
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
 const current=window.SLAM_COLLAB_BRIDGE?.selectedId?.();
 elements.localPicker.replaceChildren();
 for(const entry of localEntries()){
   const option=document.createElement('option');option.value=entry.id;
   option.textContent=entry.name+(entry.ready?' · listo':' · faltan archivos');
   elements.localPicker.add(option);
 }
 const available=id=>Array.from(elements.localPicker.options).some(opt=>opt.value===id);
 if(current&&available(current))elements.localPicker.value=current;
 else if(selected&&available(selected))elements.localPicker.value=selected;
 updatePreviewAvailability();
}

/* Database state is authoritative: if the organizer closes a published
 * collective while the invitation is open, check BEFORE uploading media.
 * That avoids confusing Storage / Postgres row-level security errors.
 */
function renderProjectState(){
 const banner=elements.projectStateBanner;
 if(!active){banner.hidden=true;return;}
 const locked=active.state!=='draft';
 banner.hidden=false;
 banner.dataset.state=locked?'closed':'open';
 banner.textContent=locked
  ? (role==='owner'
    ? 'Recorrido publicado: las aportaciones están cerradas. Pulsá «Reabrir aportaciones» para aceptar nuevos modelos o ajustes. La exposición publicada seguirá disponible.'
    : 'Este recorrido está publicado y cerrado a nuevas aportaciones. Para agregar o actualizar un modelo, pedile al coordinador que pulse «Reabrir aportaciones». Tus marcadores locales no se borraron.')
  : 'Recorrido abierto: podés agregar marcadores y guardar tus aportaciones en la nube. Los cambios aparecerán públicamente cuando el coordinador vuelva a publicar.';
}
async function refreshCurrentProjectState(){
 if(!active)return;
 const projectId=active.id;
 const record=checked(await client.from('slam_projects')
   .select('id,state').eq('id',projectId).maybeSingle());
 if(!record)throw Error('Ya no tenés acceso a este recorrido. Abrí de nuevo la invitación o consultá con coordinación.');
 if(active?.id!==projectId)return;
 const changed=active.state!==record.state;
 active.state=record.state;
 const cached=projects.find(p=>p.id===projectId);
 if(cached)cached.state=record.state;
 const option=Array.from(elements.projectPicker.options).find(o=>o.value===projectId);
 if(option && cached)option.textContent=projectOption(cached).textContent;
 if(role==='owner')elements.lockBtn.textContent=record.state==='locked'
   ? 'Reabrir aportaciones':'Cerrar aportaciones';
 renderProjectState();
 updatePreviewAvailability();
 renderDuplicateNotice();
 return changed;
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
 if(!STUDIO_CONFIG.supabaseConfigured)
   throw Error('Para usar Colectivo en tu propia copia, primero configurá studio-config.js con la URL y la clave pública de TU proyecto Supabase. El modo Individual funciona sin esa configuración.');
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
     refreshLocal();
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
 await useEditorMode('individual');
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
   .select('id,title,description,route_id,state,created_by').in('id',ids)):[];
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
 active=p;role=p.member.role;contributions=[];
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
 elements.deleteZone.hidden=role!=='owner'||!verifiedCoordinator;
 elements.organizerEditorTools.hidden=role!=='owner';
 elements.editHeading.textContent=role==='owner'?'Agregar o editar obras del colectivo':'Enviar mi obra';
 renderProjectState();
 if(editorMode==='collective'&&role==='owner')
   await connectCoordinatorWorkspace(p);
 refreshLocal();
 elements.previewResult.hidden=true;currentPreviewUrl='';
 await reloadContributions();
 await refreshPublishedInfo();
}
async function reloadContributions(){
 if(!active)return;
 await refreshCurrentProjectState();
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
 updatePreviewAvailability();
 renderDuplicateNotice();
 elements.publishBtn.disabled=contributions.length===0;
 const distinct=rowsGroupedBySource().size;
 const copied=contributions.length-distinct;
 status(distinct+' obra(s) compartida(s)'+(copied?' y '+copied+' copia(s) duplicada(s) para revisar':'')+
   '. '+(active.state==='locked'?'Aportaciones cerradas.':'Se pueden agregar o actualizar obras.'));
}

/* Preview links are capabilities tied to one saved slam_entries row.
 * The token is generated in the browser, but only its SHA-256 hash is stored.
 * A server-side Edge Function issues short-lived signed URLs to a single GLB
 * and its printable marker, keeping other artists' uploads private.
 */

/*
 * The old uploader allowed the same source_entry_id under a second user.
 * Prefer the invited artist's original entry and NEVER silently remove
 * a duplicate. Expose a deliberate organizer-only cleanup control.
 */
function rowsGroupedBySource(){
 const groups=new Map();
 for(const row of contributions){
   const group=groups.get(row.source_entry_id)||[];
   group.push(row);groups.set(row.source_entry_id,group);
 }
 return groups;
}
function originalEntryFromGroup(rows){
 if(rows.length===1)return rows[0];
 if(rows.length===2&&role==='owner'){
   const invited=rows.filter(r=>r.user_id!==person?.id);
   const owned=rows.filter(r=>r.user_id===person?.id);
   if(invited.length===1&&owned.length===1)return invited[0];
 }
 return null;
}
function canonicalContributions(){
 const result=[];
 for(const [sourceId,rows] of rowsGroupedBySource()){
   const original=originalEntryFromGroup(rows);
   if(!original)throw Error('Hay varias obras incompatibles con el mismo marcador «'+sourceId+'». Revisá las aportaciones.');
   result.push(original);
 }
 return result;
}
function duplicatePairs(){
 if(role!=='owner')return [];
 const pairs=[];
 for(const rows of rowsGroupedBySource().values()){
   if(rows.length!==2)continue;
   const original=rows.filter(r=>r.user_id!==person?.id);
   const copy=rows.filter(r=>r.user_id===person?.id);
   if(original.length===1&&copy.length===1)
     pairs.push({original:original[0],copy:copy[0]});
 }
 return pairs;
}
function hasDuplicateMarkers(){
 return Array.from(rowsGroupedBySource().values()).some(group=>group.length>1);
}
function renderDuplicateNotice(){
 const root=elements.duplicateRows;
 root.replaceChildren();
 const pairs=duplicatePairs();
 elements.duplicateNotice.hidden=role!=='owner'||pairs.length===0;
 for(const {original,copy} of pairs){
   const item=document.createElement('div');item.className='collab-duplicate-row';
   const label=document.createElement('span');
   label.textContent='«'+original.title+'» · original de '+original.author_label+
     ' + copia de coordinación';
   const button=document.createElement('button');
   button.type='button';button.className='secondary';
   button.textContent='Eliminar solo la copia';
   button.disabled=active?.state!=='draft';
   button.title=button.disabled
     ? 'Reabrí aportaciones antes de eliminar la copia'
     : 'Conservar el original del artista y eliminar exclusivamente la segunda fila';
   button.onclick=busy(button,()=>removeDuplicateCoordinatorCopy(original,copy));
   item.append(label,button);root.append(item);
 }
}
async function removeDuplicateCoordinatorCopy(original,copy){
 if(role!=='owner'||!verifiedCoordinator||active?.state!=='draft')
   throw Error('Solo coordinación puede retirar una copia con aportaciones abiertas.');
 const live=duplicatePairs().find(pair=>pair.original.id===original.id&&pair.copy.id===copy.id);
 if(!live)throw Error('La copia ya no coincide con el recorrido actual. Actualizá aportaciones.');
 const yes=confirm('¿Eliminar la copia duplicada de «'+original.title+'» creada por coordinación? '+
   'Se conservará INTACTA la obra original de «'+original.author_label+'». '+
   'Si habías hecho cambios en la copia, primero reproducilos en la obra original '+
   'usando «Guardar cambios en la nube». Esta acción no se puede deshacer.');
 if(!yes)return;
 checked(await client.from('slam_entries').delete()
   .eq('id',copy.id).eq('project_id',active.id)
   .eq('user_id',person.id).select('id').single());
 const paths=entryPaths(active.id,copy.user_id,copy.source_entry_id);
 let storageWarning='';
 try{
   checked(await client.storage.from(BUCKET).remove([
     paths.model,paths.art,paths.print,paths.patt
   ]));
 }catch(error){
   storageWarning=' La fila duplicada ya se retiró, aunque quedaron algunos archivos sin usar: '+friendly(error);
 }
 await reloadContributions();
 status('Se eliminó la copia creada por coordinación de «'+original.title+
   '». La aportación original de «'+original.author_label+
   '» permanece intacta. Volvé a publicar para retirar la copia del recorrido público.'+
   storageWarning);
}

function localWorkspaceMatches(){
 return !!(active && window.SLAM_COLLAB_BRIDGE?.sessionId?.()===active.route_id);
}
function cloudMatchesForSelection(){
 if(!active||!localWorkspaceMatches())return [];
 return contributions.filter(row=>row.source_entry_id===elements.localPicker.value);
}
function selectedSavedContribution(){
 if(!person)return null;
 const allowed=cloudMatchesForSelection().filter(row=>
   row.user_id===person.id || role==='owner'
 );
 return originalEntryFromGroup(allowed);
}
function updatePreviewAvailability(){
 const local=window.SLAM_COLLAB_BRIDGE?.get(elements.localPicker.value);
 const matching=cloudMatchesForSelection();
 const saved=selectedSavedContribution();
 const ready=!!(local?.modelBlob && local?.markerImageBlob && local?.markerValidation?.ok);
 const editable=active?.state==='draft';
 const coordinatorEditing=role==='owner'&&!!saved;
 const sameAuthor=!!saved&&saved.user_id===person?.id;
 elements.previewBtn.disabled=!saved;
 elements.printBtn.disabled=!saved;
 elements.ownerSaveBtn.hidden=!coordinatorEditing;
 elements.ownerSaveBtn.disabled=!coordinatorEditing||!ready||!editable;
 elements.sendBtn.hidden=coordinatorEditing;
 elements.sendBtn.disabled=coordinatorEditing||!ready||!editable||!localWorkspaceMatches()||
   matching.length>1||(matching.length===1&&!sameAuthor);
 const hint=elements.editHint;
 hint.dataset.warning='false';
 if(!active){hint.textContent='Elegí un recorrido compartido.';return;}
 if(!localWorkspaceMatches()){
   hint.textContent=role==='owner'
     ? 'El borrador todavía no está asociado a este colectivo. Volvé a seleccionar el recorrido en «Mis recorridos como coordinador» para conectarlo.'
     : 'Prepará tu aportación en el editor antes de enviarla.';
   hint.dataset.warning='true';
 }else if(matching.length>1&&!saved){
   hint.textContent='Se encontraron varias aportaciones incompatibles con el mismo identificador. Revisá las copias antes de seguir.';
   hint.dataset.warning='true';
 }else if(coordinatorEditing){
   const row=saved;
   hint.textContent='Obra original de «'+row.author_label+'». «Guardar cambios en la nube» actualizará ESTA MISMA aportación y conservará su autoría y su QR.';
   if(matching.length>1)hint.textContent+=' También hay una copia duplicada: revisala en «Copias duplicadas detectadas» antes de publicar.';
   if(!ready)hint.textContent+=' Primero cargá un GLB válido y una imagen de marcador validada.';
   if(!editable){hint.textContent+=' Reabrí las aportaciones antes de guardar.';hint.dataset.warning='true';}
 }else if(matching.length===1&&!sameAuthor){
   hint.textContent='Esta obra pertenece a otra persona. No podés sobreescribirla con tu cuenta de artista.';
   hint.dataset.warning='true';
 }else{
   hint.textContent=role==='owner'
     ? 'Marcador nuevo de coordinación: «Guardar esta obra en la nube» lo incorporará a las aportaciones del colectivo y habilitará la prueba AR individual.'
     : 'Esta obra se guarda con tu identidad. El guardado local no sincroniza automáticamente con la nube.';
   if(!editable){hint.textContent+=' El recorrido está cerrado; pedí a coordinación que lo reabra.';hint.dataset.warning='true';}
 }
}
function printableFilename(name){
 return (name||'marcador').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,55)||'marcador';
}
async function downloadPreviewMarker(){
 const row=selectedSavedContribution();
 if(!row)throw Error('Primero guardá este marcador en la nube.');
 status('Preparando el marcador imprimible…');
 const blob=await getBlob(row.marker_print_path);
 const link=document.createElement('a'),object=URL.createObjectURL(blob);
 link.href=object;link.download=printableFilename(row.title)+'-15x15cm.png';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(object),12000);
 status('Descargaste el marcador de «'+row.title+'». Imprimilo a escala 100% y tamaño 15 × 15 cm, o mostralo en otra pantalla.');
}

/* Prevent testing stale Supabase data when the editor contains newer
 * local transformations. An individual AR preview ALWAYS reads cloud rows,
 * never the draft saved with "Guardar recorrido".
 */
function localCloudDifference(local,stored){
 if(!local||!stored)return null;
 if(String(local.animation||'none')!==String(stored.animation||'none'))
   return 'La animación local («'+String(local.animation||'none')+
     '») no coincide con la guardada en la nube («'+String(stored.animation||'none')+'»).';
 if(String(local.name||'')!==String(stored.title||''))
   return 'El nombre del marcador todavía es distinto de la versión en la nube.';
 if(String(local.description||'').slice(0,500)!==String(stored.description||''))
   return 'La descripción local todavía es distinta de la versión en la nube.';
 const pairs=[
   ['posición X',local.x,stored.x_cm],['posición Y',local.y,stored.y_cm],
   ['posición Z',local.z,stored.z_cm],['tamaño',local.size,stored.size_cm],
   ['rotación horizontal',local.rotation,stored.rotation_deg],
   ['rotación vertical',local.rotationVertical||0,stored.rotation_vertical_deg]
 ];
 for(const [label,l,r] of pairs){
   if(Math.abs(Number(l||0)-Number(r||0))>0.001)
     return 'El ajuste local de '+label+' es diferente del guardado en la nube.';
 }
 return null;
}
function ensurePreviewSynced(row){
 const e=window.SLAM_COLLAB_BRIDGE?.get(elements.localPicker.value);
 const difference=localCloudDifference(e,row);
 if(!difference)return;
 const nextStep=active?.state==='locked'
   ? 'Primero pulsá «Reabrir aportaciones» en Colaboración.'
   : '';
 throw Error(difference+' '+nextStep+
   ' Después pulsá «Guardar recorrido» y «Guardar esta obra en la nube». '+
   'Por último, generá de nuevo el enlace de prueba AR.');
}

async function createIndividualPreview(){
 await reloadContributions();
 const row=selectedSavedContribution();
 if(!row)throw Error('Guardá primero la obra seleccionada en la nube.');
 ensurePreviewSynced(row);
 const token=randomToken();
 status('Preparando un enlace temporal solo para «'+row.title+'»…');
 const expiration=checked(await client.rpc('slam_create_preview_link',{
   p_entry_id:row.id,p_token:token
 }));
 const url=new URL('./recorrido.html',location.href);
 url.searchParams.set('id',active.route_id);
 url.searchParams.set('prueba',token);
 const qr=await makeQR(url.href,210);
 const ctx=elements.previewQR.getContext('2d');
 ctx.clearRect(0,0,elements.previewQR.width,elements.previewQR.height);
 ctx.drawImage(qr,0,0,elements.previewQR.width,elements.previewQR.height);
 currentPreviewUrl=url.href;
 elements.previewUrlInput.value=currentPreviewUrl;
 elements.previewResult.hidden=false;
 elements.previewExpires.textContent='Prueba válida hasta el '+
   new Date(expiration).toLocaleString('es-AR',{dateStyle:'long',timeStyle:'short'})+
   '. Si generás otro enlace de esta obra, el anterior queda invalidado.';
 status('Enlace AR creado para «'+row.title+'». Escaneá el QR con el celular o copiá el enlace; apuntá la cámara al marcador descargado.');
}
async function copyIndividualPreview(){
 if(!currentPreviewUrl)throw Error('Generá primero un enlace de prueba.');
 await navigator.clipboard.writeText(currentPreviewUrl);
 status('Enlace de prueba copiado. Abrilo desde el celular para usar la cámara.');
}
function openIndividualPreview(){
 if(!currentPreviewUrl)throw Error('Generá primero un enlace de prueba.');
 window.open(currentPreviewUrl,'_blank','noopener');
 status('Se abrió la vista previa AR. Autorizá la cámara y apuntá al marcador.');
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
 await refreshCurrentProjectState();
 if(!active||active.state!=='draft')
   throw Error('Este recorrido está cerrado después de su publicación. Pedile al coordinador que pulse «Reabrir aportaciones»; después podrás guardar este modelo sin volver a crearlo.');
 if(!localWorkspaceMatches())throw Error('El editor local no corresponde al recorrido elegido. Cargá el recorrido correcto antes de guardar.');
 const e=window.SLAM_COLLAB_BRIDGE?.get(elements.localPicker.value);
 if(!e)throw Error('Seleccioná un marcador del editor.');
 const matching=cloudMatchesForSelection();
 if(matching.length>1)throw Error('Hay varias aportaciones con este identificador. No crearé otra copia.');
 if(matching.some(row=>row.user_id!==person.id))
   throw Error('Esta obra pertenece a un invitado. Usá «Guardar cambios en la nube» como coordinador para evitar duplicarla.');
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

/*
 * Coordinator revisions deliberately UPDATE an existing slam_entries row.
 * The media stay at project/original-author/original-entry (not in a new
 * coordinator-owned folder). All attribution and route identifiers stay
 * unchanged. Supabase RLS allows only the coordinator to overwrite this
 * member's media while the project is open.
 */
async function saveExistingContributionAsCoordinator(){
 await refreshCurrentProjectState();
 if(!active || role!=='owner'||!verifiedCoordinator)
   throw Error('Solo coordinación puede editar las aportaciones de invitados.');
 if(active.state!=='draft')
   throw Error('Primero pulsá «Reabrir aportaciones» en este recorrido publicado.');
 if(!localWorkspaceMatches())
   throw Error('Primero cargá el recorrido compartido en el editor.');
 const e=window.SLAM_COLLAB_BRIDGE?.get(elements.localPicker.value);
 if(!e)throw Error('Elegí un marcador para actualizar.');
 const original=selectedSavedContribution();
 if(!original)throw Error('No se identificó una única obra original para actualizar. No se creó ninguna copia.');
 if(original.project_id!==active.id || original.source_entry_id!==e.id)
   throw Error('No coincide la identidad original del marcador.');
 if(!e.modelBlob||!e.markerImageBlob||!e.markerValidation?.ok)
   throw Error('Este marcador necesita un GLB y una imagen de reconocimiento validada.');
 if(!/^id-[a-z0-9-]{8,60}$/i.test(e.id))
   throw Error('Identificador de marcador inválido.');
 fileSizeOk(e.modelBlob,'Modelo GLB');
 const head=new Uint8Array(await e.modelBlob.slice(0,4).arrayBuffer());
 if(String.fromCharCode(...head)!=='glTF')
   throw Error('El archivo seleccionado no es un GLB válido.');

 // Keep the author's exact original bucket paths. The DB attribution guard
 // prevents rewriting user_id, project_id or source_entry_id.
 const originalPath=entryPaths(original.project_id,original.user_id,original.source_entry_id);
 if(original.model_path!==originalPath.model ||
    original.marker_image_path!==originalPath.art ||
    original.marker_print_path!==originalPath.print ||
    original.patt_path!==originalPath.patt)
   throw Error('Las rutas originales de esta obra no coinciden. No se modificó nada.');

 status('Actualizando «'+original.title+'» y conservando la autoría de «'+original.author_label+'»…');
 const {finalBlob,pattern}=await composeMarker({
   imageBlob:e.markerImageBlob,sessionId:active.route_id
 });
 const art=await toPng(e.markerImageBlob);
 const patt=new Blob([pattern],{type:'text/plain'});

 // Upload the changed files without creating an extra row or new identity.
 await upload(originalPath.model,e.modelBlob,'model/gltf-binary');
 await upload(originalPath.art,art,'image/png');
 await upload(originalPath.print,finalBlob,'image/png');
 await upload(originalPath.patt,patt,'text/plain');

 const changed={
   title:(e.name||'Marcador').slice(0,100),
   description:String(e.description||'').slice(0,500),
   x_cm:e.x||0,y_cm:e.y||0,z_cm:e.z||0,size_cm:e.size||12,
   rotation_deg:e.rotation||0,rotation_vertical_deg:e.rotationVertical||0,
   animation:e.animation||'none',updated_at:new Date().toISOString()
 };
 const saved=checked(await client.from('slam_entries')
   .update(changed).eq('id',original.id).eq('project_id',active.id)
   .select('id,user_id,source_entry_id,author_label').single());
 if(saved.user_id!==original.user_id ||
    saved.source_entry_id!==original.source_entry_id)
   throw Error('La identidad de la obra cambió inesperadamente; revisá los permisos.');
 await reloadContributions();
 status('Cambios de «'+e.name+'» guardados en la nube sin duplicar el marcador. Autor original: '+
   original.author_label+'. La prueba AR ya puede cargar la versión corregida. Para actualizar el recorrido público, pulsá «Publicar recorrido».');
}

async function getBlob(path){
 const data=checked(await client.storage.from(BUCKET).download(path));
 if(!(data instanceof Blob))throw Error('No se pudo obtener '+path);
 return data;
}
async function importProject(){
 if(role!=='owner')throw Error('Solo el organizador puede reunir el recorrido.');
 await connectCoordinatorWorkspace(active);
 if(!contributions.length){
   status('Este recorrido colectivo todavía no tiene obras en la nube. Ya está conectado al editor: creá tu marcador con «+ Agregar marcador», guardá el borrador y pulsá «Guardar esta obra en la nube».');
   window.scrollTo({top:0,behavior:'smooth'});
   return;
 }
 const local=window.SLAM_COLLAB_BRIDGE;
 const unsynced=(local?.sessionId?.()===active.route_id?local?.list?.()||[]:[])
   .filter(e=>e.ready&&!contributions.some(row=>row.source_entry_id===e.id));
 if(unsynced.length)
   throw Error('Antes de cargar obras recibidas, guardá tus marcadores locales ('+
     unsynced.map(e=>e.name).join(', ')+
     ') en la nube para no reemplazarlos. Usá «Guardar esta obra en la nube».');
 const canonical=canonicalContributions();
 if(!window.SLAM_COLLAB_BRIDGE?.importAll)throw Error('El editor no está listo.');
 if(!confirm('¿Importar '+canonical.length+' obras originales al editor? '+
   (hasDuplicateMarkers()?'Se excluirán las copias duplicadas creadas desde coordinación. ':'')+
   'Se reemplazará el borrador local del recorrido seleccionado. Tus demás recorridos locales permanecerán intactos.'))return;
 status('Recuperando obras originales y comprobando sus marcadores…');
 const files=[];
 for(const row of canonical){
   const [model,image,print,patt]=await Promise.all([
     getBlob(row.model_path),getBlob(row.marker_image_path),
     getBlob(row.marker_print_path),getBlob(row.patt_path)
   ]);
   files.push({row,model,image,print,pattText:await patt.text()});
 }
 await window.SLAM_COLLAB_BRIDGE.importAll(active,files);
 refreshLocal();
 status('Cargadas '+files.length+' obras en el editor. Elegí la que querés modificar y pulsá «Guardar cambios en la nube» cuando termines. No se crearán copias.');
 window.scrollTo({top:0,behavior:'smooth'});
}
async function createProject(){
 const title=elements.projectName.value.trim();
 const description=elements.projectDescription.value.trim();
 if(!verifiedCoordinator||invited)throw Error('Solo el coordinador verificado puede crear recorridos.');
 if(!title)throw Error('Escribí el título del recorrido compartido.');
 if(description.length>500)throw Error('La descripción puede tener hasta 500 caracteres.');
 const token=randomToken(),routeId=newRouteId();
 const id=checked(await client.rpc('slam_create_project',{p_title:title,p_route_id:routeId,p_invite_token:token}));
 localStorage.setItem('slam-colab-invite-'+id,token);
 let descriptionWarning='';
 if(description){
   const saved=await client.from('slam_projects').update({description})
     .eq('id',id).eq('created_by',person.id).select('id').single();
   if(saved.error)descriptionWarning=' La descripción no pudo guardarse: '+friendly(saved.error);
 }
 elements.projectName.value='';elements.projectDescription.value='';
 await refreshProjects();await chooseProject(id);
 status('Recorrido colectivo creado. Copiá el enlace de invitación para los artistas.'+descriptionWarning);
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
 refreshLocal();
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

/* Organizador: una copia pública y versionada de las aportaciones cloud.
 * El backend verifica identidad y publica el manifiesto SOLO cuando
 * todos los GLB y PNG están copiados en el bucket público.
 */
function publishedTourURL(){
 if(!active)throw Error('Elegí un recorrido.');
 return routeURL(active.route_id);
}
function publicFileURL(path){
 if(!active || !/^v[a-z0-9-]{8,48}\/imprimir\/[a-z0-9_.-]+$/.test(path)||
    path.includes('..'))throw Error('Ruta de impresión no válida.');
 return PUBLIC_BUCKET_URL+active.route_id+'/'+path;
}
async function renderPublished(manifest){
 if(!active||manifest.id!==active.route_id||
    manifest.format!=='estudio-slam-cloud-v1'||
    !Array.isArray(manifest.items)||!manifest.items.length)
      throw Error('Publicación no válida.');
 publishedManifest=manifest;
 const url=publishedTourURL();
 elements.publishedURL.value=url;
 elements.publishedResult.hidden=false;
 elements.publishedState.textContent='Publicado el '+
   new Date(manifest.publishedAt).toLocaleString('es-AR',{dateStyle:'long',timeStyle:'short'})+
   ' · '+manifest.items.length+' obra(s) disponibles para visitantes.';
 const qr=await makeQR(url,210),canvas=elements.publishedQR;
 const ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(qr,0,0,canvas.width,canvas.height);
 elements.publishedMarkers.replaceChildren();
 for(const [i,item] of manifest.items.entries()){
   const row=document.createElement('div');
   row.className='collab-published-entry';
   const title=document.createElement('span');
   title.textContent=(i+1)+'. '+String(item.title||'Marcador');
   const button=document.createElement('button');
   button.className='secondary';button.type='button';
   button.textContent='Descargar PNG · 15 cm';
   button.onclick=busy(button,()=>downloadPublishedMarker(item,i));
   row.append(title,button);elements.publishedMarkers.append(row);
 }
}
async function refreshPublishedInfo(){
 publishedManifest=null;
 elements.publishedResult.hidden=true;
 elements.publishedState.textContent='Todavía no está publicado automáticamente.';
 if(role!=='owner'||!active)return;
 try{
   const url=PUBLIC_BUCKET_URL+active.route_id+'/manifest.json?v='+Date.now();
   const resp=await fetch(url,{cache:'no-store',referrerPolicy:'no-referrer'});
   if(resp.status===404)return;
   if(!resp.ok)throw Error('HTTP '+resp.status);
   await renderPublished(await resp.json());
 }catch(e){
   console.warn('No se pudo consultar la publicación:',e);
   elements.publishedState.textContent='No se pudo comprobar la publicación; actualizá el panel.';
 }
}
async function publishNow(){
 if(role!=='owner'||!verifiedCoordinator)
   throw Error('Solo coordinación puede publicar.');
 await reloadContributions();
 if(!contributions.length)throw Error('No hay obras guardadas en la nube.');
 if(hasDuplicateMarkers())
   throw Error('Hay copias duplicadas en el recorrido. Revisá «Copias duplicadas detectadas» y retiralas antes de volver a publicar, para que no haya dos objetos con el mismo marcador.');
 if(!confirm('¿Publicar '+contributions.length+' obra(s) del recorrido «'+active.title+
   '»? Se harán públicas las versiones guardadas en la nube, se cerrarán las aportaciones y podrás reabrirlas para corregir y volver a publicar.'))return;
 status('Publicando '+contributions.length+' obras… Se conservará el mismo enlace QR.');
 elements.publishBtn.textContent='Publicando recorrido…';
 try{
   const session=checked(await client.auth.getSession())?.session;
   if(!session?.access_token)throw Error('Ingresá nuevamente con tu correo de coordinación.');
   const resp=await fetch(URL_SUPABASE+'/functions/v1/slam-publicar',{
     method:'POST',cache:'no-store',referrerPolicy:'no-referrer',
     headers:{
       'Content-Type':'application/json',apikey:CLAVE_PUBLICA,
       Authorization:'Bearer '+session.access_token
     },
     body:JSON.stringify({projectId:active.id})
   });
   const data=await resp.json().catch(()=>null);
   if(!resp.ok||!data?.ok)throw Error(data?.error||'Error al publicar; intentá nuevamente.');
   await refreshProjects();
   if(!active||active.route_id!==data.routeId)
     throw Error('Se publicó, pero no se pudo actualizar la vista del recorrido.');
   await renderPublished(data.manifest);
   status('Recorrido publicado: '+data.count+' obras. El enlace y todos los QR están activos. Descargá los marcadores PNG e imprimilos a 15 × 15 cm.');
 }finally{elements.publishBtn.textContent='Publicar recorrido';}
}
function downloadFileBlob(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),18000);
}
async function fetchPublishedMarker(item){
 const r=await fetch(publicFileURL(item.print),{
   cache:'force-cache',referrerPolicy:'no-referrer'
 });
 if(!r.ok)throw Error('No se pudo obtener el marcador «'+item.title+'».');
 return r.blob();
}
async function downloadPublishedMarker(item,i){
 status('Descargando marcador de «'+item.title+'»…');
 downloadFileBlob(await fetchPublishedMarker(item),
   'marcador-'+String(i+1).padStart(2,'0')+'-'+printableFilename(item.title)+'-15x15cm.png');
 status('Marcador descargado. Imprimilo a 15 × 15 cm, tamaño real, escala 100%.');
}
async function downloadAllPublishedMarkers(){
 if(!publishedManifest)throw Error('Primero publicá el recorrido.');
 if(typeof JSZip==='undefined')throw Error('No se cargó el generador ZIP.');
 status('Preparando '+publishedManifest.items.length+' marcadores para imprimir…');
 const zip=new JSZip();
 for(const [i,item] of publishedManifest.items.entries()){
   zip.file('marcador-'+String(i+1).padStart(2,'0')+'-'+printableFilename(item.title)+'-15x15cm.png',
     await fetchPublishedMarker(item));
 }
 zip.file('LEEME-IMPRESION.txt',
   'ESTUDIO SLAM - MARCADORES DEFINITIVOS\n'+
   'Recorrido: '+active.title+'\nURL: '+publishedTourURL()+'\n\n'+
   'Imprimir cada PNG a 15 x 15 cm, escala 100 %, sin ajustar a página.\n'+
   'El QR incluido en cada marcador abre el mismo recorrido publicado.\n');
 downloadFileBlob(await zip.generateAsync({type:'blob',compression:'STORE'}),
   'marcadores-'+printableFilename(active.title)+'.zip');
 status('ZIP con '+publishedManifest.items.length+' marcadores listo para imprimir.');
}
async function copyPublishedURL(){
 if(!publishedManifest)throw Error('Todavía no está publicado.');
 await navigator.clipboard.writeText(publishedTourURL());
 status('Enlace público copiado. Ya podés compartirlo con visitantes.');
}
function openPublishedTour(){
 if(!publishedManifest)throw Error('Todavía no está publicado.');
 window.open(publishedTourURL(),'_blank','noopener');
 status('Se abrió el recorrido público en otra pestaña.');
}

async function toggleLock(){
 if(role!=='owner')return;
 const next=active.state==='locked'?'draft':'locked';
 checked(await client.from('slam_projects').update({state:next}).eq('id',active.id).select('id').single());
 await refreshProjects();await chooseProject(active.id);
 status(next==='locked'?'Aportaciones cerradas. Ya podés preparar la publicación.':'Aportaciones reabiertas.');
}

/*
 * Deleting a collective is unrelated to "Eliminar borrador" (IndexedDB).
 * A dedicated backend verifies the JWT and creator, then deletes
 * both private/public Supabase Storage trees and the cascade DB records.
 * A typed title and an additional confirmation avoid accidental deletion.
 */
async function deleteCollectiveProject(){
 if(invited||role!=='owner'||!verifiedCoordinator||!active)
   throw Error('Solo la persona coordinadora puede eliminar un recorrido colectivo.');
 const target={id:active.id,title:active.title,routeId:active.route_id};
 const typed=prompt('ELIMINAR RECORRIDO COLECTIVO\n\n'+
   'Se borrarán las obras, las invitaciones, los archivos privados y la publicación pública. Sus QR dejarán de funcionar.\n\n'+
   'Para continuar, escribí el nombre exacto:\n'+target.title);
 if(typed===null)return;
 if(typed!==target.title)
   throw Error('El nombre no coincide. No se eliminó nada. Escribí exactamente «'+target.title+'».');
 if(!confirm('Última confirmación:\n\n¿Eliminar DEFINITIVAMENTE «'+target.title+
   '» y todas sus obras y archivos de Supabase?\n\nLa acción no se puede deshacer.'))return;
 const access=checked(await client.auth.getSession())?.session?.access_token;
 if(!access)throw Error('Ingresá nuevamente con el correo verificado de coordinación.');
 status('Eliminando el recorrido colectivo «'+target.title+'»…');
 const response=await fetch(URL_SUPABASE+'/functions/v1/slam-borrar-recorrido',{
   method:'POST',cache:'no-store',referrerPolicy:'no-referrer',
   headers:{
     'Content-Type':'application/json',
     apikey:CLAVE_PUBLICA,
     Authorization:'Bearer '+access
   },
   body:JSON.stringify({projectId:target.id,confirmTitle:typed})
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.ok||
    result.deletedProjectId!==target.id||
    result.deletedRouteId!==target.routeId)
   throw Error(result?.error||'No se pudo completar la eliminación del recorrido.');
 // Only after successful server deletion do we erase local state.
 // Saved drafts in other people's browsers cannot be erased remotely.
 localStorage.removeItem('slam-colab-invite-'+target.id);
 let localWarning='';
 try{
   await window.SLAM_COLLAB_BRIDGE?.removeLocalCopy?.(target.routeId);
 }catch(error){
   localWarning=' No se pudo borrar el borrador de este navegador: '+friendly(error)+'.';
 }
 active=null;role='';contributions=[];publishedManifest=null;currentPreviewUrl='';
 elements.workspace.hidden=true;
 elements.deleteZone.hidden=true;
 elements.publishedResult.hidden=true;
 await refreshProjects();
 status('Recorrido «'+target.title+'» eliminado de Supabase, incluidas sus obras, invitaciones y archivos publicados. Los otros recorridos permanecen disponibles.'+localWarning);
}

function busy(btn,fn){
 return async()=>{
  if(btn.disabled)return;
  btn.disabled=true;
  try{await init();await fn();}
  catch(e){
    console.error('[Estudio SLAM colaborativo]',e);
    if(/row.level security policy|42501/i.test(String(e?.message||e))){
      try{await refreshCurrentProjectState();}catch{}
    }
    status(friendly(e),true);
  }
  finally{
    btn.disabled=false;
    if(btn===elements.sendBtn||btn===elements.ownerSaveBtn)updatePreviewAvailability();
  }
 };
}
modeIndividualBtn.onclick=async()=>{
 try{await useEditorMode('individual');}
 catch(e){console.error('[Estudio SLAM modo individual]',e);status(friendly(e),true);}
};
modeCollectiveBtn.onclick=async()=>{
 try{await useEditorMode('collective');}
 catch(e){console.error('[Estudio SLAM modo colectivo]',e);status(friendly(e),true);}
};
elements.newBtn.onclick=busy(elements.newBtn,createProject);
elements.deleteProjectBtn.onclick=busy(elements.deleteProjectBtn,deleteCollectiveProject);
elements.adminLogin.onclick=busy(elements.adminLogin,requestCoordinatorEmail);
elements.adminSignOut.onclick=busy(elements.adminSignOut,coordinatorSignOut);
elements.joinBtn.onclick=busy(elements.joinBtn,joinProject);
elements.sendBtn.onclick=busy(elements.sendBtn,submitContribution);
elements.ownerSaveBtn.onclick=busy(elements.ownerSaveBtn,saveExistingContributionAsCoordinator);
elements.legacyPublishBtn.onclick=()=>document.getElementById('preparePublish')?.click();
elements.copyBtn.onclick=busy(elements.copyBtn,copyInvite);
elements.syncBtn.onclick=busy(elements.syncBtn,importProject);
elements.publishBtn.onclick=busy(elements.publishBtn,publishNow);
elements.publishedAllMarkers.onclick=busy(elements.publishedAllMarkers,downloadAllPublishedMarkers);
elements.publishedCopy.onclick=busy(elements.publishedCopy,copyPublishedURL);
elements.publishedOpen.onclick=busy(elements.publishedOpen,openPublishedTour);
elements.lockBtn.onclick=busy(elements.lockBtn,toggleLock);
elements.refreshBtn.onclick=busy(elements.refreshBtn,reloadContributions);
elements.listBtn.onclick=()=>refreshLocal();
elements.previewBtn.onclick=busy(elements.previewBtn,createIndividualPreview);
elements.printBtn.onclick=busy(elements.printBtn,downloadPreviewMarker);
elements.previewCopy.onclick=busy(elements.previewCopy,copyIndividualPreview);
elements.previewOpen.onclick=busy(elements.previewOpen,openIndividualPreview);
elements.localPicker.addEventListener('change',()=>{
  currentPreviewUrl='';elements.previewResult.hidden=true;
  window.SLAM_COLLAB_BRIDGE?.selectEntry?.(elements.localPicker.value);
  updatePreviewAvailability();
});
window.addEventListener('slam-draft-saved',()=>{
 if(editorMode==='collective'&&active)refreshLocal();
});
window.addEventListener('slam-entry-selected',event=>{
  const selected=event.detail?.id;
  if(!selected)return;
  if(!Array.from(elements.localPicker.options).some(o=>o.value===selected))
    refreshLocal();
  if(Array.from(elements.localPicker.options).some(o=>o.value===selected))
    elements.localPicker.value=selected;
  currentPreviewUrl='';elements.previewResult.hidden=true;
  updatePreviewAvailability();
});
elements.projectPicker.onchange=()=>busy(elements.projectPicker,async()=>chooseProject(elements.projectPicker.value))();
function syncOnReturn(){
 if(!ready||!active)return;
 refreshCurrentProjectState().catch(e=>console.warn('[Estudio SLAM estado]',e?.message||e));
}
window.addEventListener('focus',syncOnReturn);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncOnReturn();});
const details=$('collabDetails');
details.addEventListener('toggle',()=>{
 if(details.open&&!ready&&!modeChangePending)
   init().catch(e=>status(friendly(e),true));
});
if(invited){
 $('editorModeStrip').hidden=true;
}else if(editorMode==='collective'){
 details.open=true;
}
renderEditorMode();
const hash=new URLSearchParams(location.hash.slice(1));
if(hash.has('slam-invite')){
 details.open=true;
 elements.invite.value=hash.get('slam-invite');
 status('Invitación detectada. Escribí tu nombre y pulsá «Unirme y crear mi marcador».');
}

