/*
 * Estudio SLAM — conversion de PNG imprimible 15x15 cm a image target 8th Wall.
 * El formato replica el recorte PLANAR centrado 3:4 del CLI oficial de 8th Wall:
 * https://github.com/8thwall/8thwall/tree/main/apps/image-target-cli
 * Resampleo 480x640, luminancia JPEG, nombres de destino exclusivos por marcador.
 */
function imageFromBlob(blob){
  return new Promise((resolve,reject)=>{
    if(!(blob instanceof Blob))return reject(Error('El marcador no contiene una imagen PNG válida.'));
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo leer la imagen imprimible.'))};
    img.src=url;
  });
}
function toJpeg(canvas){
  return new Promise((resolve,reject)=>
    canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo generar JPEG de reconocimiento.')),'image/jpeg',.94)
  );
}
export async function buildTarget(printBlob,name){
  if(!/^[a-z0-9-]{1,55}$/.test(name))throw Error('Nombre de target no válido.');
  const img=await imageFromBlob(printBlob);
  const W=img.naturalWidth,H=img.naturalHeight;
  if(W<512||H<512)throw Error('La imagen del marcador debe medir al menos 512 px.');
  // Recorte 3:4 sobre el marcador FINAL, con el mismo centro físico.
  // Así el QR (que está en la esquina inferior derecha) queda generalmente
  // fuera de la región de seguimiento sin interferir con el reconocimiento.
  const cropRatio=3/4;
  const cw=Math.min(W,Math.round(H*cropRatio));
  const ch=Math.min(H,Math.round(cw/cropRatio));
  const left=Math.floor((W-cw)/2),top=Math.floor((H-ch)/2);
  const canvas=document.createElement('canvas');
  canvas.width=480;canvas.height=640;
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,480,640);
  ctx.drawImage(img,left,top,cw,ch,0,0,480,640);
  const pixels=ctx.getImageData(0,0,480,640);
  const data=pixels.data;
  for(let i=0;i<data.length;i+=4){
    const grey=Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);
    data[i]=grey;data[i+1]=grey;data[i+2]=grey;data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const blob=await toJpeg(canvas);
  return {
    blob,
    width:480,height:640,
    data:{
      name,type:'PLANAR',
      properties:{top,left,width:cw,height:ch,isRotated:false,originalWidth:W,originalHeight:H},
      imagePath:'',
      metadata:null
    }
  };
}
