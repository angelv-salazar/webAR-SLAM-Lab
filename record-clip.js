/*
 * Grabación del recorrido híbrido con el grabador NATIVO de XR8.
 * A diferencia de canvas.captureStream(), XR8.MediaRecorder compone
 * directamente la cámara y la escena de 8th Wall y entrega un video MP4.
 *
 * UN SOLO BOTÓN: Grabar -> Detener -> descarga automática. En Safari iOS,
 * el mismo botón permite compartir/guardar en Fotos cuando el sistema
 * requiere una activación adicional del usuario.
 *
 * No abre otra cámara, no solicita micrófono y no altera SLAM ni los GLB.
 */
export const MAX_CLIP_MS=60000;
export const MAX_VIDEO_DIMENSION=720;
export function isAppleMobile(nav){
  const ua=String(nav?.userAgent||'');
  return /iPhone|iPad|iPod/i.test(ua) ||
    (nav?.platform==='MacIntel' && (nav?.maxTouchPoints||0)>1);
}
export function recordingFileName(routeId,date=new Date()){
  const stamp=[date.getFullYear(),
    String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0'),'-',
    String(date.getHours()).padStart(2,'0'),
    String(date.getMinutes()).padStart(2,'0'),
    String(date.getSeconds()).padStart(2,'0')].join('');
  const clean=String(routeId||'recorrido').replace(/[^a-z0-9_-]/gi,'').slice(0,65);
  return 'webAR-'+clean+'-'+stamp+'.mp4';
}

export function setupArVideoRecorder({scene,button,routeId,say,note}){
  let phase='idle',installed=false,ready=false,clipUrl=null,clipBlob=null;
  let clipName='',serial=0;
  const apple=isAppleMobile(navigator);
  function display(){
    button.disabled=!ready||!installed||['starting','saving'].includes(phase);
    button.dataset.recording=phase==='recording'?'true':'false';
    button.dataset.saving=phase==='saving'?'true':'false';
    button.setAttribute('aria-pressed',phase==='recording'?'true':'false');
    button.textContent=({
      idle:'● Grabar',
      starting:'Iniciando…',
      recording:'■ Detener',
      saving:'Guardando…',
      readyToShare:'Guardar video'
    })[phase]||'● Grabar';
  }
  function cleanupClip(){
    if(clipUrl)URL.revokeObjectURL(clipUrl);
    clipUrl=null;clipBlob=null;clipName='';
  }
  function downloadClip(){
    if(!clipUrl)return false;
    const link=document.createElement('a');
    link.href=clipUrl;
    link.download=clipName;
    link.style.display='none';
    document.body.appendChild(link);
    try{link.click();return true;}
    finally{link.remove();}
  }
  function installPipeline(){
    if(installed)return true;
    const XR8=window.XR8;
    if(!XR8?.MediaRecorder?.pipelineModule ||
       !XR8?.MediaRecorder?.recordVideo ||
       !XR8?.MediaRecorder?.stopRecording){
      note('La versión de 8th Wall no incluye su grabador de video AR.');
      say('La grabación no está disponible en este navegador.');
      return false;
    }
    try{
      XR8.addCameraPipelineModule(XR8.MediaRecorder.pipelineModule());
      XR8.MediaRecorder.configure({
        maxDurationMs:MAX_CLIP_MS,
        maxDimension:MAX_VIDEO_DIMENSION,
        enableEndCard:false,
        requestMic:XR8.MediaRecorder.RequestMicOptions?.MANUAL||'manual'
      });
      installed=true;
      note('Grabación AR MP4 lista · 720 px máximo · 60 segundos · sin micrófono.');
      display();return true;
    }catch(error){
      note('No se pudo inicializar el grabador XR8: '+(error.message||error));
      say('No se pudo iniciar la función de grabación.');
      return false;
    }
  }
  function setReady(value=true){
    ready=Boolean(value);
    display();
  }
  function failure(error){
    const text=String(error?.message||error?.error?.message||error||'sin detalles');
    note('Error de grabación: '+text);
    say('No se pudo grabar el video: '+text);
    phase='idle';display();
  }
  function finalize(result,seq){
    if(seq!==serial)return;
    const blob=result?.videoBlob||result?.blob;
    if(!(blob instanceof Blob)||blob.size<100){
      failure(Error('8th Wall no devolvió un video válido.'));
      return;
    }
    cleanupClip();
    clipBlob=blob;
    clipName=recordingFileName(routeId);
    clipUrl=URL.createObjectURL(blob);
    phase=apple?'readyToShare':'idle';
    try{
      downloadClip();
      note('Descarga de '+clipName+' iniciada ('+Math.round(blob.size/1024)+' KB).');
      say(apple
        ?'Video MP4 preparado. La descarga se solicitó; para añadirlo a Fotos, toca «Guardar video».'
        :'Video MP4 preparado. La descarga se inició: busca el archivo en Descargas del teléfono.');
    }catch(error){
      note('El navegador bloqueó la descarga automática: '+(error.message||error));
      phase='readyToShare';
      say('El video está preparado. Toca «Guardar video» para completar el guardado.');
    }
    display();
  }
  function start(){
    if(!ready||!installed||phase!=='idle')return;
    cleanupClip();
    const seq=++serial;
    phase='starting';display();
    try{
      window.XR8.MediaRecorder.recordVideo({
        onStart(){
          if(seq!==serial)return;
          phase='recording';display();
          note('Grabación MP4 iniciada');
          say('Grabando video AR. Toca «Detener» para guardar (máximo 60 s).');
        },
        onStop(){
          if(seq!==serial)return;
          phase='saving';display();
          say('Finalizando el video MP4…');
        },
        onVideoReady(result){finalize(result,seq);},
        onError(result){
          if(seq===serial)failure(result);
        }
      });
    }catch(error){failure(error);}
  }
  function stop(){
    if(phase!=='recording')return;
    phase='saving';display();
    say('Procesando video. Se descargará cuando esté listo…');
    try{window.XR8.MediaRecorder.stopRecording();}
    catch(error){failure(error);}
  }
  async function saveAgain(){
    if(!clipBlob||!clipUrl){
      phase='idle';display();return;
    }
    if(apple&&typeof navigator.share==='function'&&typeof File==='function'){
      try{
        const file=new File([clipBlob],clipName,{type:'video/mp4'});
        if(!navigator.canShare||navigator.canShare({files:[file]})){
          // Llamar a navigator.share DIRECTAMENTE desde el toque del
          // visitante es obligatorio en Safari y otros navegadores.
          await navigator.share({files:[file],title:'Video de mi recorrido WebAR'});
          note('Hoja de compartir abierta para '+clipName);
          phase='idle';display();
          return;
        }
      }catch(error){
        if(error.name==='AbortError'){
          // Conservamos el video si se cerró la hoja de compartir.
          say('Puedes tocar «Guardar video» otra vez para elegir dónde conservarlo.');
          return;
        }
        note('No se pudo compartir directamente: '+(error.message||error));
      }
    }
    try{
      downloadClip();
      say('Se solicitó nuevamente guardar '+clipName+'. Revisa Descargas/Archivos.');
      phase='idle';display();
    }catch(error){failure(error);}
  }
  button.addEventListener('click',()=>{
    if(phase==='readyToShare')saveAgain();
    else if(phase==='recording')stop();
    else if(phase==='idle')start();
  });
  window.addEventListener('pagehide',cleanupClip);
  display();
  return {installPipeline,setReady,getState:()=>phase};
}
