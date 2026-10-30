import { requireUser, requireMutation, database, readBoundedBody, json, failure, HubError } from '@/lib/hub/server';
import { d1ArchiveAdapter } from '@/modules/novel-studio/server/d1-adapter.mjs';
import { NovelError } from '@/modules/novel-studio/server/domain.mjs';
import { executeGuarded } from '@/modules/novel-approval/service.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  try {
    requireMutation(req);const user=requireUser(req);
    if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);
    const bytes=await readBoundedBody(req,64*1024);let input:unknown;
    try{input=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new HubError('请求 JSON 格式错误。',400)}
    return json(await executeGuarded(d1ArchiveAdapter(database()),user.userId,input));
  }catch(error){if(error instanceof NovelError)return json({error:error.message},error.status);return failure(error)}
}
