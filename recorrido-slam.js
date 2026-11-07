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
let scanStarted=false,markerFoundCount=0,lastStatusUpdate=0,calibrationVisible=false;
const PHYSICAL_PRINT_CM=15;
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
    ...rows.filter(r=>r.seen).map(r=>{
      const physical=Number.isFinite(r.printSideWorld)?(r.printSideWorld*100).toFixed(1):'?';
      const targetWidth=Number.isFinite(r.detectedWidth)?r.detectedWidth.toFixed(4):'?';
      return r.title+': solicitado '+r.sizeCm+' cm; lado virtual '+physical+' cm; escala XR '+r.engineScale.toFixed(3)+'; ancho target '+targetWidth;
    }),
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
    root:null,axis:null,pivot:null,model:null,mixer:null,loadError:'',recognitions:0,
    markerLocalSide:.15,engineScale:1,detectedWidth:null,printSideWorld:null,
    baseBounds:null,baseMaxAxis:0,calibrationSquare:null,calibrationMaterial:null
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
    // XR8 entrega la orientación completa del plano XY del marcador.
    // La rotación de 90° en X convierte nuestros ejes del Estudio
    // (X a la derecha, Y encima del papel, Z a lo largo del suelo)
    // en ejes locales del image target (X, Y en el papel, Z normal).
    const root=document.createElement('a-entity');
    root.id='anclaje-'+row.id;root.object3D.visible=false;
    const axis=document.createElement('a-entity');
    axis.object3D.rotation.x=Math.PI/2;
    const pivot=document.createElement('a-entity');
    const asset=document.createElement('a-entity');
    pivot.appendChild(asset);axis.appendChild(pivot);root.appendChild(axis);
    scene.appendChild(root);
    row.root=root;row.axis=axis;row.pivot=pivot;row.model=asset;

    // Un cuadrado de 1×1 en coordenadas del papel, escalado al tamaño
    // físico del marcador (15 × 15 cm). Es una guía opcional de prueba.
    const geo=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-.5,-.5,.003),
      new THREE.Vector3(.5,-.5,.003),
      new THREE.Vector3(.5,.5,.003),
      new THREE.Vector3(-.5,.5,.003)
    ]);
    const mat=new THREE.LineBasicMaterial({color:0xffff00,depthTest:false,depthWrite:false});
    const square=new THREE.LineLoop(geo,mat);
    square.visible=false;square.renderOrder=1000;
    root.object3D.add(square);row.calibrationSquare=square;row.calibrationMaterial=mat;

    asset.addEventListener('model-loaded',event=>{
      try{
        const mesh=event.detail?.model||asset.getObject3D('mesh');
        if(!mesh)throw Error('GLB sin geometría');
        // ¡No medir el GLB con la rotación y la escala de la cámara
        // ni del marcador! THREE.Box3.setFromObject(mesh) incorporaba
        // los ancestros y podía devolver dimensiones/centro erróneos.
        // La copia con padre identidad preserva las transformaciones
        // internas del GLB, como hace la vista previa del Estudio.
        const copyRoot=new THREE.Group();
        const measure=mesh.clone(true);
        copyRoot.add(measure);copyRoot.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(measure);
        const dim=new THREE.Vector3();
        bounds.getSize(dim);
        const maxAxis=Math.max(dim.x,dim.y,dim.z);
        if(!(maxAxis>0)||!Number.isFinite(maxAxis))throw Error('GLB sin tamaño válido');
        row.baseBounds=bounds;row.baseMaxAxis=maxAxis;
        row.loaded=true;row.loadError='';
        updateModelScale(row);
        const clips=mesh.animations||[];
        if(row.animation==='embedded'&&clips.length){
          row.mixer=new THREE.AnimationMixer(mesh);
          for(const clip of clips)row.mixer.clipAction(clip).play();
        }
        note('GLB listo: '+row.title+' · tamaño '+row.sizeCm+' cm respecto al marcador de 15 cm');
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
function markerSideUnits(row,detail){
  // 8th Wall comunica el ancho del recorte 3:4 (no el del PNG cuadrado).
  // Reconstruimos el ancho del PNG de 15 cm a partir de la fracción recortada.
  // El ancho reportado está en unidades LOCALES del plano; el target event
  // comunica su escala mundial en detail.scale, por separado.
  const props=row.targetData?.properties||{};
  const ratio=Number(props.width)/Number(props.originalWidth);
  const measured=Number(detail.scaledWidth);
  if(Number.isFinite(measured)&&measured>0&&Number.isFinite(ratio)&&ratio>.01&&ratio<=1){
    row.detectedWidth=measured;
    return measured/ratio;
  }
  // Con scale:absolute, usar los 15 cm conocidos si una versión del motor
  // omite scaledWidth. El diagnóstico muestra esta situación.
  const scale=Number(detail.scale);
  const fallbackScale=Number.isFinite(scale)&&scale>0?scale:1;
  return row.markerLocalSide>0&&row.seen?row.markerLocalSide:(PHYSICAL_PRINT_CM/100)/fallbackScale;
}
function updateModelScale(row){
  if(!row.loaded||!row.baseBounds||!(row.baseMaxAxis>0)||!row.model)return;
  // Longitud en coordenadas del image target (ANTES de aplicar detail.scale).
  // Ejemplo: modelo 9,5 cm / impresión 15 cm = 63,3% del lado del papel.
  const targetSize=row.markerLocalSide*(row.sizeCm/PHYSICAL_PRINT_CM);
  const f=targetSize/row.baseMaxAxis;
  const bounds=row.baseBounds;
  row.model.object3D.scale.setScalar(f);
  row.model.object3D.position.set(
    -((bounds.min.x+bounds.max.x)/2)*f,
    -bounds.min.y*f,
    -((bounds.min.z+bounds.max.z)/2)*f
  );
}
function syncVisibility(){
  for(const row of rows){
    if(row.root)row.root.object3D.visible=Boolean(
      row.seen&&(row.loaded||calibrationVisible)&&(showAll||row.id===currentId)
    );
    if(row.calibrationSquare)row.calibrationSquare.visible=calibrationVisible;
  }
  $('framing').hidden=rows.filter(r=>r.seen).length<2;
  $('framing').textContent=showAll?'Ver último':'Ver todo';
}
function poseFromEvent(d,row){
  if(!d?.position||!d?.rotation)return null;
  const xyz=d.position,quat=d.rotation;
  if(![xyz.x,xyz.y,xyz.z,quat.x,quat.y,quat.z,quat.w].every(v=>Number.isFinite(Number(v))))return null;
  const rotation=new THREE.Quaternion(
    Number(quat.x),Number(quat.y),Number(quat.z),Number(quat.w)
  );
  if(rotation.lengthSq()<.0001)return null;
  rotation.normalize();
  const scale=Number(d.scale);
  const targetScale=Number.isFinite(scale)&&scale>0?scale:1;
  const side=markerSideUnits(row,d);
  if(!(side>0)||!Number.isFinite(side))return null;
  return {
    position:new THREE.Vector3(Number(xyz.x),Number(xyz.y),Number(xyz.z)),
    rotation,
    scale:targetScale,
    markerLocalSide:side
  };
}
function receiveTarget(event,first){
  const d=event.detail||{},row=rowByTarget.get(d.name);
  if(!row)return;
  const pose=poseFromEvent(d,row);if(!pose)return;
  const fresh=!row.targetVisible||!row.seen;
  row.targetVisible=true;row.lastTargetAt=performance.now();row.pose=pose;
  // Todas las transformaciones y el tamaño se basan en esta misma
  // referencia física, no en una posición arbitraria del celular.
  const previousSide=row.markerLocalSide;
  row.markerLocalSide=pose.markerLocalSide;
  row.engineScale=pose.scale;
  row.printSideWorld=pose.markerLocalSide*pose.scale;
  if(row.calibrationSquare)row.calibrationSquare.scale.setScalar(row.markerLocalSide);
  if(Math.abs(previousSide-row.markerLocalSide)>1e-5)updateModelScale(row);
  if(!row.seen){
    row.seen=true;
    row.root.object3D.position.copy(pose.position);
    row.root.object3D.quaternion.copy(pose.rotation);
    row.root.object3D.scale.setScalar(pose.scale);
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
      // Suavizar la pose completa (posición + quaternion 3D + escala).
      // La información se congela al perder el marcador para que SLAM
      // mantenga cada anclaje hasta un nuevo reconocimiento.
      const alpha=1-Math.exp(-dt*8);
      row.root.object3D.position.lerp(row.pose.position,alpha);
      row.root.object3D.quaternion.slerp(row.pose.rotation,alpha);
      const oldScale=row.root.object3D.scale.x;
      const next=oldScale+(row.pose.scale-oldScale)*alpha;
      row.root.object3D.scale.setScalar(next);
    }
    if(row.targetVisible&&now-row.lastTargetAt>1600){
      row.targetVisible=false;row.pose=null;
    }
    const t=now/1000,rot=(row.rotationDeg*Math.PI)/180;
    const pivot=row.pivot.object3D;
    // Los ejes de la vista previa son los mismos del modelo:
    // X = derecha del papel; Y = arriba/normal al papel;
    // Z = profundidad en el plano. axis.rotation.x convierte
    // esos ejes al plano XY y normal +Z del image target.
    const unitsPerCm=row.markerLocalSide/PHYSICAL_PRINT_CM;
    pivot.position.set(
      row.xCm*unitsPerCm,
      (row.yCm+(row.animation==='float'?4.5*Math.sin(t*1.8):0))*unitsPerCm,
      row.zCm*unitsPerCm
    );
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
    // Especificar también la escala en xrweb evita que su inicialización
    // restablezca la opción global predeterminada "responsive".
    scene.setAttribute('xrweb','allowedDevices: any; scale: absolute');
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
$('calibrate').onclick=()=>{
  calibrationVisible=!calibrationVisible;
  $('calibrate').setAttribute('aria-pressed',calibrationVisible?'true':'false');
  $('calibrate').textContent=calibrationVisible?'Ocultar contorno':'Contorno 15 cm';
  syncVisibility();
  note(calibrationVisible?'Mostrando contorno físico 15×15 cm':'Contorno de calibración oculto');
};
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
