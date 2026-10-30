import { requireUser, requireMutation, database, readBoundedBody, json, failure, HubError } from '@/lib/hub/server';
import { NovelError } from '@/modules/novel-studio/server/domain.mjs';
import { readArchive, executeCommand } from '@/modules/novel-studio/server/store.mjs';
export const dynamic = 'force-dynamic';
const MAX_REQUEST=4*1024*1024;
const dbAdapter=()=>{
  const db=database();
  return {
    async load(owner:string){return await db.prepare('SELECT version, state_json FROM novel_canon_states WHERE owner_id = ?').bind(owner).first<{version:number;state_json:string}>()},
    async compareAndSwap(owner:string,version:number,state:string,now:string){
      // One conditional SQL mutation stores the state, version and receipt together.
      const result=version===0
        ? await db.prepare('INSERT INTO novel_canon_states (owner_id, state_json, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,state,now).run()
        : await db.prepare('UPDATE novel_canon_states SET state_json = ?, version = version + 1, updated_at = ? WHERE owner_id = ? AND version = ?').bind(state,now,owner,version).run();
      return result.meta.changes===1;
    }
  };
};
function problem(error:unknown){if(error instanceof NovelError)return json({error:error.message},error.status);return failure(error)}
export async function GET(req:Request){try{const user=requireUser(req);return json(await readArchive(dbAdapter(),user.userId))}catch(error){return problem(error)}}
export async function POST(req:Request){try{requireMutation(req);const user=requireUser(req);if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);let raw=await readBoundedBody(req,MAX_REQUEST),command:unknown;try{command=JSON.parse(new TextDecoder().decode(raw))}catch{throw new HubError('请求 JSON 无效。',400)}return json(await executeCommand(dbAdapter(),user.userId,command))}catch(error){return problem(error)}}
