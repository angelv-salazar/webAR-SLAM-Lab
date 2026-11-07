/* Marcador experimental estable para comparar AR.js con 8th Wall.
   Dos páginas dibujan exactamente el mismo patrón con geometría determinista.
   El recorte de 3:4 reproduce el procedimiento planar del image-target-cli. */
(function(){
  'use strict';
  const SIZE=1200;
  function randomGenerator(seed){
    let n=seed>>>0;
    return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return ((n>>>0)/4294967296);};
  }
  function draw(canvas){
    canvas.width=SIZE;canvas.height=SIZE;
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('No se pudo iniciar el canvas del marcador.');
    const rng=randomGenerator(0x81f3da52);
    const R=(a,b)=>a+(b-a)*rng();
    ctx.fillStyle='#f7f7f3';ctx.fillRect(0,0,SIZE,SIZE);
    // Líneas irregulares: contraste, sin cuadrícula repetitiva.
    for(let i=0;i<135;i++){
      let x=R(165,1035),y=R(35,1150),endX=x+R(-115,115),endY=y+R(-90,130);
      ctx.strokeStyle=i%7===0?'#202b29':i%3===0?'#687c72':'#263b32';
      ctx.lineWidth=R(3,11);ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.bezierCurveTo(x+R(-45,45),y+R(-90,90),endX+R(-65,65),endY+R(-40,40),endX,endY);
      ctx.stroke();
    }
    // Manchas, círculos y cortes irregulares que introducen detalles distinguibles.
    for(let i=0;i<75;i++){
      const x=R(180,1020),y=R(35,1110),r=R(7,38),kind=i%5;
      ctx.beginPath();
      if(kind===0){
        const n=5+Math.floor(R(0,4));
        for(let k=0;k<n;k++){
          const a=(k/n)*Math.PI*2,rad=r*R(.48,1.35);
          if(k===0)ctx.moveTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);
          else ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);
        }
        ctx.closePath();
      }else{
        ctx.ellipse(x,y,r,R(2,14),R(0,Math.PI),0,Math.PI*2);
      }
      ctx.fillStyle=i%4===0?'#0b2420':i%4===1?'#829588':'#32493e';ctx.fill();
      if(i%9===0){
        ctx.strokeStyle='#f7f7f3';ctx.lineWidth=5;ctx.stroke();
      }
    }
    // Forma central asimétrica con segmentos, más fácil de identificar que
    // un patrón simétrico o un QR aislado.
    ctx.save();ctx.translate(612,515);ctx.rotate(-.17);
    ctx.lineCap='round';
    ctx.strokeStyle='#0e2e27';ctx.lineWidth=35;ctx.beginPath();
    ctx.moveTo(-225,-215);ctx.bezierCurveTo(-10,-270,205,-175,183,3);
    ctx.bezierCurveTo(170,150,-65,200,-198,66);ctx.stroke();
    ctx.strokeStyle='#f7f7f3';ctx.lineWidth=12;ctx.beginPath();
    ctx.moveTo(-165,-198);ctx.bezierCurveTo(22,-230,155,-118,151,7);ctx.stroke();
    for(let i=0;i<16;i++){
      const a=i*2.39996;
      const rad=R(36,185),x=Math.cos(a)*rad,y=Math.sin(a)*rad;
      ctx.fillStyle=i%2===0?'#1c4a3a':'#99b7a4';
      ctx.beginPath();ctx.arc(x,y,R(5,16),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    // Marcas de identidad no repetidas y letras decorativas para impresión.
    ctx.fillStyle='#102b22';ctx.fillRect(125,82,110,115);
    ctx.fillStyle='#f7f7f3';ctx.font='bold 62px sans-serif';ctx.fillText('01',143,156);
    ctx.fillStyle='#102b22';ctx.beginPath();ctx.arc(1000,175,54,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#f7f7f3';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(962,161);ctx.lineTo(1020,193);ctx.lineTo(1030,148);ctx.stroke();
    ctx.fillStyle='#f7f7f3';ctx.fillRect(195,1000,806,140);
    ctx.strokeStyle='#142e27';ctx.lineWidth=11;ctx.strokeRect(195,1000,806,140);
    ctx.fillStyle='#142e27';ctx.font='bold 59px sans-serif';ctx.fillText('SLAM · LAB / 01',235,1087);
    // Línea de seguridad para recorte impreso; no es un patrón .patt de AR.js.
    ctx.strokeStyle='#1c4033';ctx.lineWidth=7;ctx.strokeRect(9,9,1182,1182);
    return canvas;
  }
  function luminanceCanvas(){
    const src=draw(document.createElement('canvas'));
    const c=document.createElement('canvas');c.width=480;c.height=640;
    const x=c.getContext('2d',{alpha:false});
    x.drawImage(src,150,0,900,1200,0,0,480,640);
    const img=x.getImageData(0,0,480,640);
    const a=img.data;
    for(let i=0;i<a.length;i+=4){
      const y=Math.round(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2]);
      a[i]=a[i+1]=a[i+2]=y;
    }
    x.putImageData(img,0,0);
    return c;
  }
  async function target(){
    const c=luminanceCanvas();
    const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('No se pudo crear luminancia JPEG')),'image/jpeg',.94));
    const url=URL.createObjectURL(blob);
    return {
      url,
      data:{
        name:'slam-lab-01',
        type:'PLANAR',
        properties:{top:0,left:150,width:900,height:1200,isRotated:false,originalWidth:SIZE,originalHeight:SIZE},
        imagePath:url,
        metadata:null
      }
    };
  }
  window.SlamLabMarker={draw,luminanceCanvas,target,SIZE};
})();