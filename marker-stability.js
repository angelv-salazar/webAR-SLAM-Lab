/**
 * Control de confianza de los anclajes 8th Wall.
 *
 * balanced (predeterminado): mantiene cada GLB unos segundos sin imagen
 * y lo oculta cuando vence el tiempo o la cámara se aleja demasiado
 * de su ÚLTIMA pose observada mientras el marcador estaba reconocido.
 *
 * strict: oculta rápidamente (700 ms), para comparar.
 * legacy: mantiene la colocación SLAM anterior sin límite temporal.
 *
 * No puede medir el error REAL frente al papel cuando está oculto:
 * las posiciones de cámara siguen dependiendo de SLAM. El tiempo máximo
 * funciona como protección incluso cuando SLAM queda congelado.
 */
export const MARKER_LOSS_GRACE_MS=700;
export const BALANCED_GRACE_MS=6500;
export const BALANCED_MAX_CAMERA_TRAVEL_M=1.25;
export const BALANCED_MAX_RADIAL_EXPANSION_M=1.05;
export const BALANCED_BOUNDARY_CONFIRM_MS=320;
export const BALANCED_IMMEDIATE_TRAVEL_M=2.20;

export function isStrictTracking(mode){
  return mode==='strict';
}
export function isBalancedTracking(mode){
  return mode==='balanced';
}
export function isProtectedTracking(mode){
  return mode!=='legacy';
}
export function shouldHideStaleAnchor(row,now,mode='balanced'){
  if(!isProtectedTracking(mode)||!row?.seen||row.lockHidden)return false;
  const last=Number(row.lastTargetAt);
  if(!(last>0)||!Number.isFinite(now))return false;
  const grace=isStrictTracking(mode)?MARKER_LOSS_GRACE_MS:BALANCED_GRACE_MS;
  return now-last>=grace;
}
export function balancedSpatialLimit(row,now,cameraPosition,currentRangeM){
  if(!row?.seen||row.lockHidden||row.targetVisible)return null;
  if(!(Number(row.lastTargetAt)>0)||now-row.lastTargetAt<0)return null;
  const lastPosition=row.lastTrustedCameraPosition;
  const displacement=lastPosition&&cameraPosition
    ?cameraPosition.distanceTo(lastPosition):null;
  const radial=Number.isFinite(currentRangeM)&&Number.isFinite(row.lastTrustedRangeM)
    ?currentRangeM-row.lastTrustedRangeM:null;
  if(Number.isFinite(displacement)&&displacement>=BALANCED_IMMEDIATE_TRAVEL_M){
    return {type:'salto grande del seguimiento',immediate:true,value:displacement};
  }
  if(Number.isFinite(displacement)&&displacement>=BALANCED_MAX_CAMERA_TRAVEL_M){
    return {type:'desplazamiento de cámara',immediate:false,value:displacement};
  }
  if(Number.isFinite(radial)&&radial>=BALANCED_MAX_RADIAL_EXPANSION_M){
    return {type:'distancia al marcador',immediate:false,value:radial};
  }
  return null;
}
export function isAnchorVisible(row,showAll,currentId,mode='balanced',calibrationVisible=false){
  return Boolean(
    row?.seen&&(!isProtectedTracking(mode)||!row.lockHidden)&&
    !row.safetyHidden&&
    (row.loaded||calibrationVisible)&&
    (showAll||row.id===currentId)
  );
}
