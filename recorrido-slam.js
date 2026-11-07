/*
 * Visor de recorridos múltiples 8th Wall + SLAM
 * Cada imagen es reconocida por un PLANAR image target único.
 * El objeto se mantiene en coordenadas del mundo cuando el target sale
 * del encuadre y se corrige suavemente al reenfocarlo.
 */
import {buildTarget} from './image-targets.js';
const $=id=>document.getElementById(id);
const scene=$('scene'),instructions=$('instruction'),message=$('trackingMessage');
const diag=$('diagnostic'),info=$('specimenInfo'),infoTitle=$('infoTitle');
const infoText=$('infoText'),infoAccessible=$('accessibleText');
const infoToggle=$('infoToggle'),splash=$('splash'),fatalPanel=$('fatal');
const params=new URLSearchParams(location.search);
const requestedId=params.get('id')||'',preview=params.get('preview')==='1';
const startedAt=performance.now();
const ownedUrls=[],rows=[],rowByTarget=new Map();
const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const THREE=window.AFRAME?.THREE;
let manifestName='',configReady=false,engineStarted=false,xrReady=false;
let currentId=null,showAll=false,lastError='',lastFrame=0,typingFrame=0,typingState=null;
let descriptionId=null,descriptionCollapsed=false;
let scanStarted=false,markerFoundCount=0,lastStatusUpdate=0;
let source='sin cargar';
const log=[];
function say(m){message.textContent=m;}
function note(m){log.push(new Date().toLocaleTimeString()+' · '+m);if(log.length>18)log.shift();refreshDiagnostic();}
function fail(m){
  lastError=String(m?.message||m);
  $('fatalDetail').textContent=lastError;
  fatalPanel.hidden=false;splash.hidden=true;
  note('ERROR: '+lastError);
}
function statusTop(){
  if(!xrReady){instructions.hidden=false;instructions.textContent=configReady?'Activando cámara y seguimiento espacial…':'Cargando recorrido…';return;}
  instructions.hidden=currentId!==null;
  if(!currentId)instructions.textContent='Apuntá a cualquiera de los marcadores impresos del recorrido.';
}
function refreshDiagnostic(){
  if(diag.hidden)return;
  diag.textContent=[
    'Recorrido: '+(manifestName||'cargando')+' | '+requestedId,
    'Fuente: '+source,
    'Motor XR8: '+(window.XR8?'disponible':'cargando'),
    'Escena A-Frame: '+(scene.hasLoaded?'lista':'cargando'),
    'Seguimiento: '+(xrReady?'REALITY READY':'esperando'),
    'Imágenes: '+rows.length+' | buscando: '+(scanStarted?'sí':'no'),
    'Detectados al menos una vez: '+rows.filter(r=>r.seen).length,
    'Eventos de reconocimiento: '+markerFoundCount,
    'Activos en imagen: '+(rows.filter(r=>r.targetVisible).map(r=>r.title).join(', ')||'ninguno'),
    'En pantalla: '+(rows.filter(r=>r.root?.object3D.visible).map(r=>r.title).join(', ')||'ninguno'),
    'Visualización: '+(showAll?'Todos los reconocidos':'Último reconocido'),
    lastError?'Error: '+lastError:'',
    '--- Eventos ---',
    ...log
  ].filter(Boolean).join('\n');
}
function keepURL(u){ownedUrls.push(u);return u;}
function blobUrl(blob){return keepURL(URL.createObjectURL(blob));}
function isId(s){return /^id-[a-z0-9-]{8,60}$/i.test(s)}
function requireFile(path,folder){
  if(typeof path!=='string'||!path.startsWith(folder+'/')||path.includes('..')||path.includes('?')||path.includes('#')||!/^[a-z0-9/_\-.]+$/i.test(path))
    throw Error('Ruta de recurso inválida: '+String(path));
  return path;
}
async function storedSession(id){
  const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('estudio-slam-recorridos',1);
    req.onupgradeneeded=()=>reject(Error('Primero guardá un recorrido en Estudio SLAM.'));
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('No se pudo abrir la base local.'));
  });
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('sessions','readonly'),req=tx.objectStore('sessions').get(id);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });}finally{db.close()}
}
function cleanTransform(v){return Number.isFinite(Number(v))?Number(v):0}
function addRow(item,modelURL,targetData){
  const targetName=String(item.imageTargetName||item.target?.name||'');
  if(!/^[a-z0-9-]{3,75}$/i.test(targetName)||rowByTarget.has(targetName))
    throw Error('Identificador de marcador inválido o repetido.');
  const row={
    id:String(item.id),title:String(item.title||'Espécimen').slice(0,90),
    description:String(item.description||'').slice(0,500),
    imageTargetName:targetName,modelURL,
    xCm:cleanTransform(item.xCm),yCm:cleanTransform(item.yCm),zCm:cleanTransform(item.zCm),
    sizeCm:Math.max(1,Math.min(300,cleanTransform(item.sizeCm)||12)),
    rotationDeg:cleanTransform(item.rotationDeg),
    animation:['spin','float','pulse','embedded','none'].includes(item.animation)?item.animation:'none',
    targetData,seen:false,targetVisible:false,pose:null,lastTargetAt:0,loaded:false,
    root:null,pivot:null,model:null,mixer:null,loadError:'',recognitions:0
  };
  rowByTarget.set(targetName,row);rows.push(row);
  return row;
}
async function readPublished(){
  source='Publicado en GitHub Pages';
  const url=new URL('./recorridos/'+encodeURIComponent(requestedId)+'/manifest.json',location.href);
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('El recorrido todavía no está publicado (HTTP '+response.status+'). Prepará su ZIP en Estudio SLAM.');
  const data=await response.json();
  if(data.format!=='estudio-slam-public-v1'||data.id!==requestedId)
    throw Error('El manifiesto no tiene el formato de recorridos SLAM.');
  if(!Array.isArray(data.items)||!data.items.length||data.items.length>20)
    throw Error('El recorrido necesita de 1 a 20 marcadores.');
  manifestName=String(data.name||'Recorrido SLAM');
  for(const item of data.items){
    if(!item.target||item.target.type!=='PLANAR'||!item.target.properties)throw Error('Falta Image Target de '+item.title);
    const imagePath=requireFile(item.target.image,'targets');
    const modelPath=requireFile(item.model,'modelos');
    addRow(item,new URL(modelPath,url).href,{
      name:String(item.imageTargetName||item.target.name),
      type:'PLANAR',
      properties:item.target.properties,
      imagePath:new URL(imagePath,url).href,
      metadata:null
    });
  }
}
async function readLocal(){
  source='Borrador de Estudio SLAM (IndexedDB)';
  const saved=await storedSession(requestedId);
  if(!saved)throw Error('No se encontró el recorrido en este navegador. Para verlo en otro teléfono publicá el ZIP.');
  if(!Array.isArray(saved.entries)||!saved.entries.length||saved.entries.length>20)
    throw Error('El recorrido necesita entre 1 y 20 marcadores.');
  manifestName=String(saved.name||'Recorrido local');
  for(const [i,e] of saved.entries.entries()){
    if(!(e.finalMarkerBlob instanceof Blob)||!(e.modelBlob instanceof Blob))
      throw Error('Falta generar un marcador 15×15 cm o cargar un GLB: '+e.name);
    const targetName='slam-'+String(i+1).padStart(2,'0')+'-'+e.id;
    const target=await buildTarget(e.finalMarkerBlob,targetName);
    addRow({
      id:e.id,title:e.name,description:e.description,
      imageTargetName:targetName,xCm:e.x,yCm:e.y,zCm:e.z,
      sizeCm:e.size,rotationDeg:e.rotation,animation:e.animation
    },blobUrl(e.modelBlob),{
      ...target.data,imagePath:blobUrl(target.blob)
    });
  }
}
function makeEntities(){
  for(const row of rows){
    const root=document.createElement('a-entity');
    root.id='anclaje-'+row.id;root.object3D.visible=false;
    const pivot=document.createElement('a-entity');
    const asset=document.createElement('a-entity');
    pivot.appendChild(asset);root.appendChild(pivot);scene.appendChild(root);
    row.root=root;row.pivot=pivot;row.model=asset;
    asset.addEventListener('model-loaded',event=>{
      try{
        const mesh=event.detail?.model||asset.getObject3D('mesh');
        if(!mesh)throw Error('GLB sin geometría');
        const bounds=new THREE.Box3().setFromObject(mesh);
        const dim=new THREE.Vector3(),center=new THREE.Vector3();
        bounds.getSize(dim);bounds.getCenter(center);
        const maxAxis=Math.max(dim.x,dim.y,dim.z);
        if(!(maxAxis>0)||!Number.isFinite(maxAxis))throw Error('GLB sin tamaño válido');
        const f=(row.sizeCm/100)/maxAxis;
        asset.object3D.scale.setScalar(f);
        asset.object3D.position.set(-center.x*f,-bounds.min.y*f,-center.z*f);
        row.loaded=true;row.loadError='';
        const clips=mesh.animations||[];
        if(row.animation==='embedded'&&clips.length){
          row.mixer=new THREE.AnimationMixer(mesh);
          for(const clip of clips)row.mixer.clipAction(clip).play();
        }
        syncVisibility();refreshDiagnostic();
      }catch(e){row.loadError=e.message;note('Modelo '+row.title+': '+e.message);}
    });
    asset.addEventListener('model-error',event=>{
      row.loadError='No se pudo cargar el GLB';note('GLB '+row.title+' · carga fallida');
      console.error('Modelo',row.title,event.detail);
    });
    asset.setAttribute('gltf-model',row.modelURL);
  }
}
function syncVisibility(){
  for(const row of rows){
    if(row.root)row.root.object3D.visible=Boolean(
      row.seen&&row.loaded&&(showAll||row.id===currentId)
    );
  }
  $('framing').hidden=rows.filter(r=>r.seen).length<2;
  $('framing').textContent=showAll?'Ver último':'Ver todo';
}
function yawFromTarget(rotation,fallback){
  if(!rotation)return fallback;
  const quat=new THREE.Quaternion(
    cleanTransform(rotation.x),cleanTransform(rotation.y),cleanTransform(rotation.z),
    Number.isFinite(Number(rotation.w))?Number(rotation.w):1
  );
  const dir=new THREE.Vector3(0,1,0).applyQuaternion(quat);dir.y=0;
  if(dir.lengthSq()<.001)return fallback;
  dir.normalize();
  return Math.atan2(dir.x,dir.z);
}
function poseFromEvent(d,row){
  if(!d?.position||!d?.rotation)return null;
  const xyz=d.position;
  if(![xyz.x,xyz.y,xyz.z].every(v=>Number.isFinite(Number(v))))return null;
  return {
    position:new THREE.Vector3(Number(xyz.x),Number(xyz.y),Number(xyz.z)),
    yaw:yawFromTarget(d.rotation,row.root?.object3D.rotation.y||0)
  };
}
function receiveTarget(event,first){
  const d=event.detail||{},row=rowByTarget.get(d.name);
  if(!row)return;
  const pose=poseFromEvent(d,row);if(!pose)return;
  const fresh=!row.targetVisible||!row.seen;
  row.targetVisible=true;row.lastTargetAt=performance.now();row.pose=pose;
  if(!row.seen){
    row.seen=true;
    row.root.object3D.position.copy(pose.position);
    row.root.object3D.rotation.y=pose.yaw;
    row.recognitions++;
    markerFoundCount++;
    note('Primera detección: '+row.title);
  }else if(first||fresh){
    row.recognitions++;
    markerFoundCount++;
    note('Marcador recuperado: '+row.title+' · corrigiendo posición');
  }
  // Cambiar el espécimen activo al reconocer una NUEVA imagen, no en cada
  // actualización de la anterior: evita parpadeos con targets simultáneos.
  if(first||fresh||currentId===null){
    currentId=row.id;
    selectDescription(row);
    syncVisibility();
  }
  splash.hidden=true;
  say('Marcador reconocido · SLAM mantiene el espécimen al alejarte.');
  statusTop();
}
function targetLost(event){
  const row=rowByTarget.get(event.detail?.name);
  if(!row)return;
  row.targetVisible=false;row.pose=null;
  note('Salió del encuadre: '+row.title+' · se conserva anclaje SLAM');
  say('Marcador fuera de cámara. Movete alrededor y volvé a enfocarlo para corregir su posición.');
}
function stopTyping(finish=false){
  if(typingFrame){cancelAnimationFrame(typingFrame);typingFrame=0;}
  const text=typingState?.text;typingState=null;infoText.classList.remove('typing');
  if(finish&&text!==undefined)infoText.textContent=text;
}
function writeText(text){
  stopTyping();
  infoText.textContent='';
  if(reducedMotion||!text){infoText.textContent=text;return;}
  const graphemes=(typeof Intl!=='undefined'&&typeof Intl.Segmenter==='function')
    ?Array.from(new Intl.Segmenter('es',{granularity:'grapheme'}).segment(text),e=>e.segment)
    :Array.from(text);
  const duration=Math.min(5400,Math.max(850,graphemes.length*22));
  const state={text,graphemes,shown:0,started:0,duration};typingState=state;
  infoText.classList.add('typing');
  const run=now=>{
    if(state!==typingState)return;
    if(!state.started)state.started=now;
    const next=Math.min(graphemes.length,Math.floor((now-state.started)/duration*graphemes.length));
    if(next>state.shown){infoText.textContent+=graphemes.slice(state.shown,next).join('');state.shown=next;}
    if(next<graphemes.length)typingFrame=requestAnimationFrame(run);
    else stopTyping(true);
  };
  typingFrame=requestAnimationFrame(run);
}
function selectDescription(row){
  if(!row.description.trim()){
    stopTyping();info.hidden=true;descriptionId=null;infoAccessible.textContent='';
    return;
  }
  if(descriptionId===row.id){info.hidden=false;return;}
  descriptionId=row.id;descriptionCollapsed=false;
  info.dataset.collapsed='false';infoToggle.textContent='Minimizar';
  infoToggle.setAttribute('aria-expanded','true');
  infoTitle.textContent=row.title;
  infoAccessible.textContent=row.title+'. '+row.description;
  info.hidden=false;info.classList.remove('entering');
  void info.offsetWidth;info.classList.add('entering');
  writeText(row.description);
}
function updateFrame(now){
  requestAnimationFrame(updateFrame);
  const dt=Math.min(.06,Math.max(0,(now-lastFrame)/1000||0));lastFrame=now;
  for(const row of rows){
    if(!row.root||!row.pivot)continue;
    if(row.targetVisible&&row.pose){
      // En la prueba híbrida esta corrección se comportó mejor que dejar
      // la pose totalmente libre. Se aplica por marcador, nunca globalmente.
      const alpha=1-Math.exp(-dt*8);
      row.root.object3D.position.lerp(row.pose.position,alpha);
      let delta=row.pose.yaw-row.root.object3D.rotation.y;
      delta=Math.atan2(Math.sin(delta),Math.cos(delta));
      row.root.object3D.rotation.y+=delta*alpha;
    }
    if(row.targetVisible&&now-row.lastTargetAt>1600){
      row.targetVisible=false;row.pose=null;
    }
    const t=now/1000,rot=(row.rotationDeg*Math.PI)/180;
    const pivot=row.pivot.object3D;
    pivot.position.set(row.xCm/100,row.yCm/100+(row.animation==='float'?.045*Math.sin(t*1.8):0),row.zCm/100);
    pivot.rotation.y=rot+(row.animation==='spin'?t*.6:0);
    pivot.scale.setScalar(row.animation==='pulse'?1+.12*Math.sin(t*2):1);
    if(row.mixer)row.mixer.update(dt);
  }
  if(now-lastStatusUpdate>900){lastStatusUpdate=now;refreshDiagnostic();}
}
function initEngine(){
  if(engineStarted||!configReady||!window.XR8||!window.AFRAME||!scene.hasLoaded)return;
  try{
    const af=window.XR8.AFrame||{};
    if(!AFRAME.components.xrconfig&&af.xrconfigComponent)AFRAME.registerComponent('xrconfig',af.xrconfigComponent());
    if(!AFRAME.components.xrweb&&af.xrwebComponent)AFRAME.registerComponent('xrweb',af.xrwebComponent());
    if(!AFRAME.components.xrconfig||!AFRAME.components.xrweb)return;
    engineStarted=true;
    XR8.XrController.configure({
      imageTargetData:rows.map(row=>row.targetData),
      disableWorldTracking:false,
      scale:'absolute'
    });
    note('Activando '+rows.length+' image targets 8th Wall con SLAM');
    scene.setAttribute('xrconfig','');
    scene.setAttribute('xrweb','allowedDevices: any');
    say('Autorizá la cámara. Apuntá a uno de los marcadores impresos.');
    splash.hidden=true;
  }catch(e){fail('No se pudo iniciar 8th Wall: '+e.message);}
}
$('framing').onclick=()=>{
  showAll=!showAll;syncVisibility();
  note(showAll?'Mostrando todos los anclajes':'Mostrando el último marcador reconocido');
};
$('fullscreen').onclick=async()=>{
  try{
    if(!document.fullscreenElement){await document.documentElement.requestFullscreen?.();}
    else await document.exitFullscreen?.();
  }catch(e){note('Pantalla completa no disponible: '+e.message);}
};
$('details').onclick=()=>{diag.hidden=!diag.hidden;refreshDiagnostic();};
$('retry').onclick=()=>location.reload();
infoToggle.onclick=()=>{
  descriptionCollapsed=!descriptionCollapsed;
  info.dataset.collapsed=descriptionCollapsed?'true':'false';
  infoToggle.textContent=descriptionCollapsed?'Mostrar texto':'Minimizar';
  infoToggle.setAttribute('aria-expanded',descriptionCollapsed?'false':'true');
  if(descriptionCollapsed)stopTyping(true);
};
window.addEventListener('error',e=>{lastError=String(e.message||e);diag.hidden=false;refreshDiagnostic();});
window.addEventListener('unhandledrejection',e=>{
  lastError='Promesa: '+String(e.reason?.message||e.reason);
  diag.hidden=false;refreshDiagnostic();
});
scene.addEventListener('xrimagefound',e=>receiveTarget(e,true));
scene.addEventListener('xrimageupdated',e=>receiveTarget(e,false));
scene.addEventListener('xrimagelost',targetLost);
scene.addEventListener('xrimagescanning',()=>{scanStarted=true;note('Escaneo de imágenes listo');});
scene.addEventListener('realityready',()=>{
  xrReady=true;splash.hidden=true;
  note('REALITY READY · SLAM funcionando');
  say('Apuntá a un marcador del recorrido para activar su obra.');
  statusTop();
});
scene.addEventListener('realityerror',e=>{
  lastError='Error SLAM: '+String(e.detail?.message||e.detail?.error||'no especificado');
  diag.hidden=false;refreshDiagnostic();
});
scene.addEventListener('loaded',initEngine);
window.addEventListener('xrloaded',()=>setTimeout(initEngine,0));
const poll=setInterval(()=>{
  initEngine();
  if(engineStarted||performance.now()-startedAt>60000)clearInterval(poll);
},450);
setTimeout(()=>{
  if(xrReady||!configReady)return;
  diag.hidden=false;note('El seguimiento todavía no comenzó. Revisá permisos y navegador.');
},18000);
window.addEventListener('pagehide',()=>{
  stopTyping();
  for(const u of ownedUrls)URL.revokeObjectURL(u);
});
requestAnimationFrame(updateFrame);
(async()=>{
  try{
    if(!isId(requestedId))throw Error('El enlace no contiene un identificador válido de recorrido.');
    if(!THREE)throw Error('A-Frame no pudo cargar. Comprobá la conexión.');
    if(preview)await readLocal();else await readPublished();
    configReady=true;document.title=manifestName+' · Recorrido SLAM';
    note('Recorrido cargado: '+rows.length+' marcadores');
    makeEntities();
    splash.hidden=true;
    instructions.textContent='Autorizá la cámara y buscá un marcador impreso.';
    initEngine();
  }catch(e){fail(e)}
})();
