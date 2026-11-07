/**
 * Per-marker safety perimeter for WebAR SLAM.
 *
 * Without a visible physical image target, world tracking cannot know its
 * *true* physical drift. This guard does NOT claim to measure that drift.
 * It limits how much farther the camera can move FROM the last verified
 * marker position before the corresponding object is hidden.
 *
 * Radial distance is used instead of accumulated travel, so the visitor
 * can walk around a marker at approximately the same radius.
 *
 * When hidden, the anchor stays hidden until its image is recognized again
 * with the existing temporal / identity confirmation. No manual action.
 */
export const ANCHOR_SAFE_LIMITS_M=Object.freeze([1,2,0]);
export const DEFAULT_ANCHOR_SAFE_LIMIT_M=1;

export function cameraRangeFromMarkerM(cameraPosition,markerPosition){
  if(!cameraPosition||!markerPosition)return null;
  const distance=cameraPosition.distanceTo(markerPosition);
  return Number.isFinite(distance)&&distance>=0?distance:null;
}
export function isOutsideSafeRadius(referenceRangeM,currentRangeM,extraRangeM){
  if(extraRangeM===0)return false; // OFF
  if(!Number.isFinite(referenceRangeM)||!Number.isFinite(currentRangeM))return false;
  if(!(extraRangeM>0))return false;
  return currentRangeM>referenceRangeM+extraRangeM;
}
export function nextSafeLimit(current){
  const i=ANCHOR_SAFE_LIMITS_M.indexOf(current);
  return ANCHOR_SAFE_LIMITS_M[(i+1)%ANCHOR_SAFE_LIMITS_M.length];
}
export function limitLabel(limitM){
  return limitM===0?'Sin límite':('Zona +'+limitM+' m');
}
