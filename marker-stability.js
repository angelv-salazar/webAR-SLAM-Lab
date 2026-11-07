/**
 * Estabilidad experimental de los image targets.
 *
 * Modo "strict" (por defecto): cuando pasan 700 ms sin una pose validada
 * del marcador, se oculta su obra y SOLO vuelve a mostrarse tras un
 * reconocimiento confirmado con el guardián de marcadores.
 *
 * Modo "legacy": conserva la posición SLAM anterior para comparar.
 *
 * Este criterio no mide precisión de SLAM, únicamente vigencia de
 * una referencia física observada. Intencionalmente prioriza anclajes
 * confiables frente a la persistencia visual sin marcador.
 */
export const MARKER_LOSS_GRACE_MS=700;
export function isStrictTracking(mode){
  return mode!=='legacy';
}
export function shouldHideStaleAnchor(row,now,mode='strict'){
  if(!isStrictTracking(mode)||!row?.seen||row.lockHidden)return false;
  const last=Number(row.lastTargetAt);
  if(!(last>0)||!Number.isFinite(now))return false;
  return now-last>=MARKER_LOSS_GRACE_MS;
}
export function isAnchorVisible(row,showAll,currentId,mode='strict',calibrationVisible=false){
  return Boolean(
    row?.seen&&(!isStrictTracking(mode)||!row.lockHidden)&&
    !row.safetyHidden&&
    (row.loaded||calibrationVisible)&&
    (showAll||row.id===currentId)
  );
}
