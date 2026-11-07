/*
 * Guardián de anclajes para recorridos WebAR con varios image targets.
 *
 * 8th Wall comunica "name"/pose de cada target, pero no un puntaje de
 * confianza utilizable como umbral. Antes de activar una estación esperamos
 * varias actualizaciones coherentes; una detección aislada se ignora.
 *
 * Solo trabaja sobre instancias de Vector3 / Quaternion de THREE: no depende
 * de A-Frame ni hace operaciones de red.
 */
export const MARKER_GUARD=Object.freeze({
  minSamples:3,
  confirmMs:180,
  maxEventGapMs:650,
  maxCandidatePositionStepM:.34,
  maxCandidateAngleRad:Math.PI*.32,
  maxCandidateScaleRatio:1.65,
  foreignAnchorRadiusM:.19,
  maxLivePositionStepM:.32,
  maxLiveAngleRad:Math.PI*.33,
  maxLiveScaleRatio:1.65,
  manualReanchorDistanceM:.30,
  manualReanchorAngleRad:Math.PI*.31,
  manualReanchorScaleRatio:1.50,
  staleTrackingMs:1350,
  switchCooldownMs:650,
});
export function angleRad(a,b){
  if(!a?.rotation||!b?.rotation)return Infinity;
  return a.rotation.angleTo(b.rotation);
}
export function positionDistanceM(a,b){
  if(!a?.position||!b?.position)return Infinity;
  return a.position.distanceTo(b.position);
}
export function scaleRatio(a,b){
  const x=Number(a?.scale),y=Number(b?.scale);
  if(!(x>0)||!(y>0))return Infinity;
  return Math.max(x/y,y/x);
}
export function coherent(a,b,limitPosition,limitAngle,limitScale){
  return positionDistanceM(a,b)<=limitPosition
    &&angleRad(a,b)<=limitAngle
    &&scaleRatio(a,b)<=limitScale;
}
export function advanceCandidate(previous,pose,now){
  const cfg=MARKER_GUARD;
  const continuous=previous
    && now-previous.lastAt<=cfg.maxEventGapMs
    && coherent(previous.lastPose,pose,
      cfg.maxCandidatePositionStepM,cfg.maxCandidateAngleRad,
      cfg.maxCandidateScaleRatio);
  const candidate=continuous
    ?{firstAt:previous.firstAt,lastAt:now,samples:previous.samples+1,lastPose:pose}
    :{firstAt:now,lastAt:now,samples:1,lastPose:pose};
  const stable=candidate.samples>=cfg.minSamples
    &&now-candidate.firstAt>=cfg.confirmMs;
  return {candidate,stable};
}
export function conflictsWithOtherAnchor(target,pose,rows){
  const t=MARKER_GUARD.foreignAnchorRadiusM;
  for(const row of rows){
    // Un anclaje antiguo puede haber derivado: solo evitar coincidencia
    // entre DOS imágenes confirmadas y ACTIVAS en la misma cámara.
    if(row.id===target.id||!row.seen||!row.targetVisible||!row.root?.object3D)continue;
    if(row.root.object3D.position.distanceTo(pose.position)<t)return row;
  }
  return null;
}
export function largeCorrection(root,pose){
  const cfg=MARKER_GUARD;
  const old={
    position:root.position,
    rotation:root.quaternion,
    scale:root.scale.x,
  };
  const distanceM=positionDistanceM(old,pose);
  const angle=angleRad(old,pose);
  const ratio=scaleRatio(old,pose);
  return {
    needsApproval:distanceM>cfg.manualReanchorDistanceM
      ||angle>cfg.manualReanchorAngleRad
      ||ratio>cfg.manualReanchorScaleRatio,
    distanceM,angleRad:angle,scaleRatio:ratio,
  };
}
export function plausibleLiveUpdate(previousPose,pose){
  const c=MARKER_GUARD;
  return coherent(previousPose,pose,c.maxLivePositionStepM,
    c.maxLiveAngleRad,c.maxLiveScaleRatio);
}
