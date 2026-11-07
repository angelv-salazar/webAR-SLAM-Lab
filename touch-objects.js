/*
 * Gestos táctiles directos sobre los modelos 3D.
 * Un dedo: rotación horizontal y vertical.
 * Dos dedos: escala relativa entre 0.5 y 1.5.
 *
 * Los gestos SOLO modifican row.touch.object3D. Jamás modifican
 * row.root (anclaje 8th Wall), row.center ni row.pivot (ajustes del estudio).
 */
export const MIN_USER_SCALE=.5;
export const MAX_USER_SCALE=1.5;
export const MAX_PITCH_RAD=Math.PI/3;
export function clampUserScale(value){
  if(!Number.isFinite(value))return 1;
  return Math.max(MIN_USER_SCALE,Math.min(MAX_USER_SCALE,value));
}
export function clampPitch(value){
  return Math.max(-MAX_PITCH_RAD,Math.min(MAX_PITCH_RAD,value));
}
export function twoFingerDistance(a,b){
  return Math.hypot(a.x-b.x,a.y-b.y);
}
export function scaleFromPinch(startScale,startDistance,newDistance){
  if(!(startDistance>4)||!Number.isFinite(newDistance))return clampUserScale(startScale);
  return clampUserScale(startScale*newDistance/startDistance);
}
export function rotateFromDrag(state,dx,dy){
  return {
    yaw:state.yaw+dx*.008,
    pitch:clampPitch(state.pitch+dy*.005),
    scale:state.scale
  };
}
export function applyTouchTransform(row){
  if(!row?.touch?.object3D||!row.touchState)return;
  const state=row.touchState;
  const node=row.touch.object3D;
  node.rotation.order='YXZ';
  node.rotation.y=state.yaw;
  node.rotation.x=state.pitch;
  node.scale.setScalar(clampUserScale(state.scale));
  // Conservar el apoyo de la escultura sobre el papel al variar escala.
  // La geometría está centrada en su propia mitad de altura.
  node.position.y=(row.modelHalfHeightLocal||0)*clampUserScale(state.scale);
}
export function attachObjectGestures({scene,THREE,rows,note}){
  let canvas=null;
  let active=null;
  const pointers=new Map();
  const raycaster=new THREE.Raycaster();
  const ndc=new THREE.Vector2();

  function pick(clientX,clientY){
    if(!scene.camera||!canvas)return null;
    const rect=canvas.getBoundingClientRect();
    if(!(rect.width>0&&rect.height>0))return null;
    ndc.set((clientX-rect.left)/rect.width*2-1,
      -((clientY-rect.top)/rect.height*2-1));
    scene.camera.updateMatrixWorld(true);
    scene.object3D.updateMatrixWorld(true);
    raycaster.setFromCamera(ndc,scene.camera);
    let winner=null,nearest=Infinity;
    for(const row of rows){
      if(!row.loaded||!row.root?.object3D.visible||row.safetyHidden||!row.model)continue;
      const object=row.model.getObject3D('mesh');
      if(!object)continue;
      const hits=raycaster.intersectObject(object,true);
      if(hits.length&&hits[0].distance<nearest){
        nearest=hits[0].distance;winner=row;
      }
    }
    return winner;
  }
  function point(e){return {x:e.clientX,y:e.clientY};}
  function firstTwo(){
    const p=[...pointers.values()];
    return p.length>=2?[p[0],p[1]]:null;
  }
  let lastPoint=null,pinchStart=null;
  function handleDown(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(pointers.has(e.pointerId)||pointers.size>=2)return;
    if(!active){
      active=pick(e.clientX,e.clientY);
      if(!active)return; // Tocar el fondo NO mueve el marcador.
      if(!active.touchState||!active.touch)return;
      active.isTouching=true;
      active.spinPauseUntil=performance.now()+3500;
    }
    pointers.set(e.pointerId,point(e));
    if(pointers.size===1){lastPoint=point(e);pinchStart=null;}
    else {
      const p=firstTwo();
      pinchStart={distance:twoFingerDistance(p[0],p[1]),scale:active.touchState.scale};
      lastPoint=null;
    }
    if(e.cancelable)e.preventDefault();
    try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  }
  function handleMove(e){
    if(!active||!pointers.has(e.pointerId))return;
    if(!active.root?.object3D.visible||active.safetyHidden){clear();return;}
    pointers.set(e.pointerId,point(e));
    if(pointers.size===1){
      const current=point(e);
      if(lastPoint){
        const dx=current.x-lastPoint.x,dy=current.y-lastPoint.y;
        if(Math.abs(dx)+Math.abs(dy)>0){
          Object.assign(active.touchState,rotateFromDrag(active.touchState,dx,dy));
          applyTouchTransform(active);
        }
      }
      lastPoint=current;
    }else if(pointers.size===2&&pinchStart){
      const p=firstTwo();
      active.touchState.scale=scaleFromPinch(pinchStart.scale,pinchStart.distance,
        twoFingerDistance(p[0],p[1]));
      applyTouchTransform(active);
    }
    active.spinPauseUntil=performance.now()+3500;
    if(e.cancelable)e.preventDefault();
  }
  function clear(){
    if(active){active.isTouching=false;active.spinPauseUntil=performance.now()+3500;}
    active=null;pointers.clear();lastPoint=null;pinchStart=null;
  }
  function handleEnd(e){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(e.cancelable)e.preventDefault();
    try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch(_){}
    if(!pointers.size){
      if(active)note('Interacción táctil · '+active.title+
        ' · escala '+Math.round(active.touchState.scale*100)+'%');
      clear();
    }else if(pointers.size===1){
      // Tras soltar un dedo del pellizco, retomar rotación sin salto.
      lastPoint=[...pointers.values()][0];pinchStart=null;
    }
  }
  function bind(){
    const next=scene.canvas||scene.renderer?.domElement;
    if(!next||next===canvas)return;
    if(canvas){
      for(const [name,callback] of listeners)canvas.removeEventListener(name,callback);
    }
    clear();canvas=next;
    canvas.style.touchAction='none';
    for(const [name,callback] of listeners){
      canvas.addEventListener(name,callback,{passive:false});
    }
    note('Gestos activados: un dedo rota; dos dedos cambian escala 50–150 %.');
  }
  const listeners=[
    ['pointerdown',handleDown],
    ['pointermove',handleMove],
    ['pointerup',handleEnd],
    ['pointercancel',handleEnd],
    ['lostpointercapture',handleEnd]
  ];
  scene.addEventListener('renderstart',bind);
  scene.addEventListener('loaded',bind);
  if(scene.canvas)bind();
  return {bind,clear};
}
