/*
 * Visor de recorridos múltiples 8th Wall + SLAM
 * Cada imagen es reconocida por un PLANAR image target único.
 * El objeto se mantiene en coordenadas del mundo cuando el target sale
 * del encuadre y se corrige suavemente al reenfocarlo.
 */
import {buildTarget} from './image-targets.js?v=2';
import {STUDIO_CONFIG} from './studio-config.js?v=1';
import {attachObjectGestures,applyTouchTransform} from './touch-objects.js';
import {setupArVideoRecorder} from './record-clip.js';
import {sampleObjectMotion,OBJECT_ANIMATION_TYPES} from './object-animations.js';
import {
  MARKER_LOSS_GRACE_MS,BALANCED_GRACE_MS,
  BALANCED_MAX_CAMERA_TRAVEL_M,BALANCED_MAX_RADIAL_EXPANSION_M,
  BALANCED_BOUNDARY_CONFIRM_MS,
  shouldHideStaleAnchor,balancedSpatialLimit,isAnchorVisible,
  isStrictTracking,isBalancedTracking
} from './marker-stability.js';
import {
  ANCHOR_SAFE_LIMITS_M,DEFAULT_ANCHOR_SAFE_LIMIT_M,
  cameraRangeFromMarkerM,isOutsideSafeRadius,limitLabel
} from './anchor-safety.js';
import {
  MARKER_GUARD,advanceCandidate,conflictsWithOtherAnchor,
  plausibleLiveUpdate
} from './marker-guard.js';
const $=id=>document.getElementById(id);
const scene=$('scene'),instructions=$('instruction');
const diag=$('diagnostic'),info=$('specimenInfo'),infoTitle=$('infoTitle');
const infoText=$('infoText'),infoAccessible=$('accessibleText');
const infoToggle=$('infoToggle'),splash=$('splash'),fatalPanel=$('fatal');
const params=new URLSearchParams(location.search);
const requestedId=params.get('id')||'',preview=params.get('preview')==='1';
const individualPreviewToken=params.get('prueba')||'';
const useUniqueCrop=params.get('target')!=='original';
const stabilityMode=['legacy','strict'].includes(params.get('stability'))
  ?params.get('stability'):'balanced';
const startedAt=performance.now();
const ownedUrls=[],rows=[],rowByTarget=new Map();
const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const THREE=window.AFRAME?.THREE;
let manifestName='',configReady=false,engineStarted=false,xrReady=false;
let currentId=null,showAll=true,lastError='',lastFrame=0,typingFrame=0,typingState=null;
let descriptionId=null,descriptionCollapsed=false;
let scanStarted=false,markerFoundCount=0,lastStatusUpdate=0,calibrationVisible=false;
let suppressedEvents=0,identityConflicts=0,autoCorrections=0;
let safetyLimitM=DEFAULT_ANCHOR_SAFE_LIMIT_M;
let safetyHideCount=0,markerLossHideCount=0,balancedSpatialHideCount=0;
const PHYSICAL_PRINT_CM=15;
const videoRecorder=setupArVideoRecorder({
  scene,button:$('recordVideo'),routeId:requestedId,say,note
});
let source='sin cargar';
const log=[];
function say(_message){/* Los avisos técnicos de seguimiento no se muestran al visitante. */}
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
    'Reconocimiento: '+(useUniqueCrop?'ARTES SIN QR · anti-confusión':'ORIGINAL · QR incluido'),
    'Motor XR8: '+(window.XR8?'disponible':'cargando'),
    'Video AR: '+videoRecorder.getState(),
    'Escena A-Frame: '+(scene.hasLoaded?'lista':'cargando'),
    'Seguimiento: '+(xrReady?'REALITY READY':'esperando'),
    'Estabilidad: '+(isStrictTracking(stabilityMode)
      ?'ESTRICTA · ocultar '+MARKER_LOSS_GRACE_MS+' ms'
      :isBalancedTracking(stabilityMode)
        ?'EQUILIBRADA · hasta '+(BALANCED_GRACE_MS/1000)+' s, +'+BALANCED_MAX_CAMERA_TRAVEL_M+' m cámara, +'+BALANCED_MAX_RADIAL_EXPANSION_M+' m radial'
        :'ANTERIOR · SLAM libre sin marcador'),
    'Ocultaciones por tiempo: '+markerLossHideCount+
      ' | por desplazamiento: '+balancedSpatialHideCount,
    'Imágenes: '+rows.length+' | buscando: '+(scanStarted?'sí':'no'),
    'Detectados al menos una vez: '+rows.filter(r=>r.seen).length,
    'Confirmaciones: '+markerFoundCount+' | Detenciones breves: '+suppressedEvents,
    'Conflictos de identidad: '+identityConflicts+' | Reanclajes automáticos: '+autoCorrections,
    'Activos en imagen: '+(rows.filter(r=>r.targetVisible).map(r=>r.title).join(', ')||'ninguno'),
    'En pantalla: '+(rows.filter(r=>r.root?.object3D.visible).map(r=>r.title).join(', ')||'ninguno'),
    'Visualización: '+(showAll?'Todos los reconocidos':'Último reconocido'),
    'Perímetro de seguridad: '+limitLabel(safetyLimitM)+' (distancia radial adicional)',
    'Ocultaciones de seguridad: '+safetyHideCount,
    'Posición cámara: '+(cameraWorldPosition()?.toArray().map(x=>x.toFixed(2)).join(' / ')||'no disponible'),
    ...rows.filter(r=>r.seen).map(r=>{
      const reference=Number.isFinite(r.lastTrustedRangeM)?r.lastTrustedRangeM.toFixed(2):'?';
      const current=cameraRangeM(r);
      return r.title+': '+(r.safetyHidden?'OCULTO por distancia':r.targetVisible?'marcador visible':'seguimiento aproximado')+
        ' · cámara '+(current===null?'?':current.toFixed(2))+' m · referencia '+reference+' m';
    }),
    ...rows.filter(r=>r.candidate).map(r=>
      r.title+': verificando identidad/corrección ('+r.candidate.samples+' eventos)'
    ),
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
    req.onupgradeneeded=()=>reject(Error('Primero guarda un recorrido en Estudio SLAM.'));
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
    verticalRotationDeg:cleanTransform(item.verticalRotationDeg),
    animation:OBJECT_ANIMATION_TYPES.includes(item.animation)?item.animation:'none',
    targetData,seen:false,targetVisible:false,pose:null,lastTargetAt:0,loaded:false,
    lockHidden:false,violationSince:null,lastTrustedCameraPosition:null,
    candidate:null,rejected:0,
    safetyHidden:false,lastTrustedRangeM:null,lastSafetyExcessM:0,
    lastRejectionAt:0,confirmationCount:0,
    root:null,center:null,axis:null,pivot:null,touch:null,model:null,mixer:null,loadError:'',recognitions:0,
    touchState:{yaw:0,pitch:0,scale:1},modelHalfHeightLocal:0,
    isTouching:false,spinPauseUntil:0,spinAngle:0,
    markerLocalSide:.15,engineScale:1,detectedWidth:null,printSideWorld:null,
    baseBounds:null,baseMaxAxis:0,calibrationSquare:null,calibrationMaterial:null
  };
  rowByTarget.set(targetName,row);rows.push(row);
  return row;
}

/*
 * Publicaciones automáticas desde Supabase:
 * GitHub Pages conserva la URL y el motor WebAR, pero el manifiesto y los GLB
 * definitivos se leen de un bucket público, sin ZIP ni credenciales GitHub.
 * Los recorridos históricos de GitHub Pages siguen como alternativa.
 */
const CLOUD_PUBLIC_BASE=STUDIO_CONFIG.supabaseConfigured
  ? STUDIO_CONFIG.supabaseUrl+'/storage/v1/object/public/slam-publicaciones/'
  : '';
function cloudFile(path,type){
  if(typeof path!=='string' ||
     !/^v[a-z0-9-]{8,48}\/(modelos|imprimir)\/[a-z0-9_.-]+$/.test(path) ||
     path.includes('..') || !path.includes('/'+type+'/'))
    throw Error('Ruta pública de recurso inválida.');
  return path;
}
async function readCloudPublished(){
  if(!CLOUD_PUBLIC_BASE)return false; // Solo: paquetes publicados en GitHub.
  const base=CLOUD_PUBLIC_BASE+requestedId+'/';
  let response;
  try{
    response=await fetch(base+'manifest.json?v='+Date.now(),{cache:'no-store',referrerPolicy:'no-referrer'});
  }catch(error){
    // Preserve support for legacy tours hosted entirely in the GitHub repo.
    note('No se pudo consultar almacenamiento en nube: '+String(error));
    return false;
  }
  if(response.status===404)return false;
  if(!response.ok)
    throw Error('Almacenamiento público no disponible (HTTP '+response.status+').');
  const data=await response.json();
  if(data.format!=='estudio-slam-cloud-v1' || data.id!==requestedId ||
     !Array.isArray(data.items)||data.items.length<1||data.items.length>20)
    throw Error('El manifiesto colaborativo publicado no es válido.');

  source='Publicado automáticamente · Estudio SLAM';
  manifestName=String(data.name||'Recorrido colaborativo');
  for(let i=0;i<data.items.length;i++){
    const item=data.items[i];
    const modelPath=cloudFile(item.model,'modelos');
    const printPath=cloudFile(item.print,'imprimir');
    if(!isId(item.id))throw Error('Identificador de marcador publicado inválido.');
    const modelURL=new URL(modelPath,base).href;
    const printURL=new URL(printPath,base).href;
    const printResponse=await fetch(printURL,{cache:'force-cache',referrerPolicy:'no-referrer'});
    if(!printResponse.ok)
      throw Error('Falta el marcador publicado: '+String(item.title||item.id));

    const marker=await buildTarget(
      await printResponse.blob(),
      String(item.imageTargetName||'slam-'+String(i+1).padStart(2,'0')+'-'+item.id),
      {mode:useUniqueCrop?'unique':'legacy'}
    );
    addRow(item,modelURL,{
      ...marker.data,imagePath:blobUrl(marker.blob)
    });
  }
  return true;
}

async function readPublished(){
  if(await readCloudPublished())return;
  source='Publicado en GitHub Pages';
  const url=new URL('./recorridos/'+encodeURIComponent(requestedId)+'/manifest.json',location.href);
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('El recorrido todavía no está publicado (HTTP '+response.status+'). Prepara su ZIP en Estudio SLAM.');
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
    let targetData;
    if(useUniqueCrop){
      // Regenerar SOLO el target de reconocimiento en memoria a partir del
      // PNG ya publicado. No modificar el PNG imprimible, el QR ni el ZIP.
      // El JPG histórico incluye el QR repetido, causa probable de
      // falsos positivos entre estaciones del mismo recorrido.
      const printPath=requireFile(item.print,'imprimir');
      const printable=await fetch(new URL(printPath,url));
      if(!printable.ok)throw Error('No se pudo leer el marcador de '+item.title);
      const marker=await buildTarget(
        await printable.blob(),String(item.imageTargetName||item.target.name),
        {mode:'unique'}
      );
      targetData={...marker.data,imagePath:blobUrl(marker.blob)};
    }else{
      targetData={
        name:String(item.imageTargetName||item.target.name),
        type:'PLANAR',
        properties:item.target.properties,
        imagePath:new URL(imagePath,url).href,
        metadata:null
      };
    }
    addRow(item,new URL(modelPath,url).href,targetData);
  }
}

async function readIndividualPreview(){
  if(!STUDIO_CONFIG.supabaseConfigured)
    throw Error('La prueba colaborativa requiere configurar TU Supabase en studio-config.js.');
  source='Prueba individual temporal · Supabase';
  if(!/^[0-9a-f]{64,128}$/.test(individualPreviewToken))
    throw Error('El enlace de prueba no es válido.');
  const response=await fetch(
    STUDIO_CONFIG.supabaseUrl+'/functions/v1/slam-preview',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'apikey':STUDIO_CONFIG.supabasePublishableKey
    },
    body:JSON.stringify({token:individualPreviewToken,routeId:requestedId}),
    cache:'no-store',referrerPolicy:'no-referrer'
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok || !data || data.format!=='estudio-slam-individual-v1')
    throw Error(data?.error||'No fue posible cargar esta prueba. Generá otro enlace desde Estudio SLAM.');
  if(data.id!==requestedId||!data.item)
    throw Error('La prueba no corresponde a este recorrido.');
  const item=data.item;
  const modelUrl=new URL(item.modelUrl);
  const markerUrl=new URL(item.printUrl);
  const allowedOrigin=new URL(STUDIO_CONFIG.supabaseUrl).origin;
  if(modelUrl.origin!==allowedOrigin||markerUrl.origin!==allowedOrigin ||
     !modelUrl.pathname.includes('/storage/v1/object/sign/') ||
     !markerUrl.pathname.includes('/storage/v1/object/sign/'))
    throw Error('Los recursos de prueba no tienen una URL válida.');
  const markerResponse=await fetch(markerUrl.href,{
    cache:'no-store',referrerPolicy:'no-referrer'
  });
  if(!markerResponse.ok)throw Error('No se pudo cargar la imagen del marcador para la prueba.');
  const targetName='slam-01-'+String(item.id);
  const marker=await buildTarget(await markerResponse.blob(),targetName,{
    mode:useUniqueCrop?'unique':'legacy'
  });
  manifestName='Prueba · '+String(item.title||data.name||'Obra');
  addRow({
    id:item.id,title:item.title,description:item.description,
    imageTargetName:targetName,
    xCm:item.xCm,yCm:item.yCm,zCm:item.zCm,
    sizeCm:item.sizeCm,rotationDeg:item.rotationDeg,
    verticalRotationDeg:item.verticalRotationDeg,
    animation:item.animation
  },modelUrl.href,{...marker.data,imagePath:blobUrl(marker.blob)});
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
    const target=await buildTarget(e.finalMarkerBlob,targetName,
      {mode:useUniqueCrop?'unique':'legacy'});
    addRow({
      id:e.id,title:e.name,description:e.description,
      imageTargetName:targetName,xCm:e.x,yCm:e.y,zCm:e.z,
      sizeCm:e.size,rotationDeg:e.rotation,
      verticalRotationDeg:e.rotationVertical||0,animation:e.animation
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
    const center=document.createElement('a-entity');
    const axis=document.createElement('a-entity');
    // A-Frame inicializa su componente rotation al adjuntar el nodo:
    // declararlo como atributo evita que el montaje restablezca el +90°.
    axis.setAttribute('rotation','90 0 0');
    const pivot=document.createElement('a-entity');
    const touch=document.createElement('a-entity');
    const asset=document.createElement('a-entity');
    // Jerarquía independiente: root/center/axis/pivot son el ANCLAJE;
    // touch recibe únicamente la rotación y escala del visitante.
    // Ni un solo gesto modifica la posición global de root.
    touch.appendChild(asset);pivot.appendChild(touch);axis.appendChild(pivot);
    center.appendChild(axis);root.appendChild(center);
    scene.appendChild(root);
    row.root=root;row.center=center;row.axis=axis;row.pivot=pivot;
    row.touch=touch;row.model=asset;

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
    center.object3D.add(square);row.calibrationSquare=square;row.calibrationMaterial=mat;

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
  // El modelo se centra en su propio volumen. El wrapper 'touch'
  // lo coloca de nuevo sobre el mismo suelo cuando su escala es 100%.
  // Al pellizcar, ajusta solo su altura local, NUNCA el marcador.
  row.model.object3D.position.set(
    -((bounds.min.x+bounds.max.x)/2)*f,
    -((bounds.min.y+bounds.max.y)/2)*f,
    -((bounds.min.z+bounds.max.z)/2)*f
  );
  row.modelHalfHeightLocal=(bounds.max.y-bounds.min.y)*f/2;
  applyTouchTransform(row);
}
// La estimación de cámara y los anclajes están en el espacio de XR8.
// Esta medida NO conoce la desviación real sobre el piso cuando no se
// reconoce el papel: es una zona aproximada de confianza del seguimiento.
const cameraPositionScratch=new THREE.Vector3();
function cameraWorldPosition(){
  if(!xrReady)return null;
  const camera=scene.camera||scene.querySelector('a-camera')?.getObject3D('camera');
  if(!camera||!camera.getWorldPosition)return null;
  camera.updateWorldMatrix?.(true,false);
  camera.getWorldPosition(cameraPositionScratch);
  return [cameraPositionScratch.x,cameraPositionScratch.y,cameraPositionScratch.z]
    .every(Number.isFinite)?cameraPositionScratch:null;
}
function cameraRangeM(row){
  if(!row?.root?.object3D)return null;
  const camera=cameraWorldPosition();
  if(!camera)return null;
  // El centro del image target es el nodo independiente root, no el
  // GLB ni su desplazamiento de montaje: tamaños grandes no afectan.
  return cameraRangeFromMarkerM(camera,row.root.object3D.position);
}
function rememberTrustedCameraRange(row){
  const distance=cameraRangeM(row);
  if(distance!==null){
    // Actualizamos solo cuando ESTE marcador está realmente reconocido.
    row.lastTrustedRangeM=distance;
    const camera=cameraWorldPosition();
    if(camera)row.lastTrustedCameraPosition=camera.clone();
  }
}
function checkAnchorSafePerimeter(row){
  if(!row.seen||row.targetVisible||row.safetyHidden||safetyLimitM===0)return;
  if(!Number.isFinite(row.lastTrustedRangeM))return;
  const nowRange=cameraRangeM(row);
  if(!isOutsideSafeRadius(row.lastTrustedRangeM,nowRange,safetyLimitM))return;
  row.safetyHidden=true;
  row.lastSafetyExcessM=nowRange-row.lastTrustedRangeM;
  safetyHideCount++;
  note('LÍMITE DE ANCLAJE: '+row.title+' se oculta al alejarse +'+
    row.lastSafetyExcessM.toFixed(2)+' m desde su última posición fiable.');
  if(currentId===row.id&&descriptionId===row.id){
    // Evitar mostrar la ficha de una escultura que ya no está visible.
    stopTyping(true);
    info.hidden=true;
    descriptionId=null;
  }
  say(row.title+' se ocultó al superar la zona de confianza. Al enfocar su marcador reaparecerá automáticamente.');
  syncVisibility();
}
function concealUntrustedAnchor(row,reason,byDistance=false){
  if(row.lockHidden)return;
  row.lockHidden=true;
  row.targetVisible=false;
  row.pose=null;
  row.candidate=null;
  row.violationSince=null;
  if(byDistance)balancedSpatialHideCount++;
  else markerLossHideCount++;
  note('ANCLAJE OCULTO: '+row.title+' · '+reason+
    ' · esperar su imagen física para reanclar.');
  if(currentId===row.id&&descriptionId===row.id){
    stopTyping(true);
    info.hidden=true;
    descriptionId=null;
  }
  say(row.title+' quedó fuera de la zona confiable. Vuelve a enfocar su marcador para recuperarla.');
  syncVisibility();
}
function hideExpiredAnchor(row,now){
  if(!shouldHideStaleAnchor(row,now,stabilityMode))return;
  const grace=isStrictTracking(stabilityMode)?MARKER_LOSS_GRACE_MS:BALANCED_GRACE_MS;
  concealUntrustedAnchor(row,'sin detección durante '+(grace/1000)+' s');
}
function checkBalancedSpatialLimit(row,now){
  if(!isBalancedTracking(stabilityMode)||row.lockHidden||row.targetVisible||!row.seen)return;
  const problem=balancedSpatialLimit(row,now,cameraWorldPosition(),cameraRangeM(row));
  if(!problem){
    row.violationSince=null;
    return;
  }
  if(row.violationSince===null)row.violationSince=now;
  if(problem.immediate||now-row.violationSince>=BALANCED_BOUNDARY_CONFIRM_MS){
    concealUntrustedAnchor(row,problem.type+' ('+problem.value.toFixed(2)+' m)',true);
  }
}
function syncVisibility(){
  for(const row of rows){
    if(row.root)row.root.object3D.visible=isAnchorVisible(
      row,showAll,currentId,stabilityMode,calibrationVisible
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

function updateTargetMetrics(row,pose){
  // No aplicar a root cambios de pose de otro ID; estos son datos de la
  // imagen concreta que ya pasó por la confirmación temporal/espacial.
  const previous=row.markerLocalSide;
  row.markerLocalSide=pose.markerLocalSide;
  row.engineScale=pose.scale;
  row.printSideWorld=pose.markerLocalSide*pose.scale;
  // El recorte exclusivo no tiene el mismo centro que la impresión
  // cuadrada. Corregir el centro físico en coordenadas del image target;
  // esto preserva las posiciones X/Y/Z y el contorno de 15 cm.
  const props=row.targetData?.properties||{};
  const W=Number(props.originalWidth),H=Number(props.originalHeight);
  if(row.center&&W>0&&H>0){
    const cropCenterX=Number(props.left)+Number(props.width)/2;
    const cropCenterY=Number(props.top)+Number(props.height)/2;
    const dx=(W/2-cropCenterX)/W*row.markerLocalSide;
    const dy=(cropCenterY-H/2)/H*row.markerLocalSide;
    row.center.object3D.position.set(dx,dy,0);
  }
  if(row.calibrationSquare)row.calibrationSquare.scale.setScalar(row.markerLocalSide);
  if(Math.abs(previous-row.markerLocalSide)>1e-5)updateModelScale(row);
}
function chooseSpecimen(row){
  if(row.id!==currentId||info.hidden){
    currentId=row.id;
    selectDescription(row);
  }
  syncVisibility();
  splash.hidden=true;
  statusTop();
}
function noteRejection(row,message){
  const now=performance.now();
  row.rejected++;
  suppressedEvents++;
  if(now-row.lastRejectionAt>2200){
    note('Lectura ignorada de '+row.title+': '+message);
    row.lastRejectionAt=now;
  }
}
function acceptConfirmedTarget(row,pose,now){
  // Solo evitar una identidad falsa sobre OTRO marcador que también
  // esté siendo visto ahora. Anclajes viejos pueden haber derivado.
  const conflict=conflictsWithOtherAnchor(row,pose,rows);
  if(conflict){
    identityConflicts++;
    noteRejection(row,'lectura sobre '+conflict.title+' (ambos activos)');
    row.candidate=null;
    return;
  }
  const isNew=!row.seen;
  const oldPosition=row.root.object3D.position.clone();
  row.candidate=null;
  row.seen=true;
  row.targetVisible=true;
  row.lastTargetAt=now;
  updateTargetMetrics(row,pose);

  // Reanclaje COMPLETAMENTE AUTOMÁTICO a la pose validada de SU propia
  // imagen. Copiar directamente en una recuperación evita arrastrar el
  // modelo desde una ubicación desplazada a través de toda la sala.
  // Las actualizaciones normales posteriores sí se suavizan en updateFrame.
  row.root.object3D.position.copy(pose.position);
  row.root.object3D.quaternion.copy(pose.rotation);
  row.root.object3D.scale.setScalar(pose.scale);
  row.pose=pose;
  row.violationSince=null;
  row.lockHidden=false; // SOLO una confirmación de SU imagen autoriza a reaparecer
  row.safetyHidden=false;
  row.lastSafetyExcessM=0;
  rememberTrustedCameraRange(row);
  row.recognitions++;
  markerFoundCount++;
  if(isNew){
    note('Marcador confirmado: '+row.title+' · primer anclaje');
    say(row.title+' colocado. Arrastra sobre el objeto para rotarlo; pellizca con dos dedos para ajustar su escala.');
  }else{
    autoCorrections++;
    const cm=Math.round(oldPosition.distanceTo(pose.position)*100);
    note('REANCLAJE AUTOMÁTICO: '+row.title+' · corrección '+cm+' cm');
    say(row.title+' reanclado automáticamente a su marcador.');
  }
  row.confirmationCount++;
  chooseSpecimen(row);
}
function receiveTarget(event){
  const d=event.detail||{};
  const row=rowByTarget.get(d.name);
  if(!row)return;
  const pose=poseFromEvent(d,row);if(!pose)return;
  const now=performance.now();

  // Una imagen nueva o recuperada solo requiere una confirmación breve:
  // 3 poses coherentes durante unos 180 ms. No pedir ningún botón.
  const trackingExpired=row.lockHidden||!row.targetVisible||
    now-row.lastTargetAt>MARKER_GUARD.staleTrackingMs;
  if(trackingExpired){
    if(row.targetVisible){
      row.targetVisible=false;
      row.pose=null;
      row.candidate=null;
    }
    const result=advanceCandidate(row.candidate,pose,now);
    row.candidate=result.candidate;
    if(result.stable)acceptConfirmedTarget(row,pose,now);
    return;
  }

  // Mientras seguimos viendo el MISMO marcador, las variaciones suaves
  // se aplican sin esperar. Si hay un salto aislado, confirmarlo con
  // varias muestras coherentes y REANCLAR AUTOMÁTICAMENTE.
  const conflict=conflictsWithOtherAnchor(row,pose,rows);
  if(conflict){
    identityConflicts++;
    noteRejection(row,'coincide con '+conflict.title);
    return;
  }
  if(row.pose&&!plausibleLiveUpdate(row.pose,pose)){
    const result=advanceCandidate(row.candidate,pose,now);
    row.candidate=result.candidate;
    if(result.stable)acceptConfirmedTarget(row,pose,now);
    return;
  }
  row.candidate=null;
  row.lastTargetAt=now;
  updateTargetMetrics(row,pose);
  row.pose=pose;
  rememberTrustedCameraRange(row);
}
function targetLost(event){
  const row=rowByTarget.get(event.detail?.name);
  if(!row)return;
  const wasVisible=row.targetVisible;
  row.targetVisible=false;
  row.pose=null;
  row.candidate=null;
  if(wasVisible){
    note('Marcador fuera de cámara: '+row.title+' · '+(
      isStrictTracking(stabilityMode)?'ocultación rápida pendiente':
      isBalancedTracking(stabilityMode)?'seguimiento equilibrado temporal':
      'anclaje SLAM conservado'));
    say(isStrictTracking(stabilityMode)
      ?'Si pierdes su marcador, '+row.title+' se oculta hasta volver a detectarlo.'
      :isBalancedTracking(stabilityMode)
        ?row.title+' sigue visible por un tiempo y hasta un límite espacial. Vuelve a enfocarla para corregirla.'
        :row.title+' mantiene su posición SLAM estimada. Al reenfocarlo, se reancla automáticamente.');
  }
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
    if(row.targetVisible&&now-row.lastTargetAt>MARKER_GUARD.staleTrackingMs){
      row.targetVisible=false;
      row.pose=null;
      row.candidate=null;
    }
    // No ocultar ante pérdidas breves. En modo equilibrado, esperar
    // hasta 10 s o una salida prolongada de 2 m respecto de la última
    // referencia visual confiable de este marcador.
    // Incluso si SLAM se queda inmóvil, el temporizador limita la deriva.
    hideExpiredAnchor(row,now);
    checkBalancedSpatialLimit(row,now);
    // El control experimental de 1 m anterior sigue disponible en legacy.
    if(stabilityMode==='legacy')checkAnchorSafePerimeter(row);
    const t=now/1000,rot=(row.rotationDeg*Math.PI)/180;
    const pivot=row.pivot.object3D;
    const motion=sampleObjectMotion(row.animation,t,row.sizeCm);
    // Las animaciones transcurren SOLO dentro del marcador, en pivot.
    // root (pose SLAM) y center (centro de su impresión) nunca se mueven.
    // Los cm siguen el formato interno histórico: y = altura, z = fondo.
    const unitsPerCm=row.markerLocalSide/PHYSICAL_PRINT_CM;
    pivot.position.set(
      (row.xCm+motion.xCm)*unitsPerCm,
      (row.yCm+motion.yCm)*unitsPerCm,
      (row.zCm+motion.zCm)*unitsPerCm
    );
    // La rotación continua automática se pausa al tocar la escultura.
    if(row.animation==='spin'&&!row.isTouching&&now>row.spinPauseUntil){
      row.spinAngle+=dt*.6;
    }
    pivot.rotation.set(
      (row.verticalRotationDeg*Math.PI/180)+motion.rotX,
      rot+row.spinAngle+motion.rotY,
      motion.rotZ,'YXZ'
    );
    const gestureScale=row.touchState?.scale||1;
    // Limitar la escala total entre el 50 % y el 150 %, incluso si el
    // usuario pellizca mientras la metamorfosis varía cada eje.
    const limited=x=>Math.max(.5,Math.min(1.5,gestureScale*x))/gestureScale;
    pivot.scale.set(
      limited(motion.scaleX),
      limited(motion.scaleY),
      limited(motion.scaleZ)
    );
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
    // Registrar el grabador como módulo de XR8 ANTES de iniciar xrweb.
    // Utiliza el compositor AR nativo, sin otra cámara ni otro render.
    // Si el grabador no existe en este navegador, el AR sigue funcionando.
    videoRecorder.installPipeline();
    note('Activando '+rows.length+' image targets 8th Wall con SLAM');
    scene.setAttribute('xrconfig','');
    // Especificar también la escala en xrweb evita que su inicialización
    // restablezca la opción global predeterminada "responsive".
    scene.setAttribute('xrweb','allowedDevices: any; scale: absolute');
    say('Autoriza la cámara. Apuntá a uno de los marcadores impresos.');
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
$('retry').onclick=()=>location.reload();
infoToggle.onclick=()=>{
  descriptionCollapsed=!descriptionCollapsed;
  info.dataset.collapsed=descriptionCollapsed?'true':'false';
  infoToggle.textContent=descriptionCollapsed?'Mostrar texto':'Minimizar';
  infoToggle.setAttribute('aria-expanded',descriptionCollapsed?'false':'true');
  if(descriptionCollapsed)stopTyping(true);
};
window.addEventListener('error',e=>{lastError=String(e.message||e);refreshDiagnostic();});
window.addEventListener('unhandledrejection',e=>{
  lastError='Promesa: '+String(e.reason?.message||e.reason);
  refreshDiagnostic();
});
scene.addEventListener('xrimagefound',receiveTarget);
scene.addEventListener('xrimageupdated',receiveTarget);
scene.addEventListener('xrimagelost',targetLost);
scene.addEventListener('xrimagescanning',()=>{scanStarted=true;note('Escaneo de imágenes listo');});
scene.addEventListener('realityready',()=>{
  xrReady=true;splash.hidden=true;
  videoRecorder.setReady(true);
  note('REALITY READY · SLAM funcionando');
  say(isStrictTracking(stabilityMode)
    ?'Estabilidad estricta: las obras se ocultan rápido sin marcador.'
    :isBalancedTracking(stabilityMode)
      ?'Las esculturas permanecen un tiempo sin marcador y se reanclan al reenfocarlas.'
      :'Seguimiento SLAM continuo: al volver al marcador, la obra se reancla sola.');
  statusTop();
});
scene.addEventListener('realityerror',e=>{
  lastError='Error SLAM: '+String(e.detail?.message||e.detail?.error||'no especificado');
  refreshDiagnostic();
});
scene.addEventListener('loaded',initEngine);
window.addEventListener('xrloaded',()=>setTimeout(initEngine,0));
const poll=setInterval(()=>{
  initEngine();
  if(engineStarted||performance.now()-startedAt>60000)clearInterval(poll);
},450);
setTimeout(()=>{
  if(xrReady||!configReady)return;
  note('El seguimiento todavía no comenzó. Revisa permisos y navegador.');
},18000);
window.addEventListener('pagehide',()=>{
  stopTyping();
  for(const u of ownedUrls)URL.revokeObjectURL(u);
});
requestAnimationFrame(updateFrame);
(async()=>{
  try{
    if(!isId(requestedId))throw Error('El enlace no contiene un identificador válido de recorrido.');
    if(!THREE)throw Error('A-Frame no pudo cargar. Comprueba la conexión.');
    if(individualPreviewToken)await readIndividualPreview();
    else if(preview)await readLocal();else await readPublished();
    configReady=true;document.title=manifestName+' · Recorrido SLAM';
    note('Recorrido cargado: '+rows.length+' marcadores');
    makeEntities();
    // Disponible automáticamente al mostrar el GLB; sin botones ni modos.
    attachObjectGestures({scene,THREE,rows,note});
    splash.hidden=true;
    instructions.textContent='Autoriza la cámara y busca un marcador impreso.';
    initEngine();
  }catch(e){fail(e)}
})();
