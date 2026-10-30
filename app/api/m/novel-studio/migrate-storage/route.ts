import { requireUser, requireMutation, database, readBoundedBody, json, failure, HubError } from '@/lib/hub/server';
import { NovelError } from '@/modules/novel-studio/server/domain.mjs';
import { readArchive } from '@/modules/novel-studio/server/store.mjs';
import { migrateToExpanded, d1ArchiveAdapter } from '@/modules/novel-studio/server/d1-adapter.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
  try {
    requireMutation(req); const user=requireUser(req);
    if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);
    const bytes=await readBoundedBody(req,4096);let body:unknown;
    try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new HubError('请求 JSON 无效。',400)}
    if(!body||typeof body!=='object'||Array.isArray(body)||!Number.isSafeInteger((body as Record<string,unknown>).expectedVersion))throw new HubError('请提供当前档案版本。',422);
    const db=database();await migrateToExpanded(db,user.userId,(body as {expectedVersion:number}).expectedVersion);
    return json(await readArchive(d1ArchiveAdapter(db),user.userId));
  } catch(error){if(error instanceof NovelError)return json({error:error.message},error.status);return failure(error)}
}
