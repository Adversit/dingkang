/** Guarded fact approval service. It operates on the same archive CAS as canon;
 * reports are constructed here, never accepted from the requester. */
import { applyGuardedFactCommand, NovelError } from '../novel-studio/server/domain.mjs';
import { sealProposal, sealBundle, approveProposal, verifyCommit, ApprovalError } from './index.mjs';
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const PROFILE=Object.freeze({id:'fact-limited',version:'1',requiredChecks:['STRUCTURE','EVIDENCE','SOURCE_VERSION','SEMANTIC'],protectedChecks:['STRUCTURE','EVIDENCE','SOURCE_VERSION'],waivableKinds:['SEMANTIC_NOT_CHECKED']});
const RULE='fact-limited-v1', POLICY='manual-owner-v1';
const err=(message,status=422)=>{throw new NovelError(message,status)};
const validId=x=>typeof x==='string'&&ID.test(x);
function canonical(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'}
async function digest(s){const bytes=new TextEncoder().encode(s),result=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function loadEnvelope(row){if(!row)return {version:0,envelope:{state:{schema:1,projects:[],imports:[]},receipts:{}}};let envelope;try{envelope=JSON.parse(row.state_json)}catch{err('档案损坏，已停止操作。',500)}if(!envelope?.state||envelope.state.schema!==1||!envelope.receipts||typeof envelope.receipts!=='object')err('档案格式无效。',500);return {version:row.version,envelope}}
function getProject(state,id){if(!validId(id))err('作品标识无效。');const p=state.projects?.find(x=>x.id===id);if(!p)err('作品不存在。',404);return p}
function getProposal(p,id){if(!validId(id))err('提案标识无效。');const q=p.proposals?.find(x=>x.id===id);if(!q||q.status!=='proposed')err('提案不存在或已处理。',409);return q}
function sourceFor(p,q){const s=p.scenes?.find(x=>x.id===q.sceneId),r=s?.revisions?.at(-1);if(!s||!r||r.id!==q.revisionId||s.title!==r.title||s.draft!==r.body||typeof q.evidence!=='string'||!q.evidence||!r.body.includes(q.evidence)||q.baseCanon!==p.canonVersion)err('来源或正式基线已变化，请重新准备审阅。',409);return r}
async function snapshot(p,q,r){return {candidateHash:await digest(r.body),contextHash:await digest(canonical({projectId:p.id,canonVersion:p.canonVersion,proposal:q,revisionId:r.id,title:r.title}))}}
function sessionFor(p,id){if(!validId(id))err('审阅标识无效。');const g=p.guardSessions?.find(x=>x.id===id);if(!g)err('审阅记录不存在。',404);return g}
async function currentFor(p,g){const q=getProposal(p,g.proposal.content.payload.factProposalId),r=sourceFor(p,q),snap=await snapshot(p,q,r);if(snap.candidateHash!==g.proposal.content.candidateHash||snap.contextHash!==g.proposal.content.contextHash)err('证据或上下文已变化，请重新准备审阅。',409);return {q,r,current:{projectId:p.id,branchId:'main',headVersion:p.canonVersion,ruleVersion:RULE,policyVersion:POLICY,profileId:PROFILE.id,profileVersion:PROFILE.version,sourceValid:true,contextValid:true,approverAuthorized:true}}}
async function updateState(state,command,owner,now){
  const p=getProject(state,command.projectId);
  if(command.action==='prepare'){
    if(!validId(command.sessionId)||!validId(command.factId))err('审阅或事实标识无效。');
    p.guardSessions??=[];if(p.guardSessions.some(x=>x.id===command.sessionId)||p.facts.some(x=>x.id===command.factId))err('标识已存在。',409);
    const q=getProposal(p,command.proposalId),r=sourceFor(p,q),snap=await snapshot(p,q,r);
    const proposal=await sealProposal({id:command.sessionId,projectId:p.id,branchId:'main',baseVersion:p.canonVersion,ruleVersion:RULE,policyVersion:POLICY,...snap,payload:{factProposalId:q.id,factId:command.factId,sceneId:q.sceneId,revisionId:q.revisionId,evidence:q.evidence,statement:q.statement}});
    const binding={proposalHash:proposal.hash,projectId:p.id,branchId:'main',baseVersion:p.canonVersion,ruleVersion:RULE,policyVersion:POLICY,...snap};
    const report={id:command.sessionId+'_report',binding,profileId:PROFILE.id,profileVersion:PROFILE.version,checks:[{id:'STRUCTURE',status:'PASS'},{id:'EVIDENCE',status:'PASS'},{id:'SOURCE_VERSION',status:'PASS'},{id:'SEMANTIC',status:'UNKNOWN'}],issues:[{id:'semantic-not-checked',checkId:'SEMANTIC',kind:'SEMANTIC_NOT_CHECKED',message:'仅验证证据文本、来源版本和结构；未验证证据是否支持陈述，也未做 AI 或全书一致性检查。'}]};
    const bundle=await sealBundle(proposal,PROFILE,[report]);
    p.guardSessions.push({id:command.sessionId,proposal,bundle,approval:null,status:'awaiting_review',createdAt:now,notice:'仅作结构、原文包含与版本检查；语义和全书一致性未检查，须作者自行判断。'});
    return {type:'guarded_prepare',sessionId:command.sessionId};
  }
  const g=sessionFor(p,command.sessionId);if(g.status!=='awaiting_review'&&g.status!=='approved')err('审阅已结束。',409);
  const {q,current}=await currentFor(p,g);
  if(command.action==='approve'){
    if(g.status!=='awaiting_review')err('该审阅已经批准。',409);
    if(typeof command.reason!=='string'||!command.reason.trim()||command.reason.length>512)err('请填写对语义未经检查的明确判断。');
    const approval=await approveProposal(g.proposal,g.bundle,{approvalId:g.id+'_approval',principalId:owner,waivers:[{issueId:'semantic-not-checked',reason:command.reason.trim()}]});
    g.approval=approval;g.status='approved';g.approvedAt=now;return {type:'guarded_approve',sessionId:g.id};
  }
  if(command.action==='commit'){
    if(g.status!=='approved'||!g.approval)err('请先针对当前报告完成审阅。',409);
    await verifyCommit({proposal:g.proposal,bundle:g.bundle,approval:g.approval,current,authorized:true,principalId:owner});
    const next=applyGuardedFactCommand(state,{type:'commit_fact',projectId:p.id,proposalId:q.id,factId:g.proposal.content.payload.factId},now).state;
    const np=getProject(next,p.id),ng=sessionFor(np,g.id);ng.status='committed';ng.committedAt=now;
    return {type:'guarded_commit',sessionId:g.id,canonVersion:np.canonVersion,state:next};
  }
  err('未知的审阅操作。');
}
export async function executeGuarded(adapter,owner,request,now=new Date().toISOString()){
  if(!validId(owner)||!request||typeof request!=='object'||!validId(request.commandId)||!Number.isSafeInteger(request.expectedVersion)||request.expectedVersion<0||!request.command||typeof request.command!=='object'||Array.isArray(request.command)||!['prepare','approve','commit'].includes(request.command.action))err('命令、幂等标识或版本无效。');
  const requestHash=await digest(canonical({scope:'guarded-approval-v1',expectedVersion:request.expectedVersion,command:request.command}));
  let current=loadEnvelope(await adapter.load(owner));let prior=Object.hasOwn(current.envelope.receipts,request.commandId)?current.envelope.receipts[request.commandId]:undefined;
  if(prior){if(prior.hash!==requestHash)err('幂等标识已用于其他请求。',409);return {version:current.version,state:current.envelope.state,receipt:{...prior.receipt,committedVersion:prior.version,replayed:true}}}
  if(current.version!==request.expectedVersion)err('数据已在其他窗口更新，请重新读取。',409);
  let state=structuredClone(current.envelope.state),result;
  try{result=await updateState(state,request.command,owner,now)}catch(e){if(e instanceof ApprovalError)err(e.message,e.status);throw e}
  if(result.state){state=result.state;delete result.state}
  const version=current.version+1,envelope={state,receipts:{...current.envelope.receipts,[request.commandId]:{hash:requestHash,version,receipt:result}}},serialized=JSON.stringify(envelope),limit=adapter.maxStateBytes||1800000;
  if(new TextEncoder().encode(serialized).byteLength>limit)err('作品库容量不足，本次未写入。',413);
  if(!await adapter.compareAndSwap(owner,current.version,serialized,now)){
    current=loadEnvelope(await adapter.load(owner));prior=Object.hasOwn(current.envelope.receipts,request.commandId)?current.envelope.receipts[request.commandId]:undefined;
    if(prior&&prior.hash===requestHash)return {version:current.version,state:current.envelope.state,receipt:{...prior.receipt,committedVersion:prior.version,replayed:true}};
    err('数据已在其他窗口更新，请重新读取。',409);
  }
  return {version,state,receipt:{...result,committedVersion:version,replayed:false}};
}
/** During rollout, exact retries of fact commits that already succeeded must
 * return their old receipt after auth; this function never writes anything. */
export async function replayHistoricalCommit(adapter,owner,request){
  if(!validId(owner)||!request||!validId(request.commandId)||!Number.isSafeInteger(request.expectedVersion)||request.expectedVersion<0||!['commit_fact','add_temporal_transition','add_temporal_knowledge','add_temporal_speech','retcon_merge'].includes(request.command?.type))return null;
  const current=loadEnvelope(await adapter.load(owner));
  const prior=Object.hasOwn(current.envelope.receipts,request.commandId)?current.envelope.receipts[request.commandId]:undefined;
  if(!prior)return null;
  const requestHash=await digest(canonical({expectedVersion:request.expectedVersion,command:request.command}));
  if(prior.hash!==requestHash)err('幂等标识已用于其他请求。',409);
  return {version:current.version,state:current.envelope.state,receipt:{...prior.receipt,committedVersion:prior.version,replayed:true}};
}
