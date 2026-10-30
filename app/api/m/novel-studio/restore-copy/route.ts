import { requireUser, requireMutation, database, readBoundedBody, json, failure, HubError } from '@/lib/hub/server';
import { d1ArchiveAdapter } from '@/modules/novel-studio/server/d1-adapter.mjs';
import { NovelError } from '@/modules/novel-studio/server/domain.mjs';
import { previewRestore, restoreCopy } from '@/modules/novel-studio/server/restore-copy.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  try{
    requireMutation(req);const user=requireUser(req);
    if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);
    const bytes=await readBoundedBody(req,8*1024*1024);let input:any;
    try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new HubError('备份 JSON 格式或编码无效。',400)}
    const adapter=d1ArchiveAdapter(database());
    if(input?.action==='preview')return json(await previewRestore(adapter,user.userId,input));
    if(input?.action==='restore')return json(await restoreCopy(adapter,user.userId,input));
    throw new HubError('请选择预览或恢复。',422);
  }catch(error){if(error instanceof NovelError)return json({error:error.message},error.status);return failure(error)}
}
