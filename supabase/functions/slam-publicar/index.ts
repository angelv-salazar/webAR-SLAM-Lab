// Estudio SLAM: coordinator-only publication to public Supabase Storage.
// Public WebAR remains on GitHub Pages with the same route URL/QR.
// Auth: verify the user's JWT server-side and compare with project.created_by.
// Publication is an immutable snapshot. Manifest is updated last.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const ALLOWED_ORIGIN=Deno.env.get('STUDIO_ORIGIN')||'https://angelv-salazar.github.io';
const PUBLIC_BUCKET='slam-publicaciones';
const PRIVATE_BUCKET='slam-colaboraciones';
const cors={
  'Access-Control-Allow-Origin':ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Max-Age':'600',
  'Cache-Control':'no-store',
  'Vary':'Origin'
};
function send(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}
  });
}
function ensure(condition:unknown,msg:string):asserts condition{
  if(!condition)throw Error(msg);
}
function validId(value:unknown){
  return typeof value==='string' && /^id-[a-z0-9-]{8,60}$/.test(value);
}
function validUuid(value:unknown){
  return typeof value==='string' &&
   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function getAdmin(){
  const api=Deno.env.get('SUPABASE_URL');
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
  ensure(api && secret,'Servidor sin configuración de Storage');
  return createClient(api,secret,{auth:{
    autoRefreshToken:false,persistSession:false,detectSessionInUrl:false
  }});
}
function validPrivatePaths(e:Record<string,unknown>,pid:string){
  const stem=pid+'/'+e.user_id+'/'+e.source_entry_id+'/';
  return validUuid(e.user_id)&&validId(e.source_entry_id)&&
    e.model_path===stem+'model.glb' &&
    e.marker_print_path===stem+'print.png';
}
function checkBytes(blob:Blob,kind:'glb'|'png'){
  ensure(blob.size>0&&blob.size<=20*1024*1024,
    'Un recurso supera el límite de 20 MB o está vacío');
  return blob.slice(0,kind==='png'?8:4).arrayBuffer().then(buf=>{
    const n=new Uint8Array(buf);
    if(kind==='glb')ensure(String.fromCharCode(...n)==='glTF','El GLB guardado no es válido');
    else ensure(n.length===8&&n[0]===137&&n[1]===80&&n[2]===78&&
        n[3]===71&&n[4]===13&&n[5]===10&&n[6]===26&&n[7]===10,
      'La imagen del marcador no es PNG');
  });
}
const srcOrigin=Deno.env.get('STUDIO_VIEWER_URL')||'https://angelv-salazar.github.io/webAR-SLAM-Lab/recorrido.html';
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return send({error:'Método no admitido'},405);
  if(req.headers.get('origin')!==ALLOWED_ORIGIN)
    return send({error:'Origen no admitido'},403);

  const bearer=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!bearer)return send({error:'Ingresá con tu correo de coordinación'},401);
  let publicPaths:string[]=[];
  let admin:ReturnType<typeof getAdmin>|null=null;
  try{
    const body=await req.json();
    const projectId=body?.projectId;
    if(!validUuid(projectId))return send({error:'Recorrido no válido'},400);
    admin=getAdmin();

    // Authentication is checked on every request, never trust frontend role.
    const auth=await admin.auth.getUser(bearer);
    if(auth.error||!auth.data?.user)
      return send({error:'Sesión de coordinación vencida; ingresá nuevamente'},401);
    const user=auth.data.user;
    if(user.is_anonymous || !user.email || !user.email_confirmed_at)
      return send({error:'Solo un coordinador con correo verificado puede publicar'},403);

    const projectR=await admin.from('slam_projects')
      .select('id,title,description,route_id,created_by,state').eq('id',projectId).single();
    if(projectR.error||!projectR.data)
      return send({error:'No se encontró el recorrido'},404);
    const project=projectR.data;
    if(project.created_by!==user.id)
      return send({error:'Solo la persona coordinadora puede publicar'},403);
    ensure(validId(project.route_id),'Identificador del recorrido inválido');

    const rowsR=await admin.from('slam_entries')
      .select('id,user_id,source_entry_id,title,description,model_path,marker_print_path,x_cm,y_cm,z_cm,size_cm,rotation_deg,rotation_vertical_deg,animation')
      .eq('project_id',projectId).order('source_entry_id',{ascending:true});
    if(rowsR.error)throw Error('No se pudieron consultar las obras guardadas');
    const entries=rowsR.data||[];
    if(entries.length<1||entries.length>20)
      return send({error:'Se necesita entre 1 y 20 obras guardadas para publicar'},400);
    // A previous editor version could insert duplicate marker identities.
    // Never publish more than one sculpture for the same source marker.
    if(new Set(entries.map(e=>e.source_entry_id)).size!==entries.length)
      return send({error:'Hay marcadores duplicados. El coordinador debe revisar y retirar las copias antes de publicar.'},409);
    for(const e of entries)
      ensure(validPrivatePaths(e,projectId),'Una obra tiene rutas privadas inválidas');

    // Freeze submissions for a coherent snapshot. The organizer can reopen,
    // edit and republish later (previous public snapshot remains available).
    if(project.state!=='locked'){
      const locked=await admin.from('slam_projects').update({state:'locked'})
        .eq('id',projectId).eq('created_by',user.id).select('id').single();
      ensure(!locked.error&&locked.data,'No se pudieron cerrar las aportaciones');
    }

    const publishedAt=new Date().toISOString();
    const version='v'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,8);
    const prefix=project.route_id+'/'+version+'/';
    const rows=[];
    const privateFiles=admin.storage.from(PRIVATE_BUCKET);
    const publicFiles=admin.storage.from(PUBLIC_BUCKET);

    for(let i=0;i<entries.length;i++){
      const e=entries[i];
      const suffix=String(i+1).padStart(2,'0');
      const saved=await Promise.all([
        privateFiles.download(e.model_path),
        privateFiles.download(e.marker_print_path)
      ]);
      ensure(!saved[0].error&&!saved[1].error&&saved[0].data&&saved[1].data,
        'Faltan archivos de '+e.title+'; verificá que estén guardados en la nube');
      const [glb,png]=[saved[0].data!,saved[1].data!];
      await Promise.all([checkBytes(glb,'glb'),checkBytes(png,'png')]);
      const modelName=version+'/modelos/marcador-'+suffix+'-'+e.source_entry_id+'.glb';
      const printName=version+'/imprimir/marcador-'+suffix+'-'+e.source_entry_id+'-15cm.png';

      // No upsert on immutable versions: readers of earlier manifests remain safe.
      const modelR=await publicFiles.upload(project.route_id+'/'+modelName,glb,{
        upsert:false,contentType:'model/gltf-binary',cacheControl:'31536000'
      });
      ensure(!modelR.error,'No se pudo publicar el GLB de '+e.title);
      publicPaths.push(project.route_id+'/'+modelName);
      const printR=await publicFiles.upload(project.route_id+'/'+printName,png,{
        upsert:false,contentType:'image/png',cacheControl:'31536000'
      });
      ensure(!printR.error,'No se pudo publicar el marcador de '+e.title);
      publicPaths.push(project.route_id+'/'+printName);
      rows.push({
        id:e.source_entry_id,
        title:String(e.title||'Marcador').slice(0,100),
        description:String(e.description||'').slice(0,500),
        imageTargetName:'slam-'+suffix+'-'+e.source_entry_id,
        model:modelName,print:printName,
        xCm:e.x_cm,yCm:e.y_cm,zCm:e.z_cm,sizeCm:e.size_cm,
        rotationDeg:e.rotation_deg,verticalRotationDeg:e.rotation_vertical_deg,
        animation:e.animation||'none'
      });
    }

    const manifest={
      format:'estudio-slam-cloud-v1',
      id:project.route_id,
      name:project.title,
      description:String(project.description||'').slice(0,500),physicalSizeCm:15,engine:'8thwall-slam',
      publishedAt,
      items:rows
    };
    const manifestPath=project.route_id+'/manifest.json';
    const manifestBlob=new Blob([JSON.stringify(manifest,null,2)],{
      type:'application/json'
    });
    // Last step: readers only observe a complete snapshot.
    const published=await publicFiles.upload(manifestPath,manifestBlob,{
      upsert:true,contentType:'application/json',cacheControl:'0'
    });
    ensure(!published.error,'Los archivos se copiaron, pero no se activó la publicación');

    return send({
      ok:true,format:manifest.format,routeId:project.route_id,
      url:srcOrigin+'?id='+encodeURIComponent(project.route_id),
      publishedAt,count:rows.length,
      manifest
    });
  }catch(error){
    const detail=error instanceof Error?error.message:'Error inesperado';
    console.error('slam-publish',detail);
    // A failed upload cannot point visitors to incomplete assets; old manifest
    // remains unchanged. Clean only newly staged immutable files if possible.
    if(admin && publicPaths.length){
      try{await admin.storage.from(PUBLIC_BUCKET).remove(publicPaths)}
      catch{ /* no effect on existing public snapshot */ }
    }
    const safe=/^(Un recurso|El GLB|La imagen|Una obra|Faltan archivos|No se pudieron|Los archivos|No se pudo publicar|No se pudieron cerrar|Identificador)/.test(detail)
      ?detail:'La publicación no se completó. Revisá las obras e intentá nuevamente.';
    return send({error:safe},500);
  }
});
