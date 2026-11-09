// Estudio SLAM: individual, temporary AR preview.
// The bearer token authorizes access to exactly one saved contribution.
// No secret key is returned to the browser. Access tokens are hashed in Postgres.
import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

const allowOrigin=Deno.env.get('STUDIO_ORIGIN')||'https://angelv-salazar.github.io';
const cors={
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Max-Age':'600',
  'Cache-Control':'no-store',
  'Vary':'Origin',
  'Referrer-Policy':'no-referrer'
};
function response(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}
  });
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return response({error:'Método no admitido'},405);
  const origin=req.headers.get('origin');
  if(origin!==allowOrigin)return response({error:'Origen no autorizado'},403);
  try{
    const body=await req.json();
    const token=typeof body?.token==='string'?body.token:'';
    const routeId=typeof body?.routeId==='string'?body.routeId:'';
    if(!/^[0-9a-f]{64,128}$/.test(token) || !/^id-[a-z0-9-]{8,60}$/.test(routeId))
      return response({error:'Enlace de prueba inválido'},400);
    const serverUrl=Deno.env.get('SUPABASE_URL');
    const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||
      JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
    if(!serverUrl||!key)throw Error('Service configuration missing');
    const admin=createClient(serverUrl,key,{auth:{
      autoRefreshToken:false,persistSession:false,detectSessionInUrl:false
    }});
    const {data,error}=await admin.rpc('slam_resolve_preview_link',{p_token:token});
    if(error)throw Error('Preview resolution failed');
    if(!data || data.routeId!==routeId)
      return response({error:'Este enlace de prueba venció o fue reemplazado. Genera otro desde Estudio SLAM.'},404);

    const validBase=String(data.projectId||'');
    const entry=String(data.sourceEntryId||'');
    const modelPath=String(data.modelPath||'');
    const printPath=String(data.printPath||'');
    const suffix='/'+entry+'/';
    // Storage paths come from server-validated slam_entries constraints.
    if(!modelPath.endsWith(suffix+'model.glb') ||
       !printPath.endsWith(suffix+'print.png') ||
       modelPath.slice(0,-'model.glb'.length)!==printPath.slice(0,-'print.png'.length))
      throw Error('Corrupt contribution paths');

    const storage=admin.storage.from('slam-colaboraciones');
    const [model,print]=await Promise.all([
      storage.createSignedUrl(modelPath,3600),
      storage.createSignedUrl(printPath,3600)
    ]);
    if(model.error||print.error||!model.data?.signedUrl||!print.data?.signedUrl)
      throw Error('Unable to sign private assets');

    return response({
      format:'estudio-slam-individual-v1',id:data.routeId,
      name:data.projectName,expiresAt:data.expiresAt,
      item:{
        id:data.sourceEntryId,
        title:data.title,description:data.description||'',
        modelUrl:model.data.signedUrl,printUrl:print.data.signedUrl,
        xCm:data.xCm,yCm:data.yCm,zCm:data.zCm,sizeCm:data.sizeCm,
        rotationDeg:data.rotationDeg,verticalRotationDeg:data.verticalRotationDeg,
        animation:data.animation||'none'
      }
    });
  }catch(error){
    // Avoid logging or returning tokens, file paths, and admin details.
    console.error('slam-preview failed',error instanceof Error?error.message:'request failed');
    return response({error:'No se pudo preparar la prueba AR. Vuelve a intentar o genera otro enlace.'},500);
  }
});
