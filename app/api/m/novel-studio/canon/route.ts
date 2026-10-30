import { requireUser, requireMutation, database, readBoundedBody, json, failure, HubError } from '@/lib/hub/server';
import { d1ArchiveAdapter } from '@/modules/novel-studio/server/d1-adapter.mjs';
import { NovelError } from '@/modules/novel-studio/server/domain.mjs';
import { readArchive, executeCommand } from '@/modules/novel-studio/server/store.mjs';
import { requireGuardedFactCommit } from '@/modules/novel-approval/public-gate.mjs';
import { replayHistoricalCommit } from '@/modules/novel-approval/service.mjs';
export const dynamic = 'force-dynamic';
const MAX_REQUEST=4*1024*1024;
const dbAdapter=()=>d1ArchiveAdapter(database());
function problem(error:unknown){if(error instanceof NovelError)return json({error:error.message},error.status);return failure(error)}
export async function GET(req:Request){try{const user=requireUser(req);return json(await readArchive(dbAdapter(),user.userId))}catch(error){return problem(error)}}
export async function POST(req:Request){try{requireMutation(req);const user=requireUser(req);if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);let raw=await readBoundedBody(req,MAX_REQUEST),command:unknown;try{command=JSON.parse(new TextDecoder().decode(raw))}catch{throw new HubError('请求 JSON 无效。',400)}const historical=await replayHistoricalCommit(dbAdapter(),user.userId,command);if(historical)return json(historical);requireGuardedFactCommit(command);return json(await executeCommand(dbAdapter(),user.userId,command))}catch(error){return problem(error)}}
