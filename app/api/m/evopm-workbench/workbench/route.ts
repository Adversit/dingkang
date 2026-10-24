import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { applyAction, DomainError, emptyState, requestSchema, sha256 } from '@/modules/evopm-workbench/lib/domain';
import { configuredConnections, createAnalyzer, type ProviderEnv } from '@/modules/evopm-workbench/lib/providers';
import type { Snapshot, State } from '@/modules/evopm-workbench/lib/contracts';

export const dynamic='force-dynamic';
const MAX_BODY=512*1024;
const HEADERS={'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'};
type Row={state_json:string;revision:number};
type Receipt={request_hash:string;revision:number;result_json:string};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:HEADERS});}
function database():D1Database {
  if(!env.DB)throw new DomainError('数据库尚未连接，请完成工作台数据库配置',503);
  return env.DB;
}
function providerEnv():ProviderEnv {
  // Cloudflare bindings are authoritative. Process env supports local deployment checks.
  const values=env as unknown as Record<string,unknown>;
  const result:ProviderEnv={};
  for(const key of ['ENGINE_URL','ENGINE_API_KEY','OPENAI_API_KEY','OPENAI_BASE_URL','OPENAI_MODEL'] as const){
    const value=values[key]??(typeof process!=='undefined'?process.env[key]:undefined);
    if(typeof value==='string'&&value.trim())result[key]=value.trim();
  }
  return result;
}
async function read(db:D1Database,owner:string):Promise<{state:State;revision:number}> {
  const row=await db.prepare('SELECT state_json, revision FROM evopm_workbench__workspaces WHERE owner_id = ?').bind(owner).first<Row>();
  if(!row)return {state:emptyState(),revision:0};
  return {state:JSON.parse(row.state_json) as State,revision:row.revision};
}
function snapshot(data:{state:State;revision:number},name:string,config:ProviderEnv):Snapshot {
  return {...data,user:{name},connections:configuredConnections(config)};
}
function errorResponse(error:unknown){
  if(error instanceof DomainError)return json({error:error.message},error.status);
  // Do not expose SQL, internal URLs, request credentials, or stack traces.
  console.error('workbench request failed',error instanceof Error?error.name:'unknown');
  return json({error:'工作台服务暂时不可用，请稍后重试；未确认的操作不会显示为成功'},503);
}
async function body(request:Request):Promise<unknown>{
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new DomainError('请求须使用 application/json',415);
  if(Number(request.headers.get('content-length')??0)>MAX_BODY)throw new DomainError('请求超过 512 KB 上限',413);
  if(!request.body)throw new DomainError('请求正文为空',400);
  const reader=request.body.getReader(),decoder=new TextDecoder();let raw='',size=0;
  try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new DomainError('请求超过 512 KB 上限',413);}raw+=decoder.decode(chunk.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
  try{return JSON.parse(raw);}catch{throw new DomainError('请求正文不是有效 JSON',400);}
}
function checkOrigin(request:Request){
  const origin=request.headers.get('origin');
  // Browser mutations require an exact same-origin Origin. No CORS writes.
  if(!origin||origin!==new URL(request.url).origin)throw new DomainError('只接受当前站点的同源操作请求',403);
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='none')throw new DomainError('跨站操作已被拒绝',403);
}
export async function GET(){
  try{
    const user=await getChatGPTUser();if(!user)return json({error:'请先使用 ChatGPT 登录再进入你的工作台'},401);
    return json(snapshot(await read(database(),user.userId),user.displayName,providerEnv()));
  }catch(error){return errorResponse(error);}
}
export async function POST(request:Request){
  let releaseLease:(()=>Promise<unknown>)|undefined;
  try{
    checkOrigin(request);
    const user=await getChatGPTUser();if(!user)return json({error:'登录已失效，请重新使用 ChatGPT 登录'},401);
    const parsed=requestSchema.safeParse(await body(request));
    if(!parsed.success)throw new DomainError(parsed.error.issues.slice(0,3).map(i=>`${i.path.join('.')}: ${i.message}`).join('；'),400);
    const {revision,requestId,action}=parsed.data;
    const db=database(),owner=user.userId,config=providerEnv();
    const requestHash=await sha256(JSON.stringify(action));
    async function receipt(){return db.prepare('SELECT request_hash, revision, result_json FROM evopm_workbench__action_receipts WHERE owner_id = ? AND request_id = ?').bind(owner,requestId).first<Receipt>();}
    async function repeated(found:Receipt){
      if(found.request_hash!==requestHash)throw new DomainError('此请求 ID 已用于不同操作，请刷新后重试',409);
      const saved=JSON.parse(found.result_json) as {result?:unknown;notice?:string};
      return json({...snapshot(await read(db,owner),user!.displayName,config),...saved});
    }
    const previous=await receipt();if(previous)return await repeated(previous);
    const current=await read(db,owner);
    if(current.revision!==revision)throw new DomainError('工作台已在其他窗口更新，请刷新后重试；你的操作未覆盖新数据',409);
    if(action.type==='run.analyze'){
      const token=crypto.randomUUID(),nowMs=Date.now();
      const claim=await db.prepare('INSERT INTO evopm_workbench__analysis_leases (owner_id, request_id, token, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(owner_id, request_id) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at WHERE evopm_workbench__analysis_leases.expires_at < ?').bind(owner,requestId,token,nowMs+90000,nowMs).run();
      if(claim.meta.changes!==1)throw new DomainError('这个分析请求正在处理，请等待完成后刷新；未重复调用模型',409);
      releaseLease=()=>db.prepare('DELETE FROM evopm_workbench__analysis_leases WHERE owner_id = ? AND request_id = ? AND token = ?').bind(owner,requestId,token).run();
      const finished=await receipt();if(finished)return await repeated(finished);
    }
    const transition=await applyAction(current.state,action,{actor:user.displayName,analyze:createAnalyzer(config)});
    const saved=JSON.stringify({result:transition.result,notice:transition.notice});
    if(new TextEncoder().encode(saved).byteLength>1_800_000)throw new DomainError('本次操作回执超过数据库容量上限；请减少单次导出的范围',413);
    const now=new Date().toISOString();
    // D1 batch runs transactionally. changes() is scoped to the immediately preceding
    // guarded UPDATE, so a stale writer cannot insert a successful action receipt.
    try{
      await db.batch([
        db.prepare('INSERT INTO evopm_workbench__workspaces (owner_id, state_json, revision, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,JSON.stringify(emptyState()),now),
        db.prepare('UPDATE evopm_workbench__workspaces SET state_json = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ?').bind(JSON.stringify(transition.state),now,owner,revision),
        db.prepare('INSERT INTO evopm_workbench__action_receipts (owner_id, request_id, request_hash, revision, result_json, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE changes() = 1').bind(owner,requestId,requestHash,revision+1,saved,now),
      ]);
    }catch(error){
      // A duplicate request racing with this transaction may have already committed.
      const raced=await receipt();if(raced)return await repeated(raced);
      throw error;
    }
    const committed=await receipt();
    if(!committed)throw new DomainError('操作与其他更新发生冲突，请刷新重试；未覆盖其他更新',409);
    return await repeated(committed);
  }catch(error){return errorResponse(error);}
  finally{if(releaseLease){try{await releaseLease();}catch{console.error('analysis lease cleanup deferred to expiry');}}}
}
