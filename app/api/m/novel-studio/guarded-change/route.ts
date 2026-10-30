import { requireUser,requireMutation,database,readBoundedBody,json,failure,HubError } from '@/lib/hub/server';
import { d1ArchiveAdapter } from '@/modules/novel-studio/server/d1-adapter.mjs';
import { NovelError } from '@/modules/novel-studio/server/domain.mjs';
import { executeGuardedChange } from '@/modules/novel-approval/change-service.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{requireMutation(req);const user=requireUser(req);if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);const raw=await readBoundedBody(req,128*1024);let data:unknown;try{data=JSON.parse(new TextDecoder().decode(raw))}catch{throw new HubError('请求 JSON 格式错误。',400)}return json(await executeGuardedChange(d1ArchiveAdapter(database()),user.userId,data))}catch(e){if(e instanceof NovelError)return json({error:e.message},e.status);return failure(e)}}
