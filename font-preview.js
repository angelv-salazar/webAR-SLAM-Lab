/**
 * Prueba LOCAL de Klavika en Estudio SLAM.
 *
 * Carga las fuentes OTF elegidas por la persona directamente en su navegador
 * mediante JSZip y FontFace. Guarda el ZIP descomprimido exclusivamente en
 * IndexedDB del dispositivo. No sube ni transmite fuentes a GitHub.
 *
 * Klavika es comercial: para publicar fuentes en GitHub Pages se requiere
 * una licencia de webfont y archivos autorizados para esa distribución.
 */
const DB_NAME='estudio-slam-klavika-local-preview';
const DB_STORE='preferences';
const FAMILY='Klavika local preview';
const MAX_ARCHIVE_BYTES=8*1024*1024;
const MAX_FONT_BYTES=1024*1024;
const FACE_MAP=[
  {file:'klavika-light.otf',weight:'300',style:'normal'},
  {file:'klavika-medium.otf',weight:'400',style:'normal'},
  {file:'klavika-medium.otf',weight:'500',style:'normal'},
  {file:'klavika-bold.otf',weight:'700',style:'normal'},
  {file:'klavika-light-italic.otf',weight:'300',style:'italic'},
  {file:'klavika-regular-italic.otf',weight:'400',style:'italic'},
  {file:'klavika-medium-italic.otf',weight:'500',style:'italic'},
  {file:'klavika-bold-italic.otf',weight:'700',style:'italic'}
];
let loadedFaces=[];
function fontDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(DB_STORE))
        req.result.createObjectStore(DB_STORE,{keyPath:'key'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('No se puede abrir el almacenamiento de fuentes.'));
  });
}
async function localGet(key){
  const db=await fontDb();
  try{return await new Promise((resolve,reject)=>{
    const req=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });}finally{db.close();}
}
async function localSet(record){
  const db=await fontDb();
  try{return await new Promise((resolve,reject)=>{
    const req=db.transaction(DB_STORE,'readwrite').objectStore(DB_STORE).put(record);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });}finally{db.close();}
}
function findFontAssets(zip){
  const result=[];
  for(const face of FACE_MAP){
    if(result.some(x=>x.name===face.file))continue;
    const match=Object.entries(zip.files).find(([path,entry])=>
      !entry.dir&&path.split('/').pop().toLowerCase()===face.file
    );
    if(match)result.push({name:face.file,entry:match[1]});
  }
  return result;
}
export async function readKlavikaZip(file,JSZip){
  if(!file||file.size>MAX_ARCHIVE_BYTES)throw Error('El ZIP debe pesar menos de 8 MB.');
  if(!JSZip?.loadAsync)throw Error('No está disponible el lector ZIP.');
  const archive=await JSZip.loadAsync(file);
  const assets=findFontAssets(archive);
  if(!['klavika-medium.otf','klavika-light.otf','klavika-bold.otf']
      .every(name=>assets.some(x=>x.name===name)))
    throw Error('El ZIP debe contener al menos Klavika Light, Medium y Bold.');
  const data=[];
  for(const {name,entry} of assets){
    const bytes=await entry.async('arraybuffer');
    if(bytes.byteLength<1000||bytes.byteLength>MAX_FONT_BYTES)
      throw Error('El tamaño del archivo de fuente no es válido: '+name);
    data.push({name,bytes});
  }
  return data;
}
export async function loadLocalKlavika(assets){
  if(typeof FontFace!=='function'||!document.fonts)
    throw Error('Este navegador no admite la carga local de tipografías.');
  const byName=new Map((assets||[]).map(x=>[x.name,x.bytes]));
  const fresh=[];
  for(const face of FACE_MAP){
    const bytes=byName.get(face.file);
    if(!bytes)continue;
    const f=new FontFace(FAMILY,bytes,{weight:face.weight,style:face.style});
    await f.load();
    fresh.push(f);
  }
  if(!fresh.some(f=>f.weight==='400'&&f.style==='normal'))
    throw Error('No se encontró el estilo principal de Klavika.');
  for(const f of loadedFaces)document.fonts.delete(f);
  loadedFaces=fresh;
  for(const f of fresh)document.fonts.add(f);
  document.body.classList.add('font-klavika');
  return fresh.length;
}
export function setupKlavikaPreview({input,restore,status}){
  const say=(message,error=false)=>{
    status.textContent=message;
    status.dataset.error=String(error);
  };
  restore.disabled=true;
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];
    if(!file)return;
    input.disabled=true;
    try{
      const assets=await readKlavikaZip(file,window.JSZip);
      const count=await loadLocalKlavika(assets);
      restore.disabled=false;
      say('Klavika aplicada ('+count+' estilos). Solo en este navegador.');
      try{
        await localSet({key:'assets',value:assets});
        await localSet({key:'enabled',value:true});
        say('Klavika aplicada. Quedó guardada para próximas visitas en este navegador.');
      }catch(error){
        say('Klavika aplicada temporalmente; el navegador no pudo guardar la preferencia.');
      }
    }catch(error){
      say('No se pudo cargar Klavika: '+(error?.message||error),true);
    }finally{
      input.disabled=false;
      input.value='';
    }
  });
  restore.addEventListener('click',async()=>{
    document.body.classList.remove('font-klavika');
    restore.disabled=true;
    say('Se restauró la tipografía original del Estudio.');
    try{await localSet({key:'enabled',value:false});}
    catch(error){say('Tipografía restaurada; la preferencia no se pudo guardar.');}
  });
  // La prueba es local: no es necesario volver a seleccionar el archivo
  // mientras siga guardado y habilitado en este navegador.
  (async()=>{
    try{
      const flag=await localGet('enabled');
      if(!flag?.value)return;
      const assets=await localGet('assets');
      if(!assets?.value?.length)return;
      await loadLocalKlavika(assets.value);
      restore.disabled=false;
      say('Klavika está activa en este navegador.');
    }catch(error){
      say('Para probar Klavika, selecciona el ZIP en este dispositivo.');
    }
  })();
}
