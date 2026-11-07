/**
 * Animaciones locales de los objetos. Nunca alterar la pose global del
 * marcador (root de XR8), solo el pivot interior de cada escultura.
 *
 * El Estudio y el visor del teléfono comparten estas funciones para que
 * la vista previa sea consistente con la experiencia publicada.
 *
 * Las combinaciones experimentales NO deforman los vértices del GLB:
 * mezclan traslaciones acotadas, rotación y escalas por eje.
 */
export const OBJECT_ANIMATION_TYPES=Object.freeze([
  'none','spin','float','pulse','orbit','metamorphosis','embedded'
]);

export function sampleObjectMotion(animation,t,sizeCm=12){
  const p=Number.isFinite(t)?t:0;
  const size=Number.isFinite(sizeCm)&&sizeCm>0?sizeCm:12;
  const motion={
    xCm:0,yCm:0,zCm:0,rotX:0,rotY:0,rotZ:0,
    scaleX:1,scaleY:1,scaleZ:1
  };
  if(animation==='float'){
    motion.yCm=4.5*Math.sin(p*1.8);
  }else if(animation==='pulse'){
    const scale=1+.12*Math.sin(p*2);
    motion.scaleX=scale;motion.scaleY=scale;motion.scaleZ=scale;
  }else if(animation==='orbit'){
    // Órbita asimétrica + suspensión + oscilación angular.
    // Amplitud máxima de 6 cm; nunca mueve el anclaje de XR8.
    const radius=Math.max(1.4,Math.min(6,size*.05));
    motion.xCm=radius*Math.sin(p*.85);
    motion.zCm=radius*.72*Math.sin(p*.57+1.2);
    motion.yCm=1.8*Math.sin(p*1.3);
    motion.rotX=.08*Math.sin(p*.9);
    motion.rotY=.30*Math.sin(p*.68)+.08*Math.sin(p*1.9);
    motion.rotZ=.10*Math.sin(p*.73+1.1);
  }else if(animation==='metamorphosis'){
    // Pulsación orgánica asimétrica, balanceo y respiración vertical.
    // Es una distorsión por ejes, no un modificador de geometría.
    motion.scaleX=1+.17*Math.sin(p*1.95);
    motion.scaleY=1+.13*Math.sin(p*1.25+.8);
    motion.scaleZ=1+.15*Math.sin(p*1.95+2.15);
    motion.yCm=1.3*Math.sin(p*1.12);
    motion.rotX=.11*Math.sin(p*.76);
    motion.rotY=.12*Math.sin(p*.58+.6);
    motion.rotZ=.14*Math.sin(p*1.05);
  }
  return motion;
}
