// Estudio SLAM: coordinator-only permanent deletion of an entire collective.
// The user's verified JWT, project creator identity, and exact project title
// are verified server-side before touching data. Never expose secret keys.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const ORIGIN=Deno.env.get('STUDIO_ORIGIN')||'https://angelv-salazar.github.io';
const PRIVATE='slam-colaboraciones';
const PUBLIC='slam-publicaciones';
const headers={
  'Access-Control-Allow-Origin':ORIGIN,
  'Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Max-Age':'600',
  'Cache-Control':'no-store',
  'Vary':'Origin'
};
function reply(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}
  });
}
function fail(message:string){throw new Error(message)}
function uuid(x:unknown):x is string{
  return typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
}
function getServer(){
  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
  if(!url||!key)fail('No se pudo acceder a Storage');
  return createClient(url!,key!,{auth:{
    autoRefreshToken:false,persistSession:false,detectSessionInUrl:false
  }});
}
type StorageClient=ReturnType<typeof getServer>;
async function collectAll(admin:StorageClient,bucketName:string,root:string){
  const bucket=admin.storage.from(bucketName);
  const output:string[]=[];
  const folderQueue:[string,number][]=[[root,0]];
  while(folderQueue.length){
    const [prefix,depth]=folderQueue.shift()!;
    if(depth>8)fail('La carpeta contiene demasiados niveles; revisala antes de borrar');
    for(let offset=0;offset<50000;offset+=1000){
      const {data,error}=await bucket.list(prefix,{
        limit:1000,offset,sortBy:{column:'name',order:'asc'}
      });
      if(error)fail('No se pudieron consultar los archivos en '+bucketName);
      const items=data||[];
      for(const item of items){
        if(!item.name||item.name==='.'||item.name==='..'||
           item.name.includes('/')||item.name.includes('\\'))
          fail('Nombre de archivo no admitido en Storage');
        const child=prefix+'/'+item.name;
        if(item.id){
          output.push(child);
        }else{
          folderQueue.push([child,depth+1]);
        }
      }
      if(output.length+folderQueue.length>20000)
        fail('Hay demasiados archivos; es necesario revisar el recorrido');
      if(items.length<1000)break;
      if(offset>=49000)fail('Demasiadas entradas en una carpeta');
    }
  }
  return output;
}
async function deleteFiles(admin:StorageClient,bucketName:string,paths:string[]){
  const bucket=admin.storage.from(bucketName);
  for(let i=0;i<paths.length;i+=100){
    const result=await bucket.remove(paths.slice(i,i+100));
    if(result.error)fail('No se pudieron eliminar todos los archivos de '+bucketName);
  }
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'Método no admitido'},405);
  if(req.headers.get('origin')!==ORIGIN)
    return reply({error:'Origen no permitido'},403);
  const bearer=req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!bearer)return reply({error:'Inicia sesión como coordinador'},401);

  try{
    const body=await req.json();
    const projectId=body?.projectId;
    const typedTitle=body?.confirmTitle;
    if(!uuid(projectId)||typeof typedTitle!=='string'||typedTitle.length>100)
      return reply({error:'Datos de confirmación inválidos'},400);
    const admin=getServer();

    const auth=await admin.auth.getUser(bearer);
    const user=auth.data?.user;
    if(auth.error||!user||user.is_anonymous||!user.email||
       !user.email_confirmed_at)
      return reply({error:'Se requiere un correo de coordinación verificado'},403);

    const projectResult=await admin.from('slam_projects')
      .select('id,title,created_by,route_id')
      .eq('id',projectId).maybeSingle();
    if(projectResult.error)fail('No se pudo verificar el recorrido');
    const project=projectResult.data;
    if(!project)return reply({error:'El recorrido ya no existe'},404);
    if(project.created_by!==user.id)
      return reply({error:'Solo el coordinador propietario puede eliminarlo'},403);
    if(typedTitle!==project.title)
      return reply({error:'El nombre de confirmación no coincide exactamente'},400);
    if(!/^id-[a-z0-9-]{8,60}$/.test(project.route_id))
      fail('Identificador del recorrido inválido');

    // Read both complete object trees BEFORE deleting anything. This catches
    // read/API errors while the project is still intact.
    const privateFiles=await collectAll(admin,PRIVATE,projectId);
    const publicFiles=await collectAll(admin,PUBLIC,project.route_id);

    // Remove the public entry point first so new visitors cannot load the
    // route while assets are being removed. Then remove every version.
    const manifest=project.route_id+'/manifest.json';
    if(publicFiles.includes(manifest))await deleteFiles(admin,PUBLIC,[manifest]);
    await deleteFiles(admin,PUBLIC,publicFiles.filter(p=>p!==manifest));
    await deleteFiles(admin,PRIVATE,privateFiles);

    // Cascade deletes memberships, entries, invitations and preview tokens.
    const removed=await admin.from('slam_projects').delete()
      .eq('id',projectId).eq('created_by',user.id)
      .select('id').single();
    if(removed.error||!removed.data)fail('Archivos eliminados, pero no se pudo borrar el registro del recorrido');

    return reply({
      ok:true,deletedProjectId:projectId,
      deletedRouteId:project.route_id,
      removedFiles:privateFiles.length+publicFiles.length
    });
  }catch(error){
    // Never log JWTs, files or response tokens.
    const message=error instanceof Error?error.message:'Error inesperado';
    console.error('slam-borrar-recorrido',message);
    const safe=/^(No se pudieron|Hay demasiados|Nombre de archivo|La carpeta|Identificador del recorrido|Archivos eliminados)/.test(message)
      ?message
      :'No se completó la eliminación. Revisa el estado del recorrido e intenta de nuevo.';
    return reply({error:safe},500);
  }
});
