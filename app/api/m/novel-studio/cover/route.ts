import { requireUser, requireMutation, bucket, readBoundedBody, HubError, failure, json } from '@/lib/hub/server';
import { archiveFor, inputFor, problem } from '@/modules/novel-ai/route-support';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { listProviderModels, ModelListError } from '@/modules/novel-ai/models-list.mjs';
import { CoverError, MAX_BYTES, coverKey, projectId, saveCover, generateCover } from '@/modules/novel-cover/core.mjs';
export const dynamic='force-dynamic';
async function target(owner:string,req:Request){
  const id=projectId(new URL(req.url).searchParams.get('project'));
  const archive=await archiveFor(owner);
  if(!archive.state.projects.some((p:{id:string})=>p.id===id))throw new HubError('找不到这部作品。',404);
  return coverKey(owner,id);
}
function coverProblem(e:unknown){if(e instanceof CoverError||e instanceof ModelListError)return json({error:e.message},e.status);if(e instanceof HubError)return failure(e);return problem(e)}
export async function GET(req:Request){try{
  const owner=requireUser(req).userId,key=await target(owner,req),r2=bucket();
  if(new URL(req.url).searchParams.get('meta')==='1'){const o=await r2.head(key);return json(o?{exists:true,etag:o.httpEtag,size:o.size}:{exists:false,etag:'none'});}
  const o=await r2.get(key);if(!o)throw new HubError('还没有为这本书设置封面。',404);
  return new Response(o.body,{headers:{'Content-Type':o.httpMetadata?.contentType||'application/octet-stream','Content-Length':String(o.size),ETag:o.httpEtag,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
}catch(e){return coverProblem(e)}}
export async function PUT(req:Request){try{
  requireMutation(req);const owner=requireUser(req).userId,key=await target(owner,req);
  const bytes=await readBoundedBody(req,MAX_BYTES);
  const result=await saveCover(bucket(),key,bytes,req.headers.get('content-type'),req.headers.get('x-cover-version'));
  return json({exists:true,...result});
}catch(e){return coverProblem(e)}}
export async function POST(req:Request){try{
  const {owner,input}=await inputFor(req);await target(owner,req);
  if(!input||typeof input!=='object'||Array.isArray(input))throw new HubError('封面请求格式无效。');
  const {model,prompt} = input as {model?:unknown;prompt?:unknown};
  const before=await getNovelKeyBinding(owner),list=await listProviderModels(before.key);
  const after=await getNovelKeyBinding(owner);if(before.source!==after.source||before.revision!==after.revision||before.key!==after.key)throw new HubError('模型连接已变化。请刷新后重新选择。',409);
  const bytes=await generateCover({key:before.key,model,prompt,models:list.models});
  return new Response(new Blob([new Uint8Array(bytes)],{type:'image/jpeg'}),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return coverProblem(e)}}
