/** Server-constructed, version-bound review for temporal changes and retcon merge.
 * Dry-run only validates domain preconditions; semantics always remain UNKNOWN. */
import { applyCommand, NovelError } from '../novel-studio/server/domain.mjs';
import { sealProposal, sealBundle, approveProposal, verifyCommit, ApprovalError } from './index.mjs';
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const ALLOWED=new Set(['add_temporal_transition','add_temporal_knowledge','add_temporal_speech','retcon_merge']);
const PROFILE=Object.freeze({id:'change-limited',version:'1',requiredChecks:['DOMAIN','SEMANTIC'],protectedChecks:['DOMAIN'],waivableKinds:['SEMANTIC_NOT_CHECKED']});
const RULE='guarded-change-v1',POLICY='manual-owner-v1';
const id=x=>typeof x==='string'&&ID.test(x);
function fail(m,s=422){throw new NovelError(m,s)}
function canonical(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'}
async function hash(s){let d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function parse(row){if(!row)return {version:0,envelope:{state:{schema:1,projects:[],imports:[]},receipts:{}}};let e;try{e=JSON.parse(row.state_json)}catch{fail('档案损坏。',500)}if(e?.state?.schema!==1||!e.receipts||typeof e.receipts!=='object')fail('档案格式无效。',500);return {version:row.version,envelope:e}}
function project(state,pid){if(!id(pid))fail('作品标识无效。');const p=state.projects?.find(x=>x.id===pid);if(!p)fail('作品不存在。',404);return p}
function session(p,sid){if(!id(sid))fail('审阅标识无效。');const g=p.guardChangeSessions?.find(x=>x.id===sid);if(!g)fail('审阅记录不存在。',404);return g}
function context(p){const copy=structuredClone(p);delete copy.guardSessions;delete copy.guardChangeSessions;return canonical(copy)}
function branchHead(p,change){if(change.type!=='retcon_merge')return null;const b=p.retconBranches?.find(x=>x.id===change.branchId);if(!b||b.status!=='open'||b.version!==change.expectedBranchVersion)fail('修订分支已变化，请重新审阅。',409);return b.version}
async function validateCurrent(p,g){const c=g.proposal.content.payload.change;if(!ALLOWED.has(c?.type)||c.projectId!==p.id)fail('受控变更无效。',409);const contextHash=await hash(context(p)),candidateHash=await hash(canonical(c));if(contextHash!==g.proposal.content.contextHash||candidateHash!==g.proposal.content.candidateHash)fail('作品或变更内容已变化，请重新准备审阅。',409);const sourceHead=branchHead(p,c);return {projectId:p.id,branchId:'main',headVersion:p.canonVersion,ruleVersion:RULE,policyVersion:POLICY,profileId:PROFILE.id,profileVersion:PROFILE.version,sourceValid:true,contextValid:true,approverAuthorized:true,...(c.type==='retcon_merge'?{mergeSourceHead:sourceHead,mergeTargetHead:p.canonVersion}:{})}}
async function update(state,command,owner,now){
 const p=project(state,command.projectId);
 if(command.action==='prepare'){
  if(!id(command.sessionId)||!command.change||typeof command.change!=='object'||Array.isArray(command.change)||!ALLOWED.has(command.change.type)||command.change.projectId!==p.id)fail('受控变更格式无效。');
  p.guardChangeSessions??=[];if(p.guardChangeSessions.some(g=>g.id===command.sessionId))fail('审阅标识已存在。',409);
  const change=structuredClone(command.change),sourceHead=branchHead(p,change);
  // Each domain command validates source evidence and version or merge base. The result is discarded.
  applyCommand(state,change,now);
  const contextHash=await hash(context(p)),candidateHash=await hash(canonical(change));
  const payload={change,...(change.type==='retcon_merge'?{merge:{sourceHead,targetHead:p.canonVersion}}:{})};
  const proposal=await sealProposal({id:command.sessionId,projectId:p.id,branchId:'main',baseVersion:p.canonVersion,ruleVersion:RULE,policyVersion:POLICY,contextHash,candidateHash,payload});
  const binding={proposalHash:proposal.hash,projectId:p.id,branchId:'main',baseVersion:p.canonVersion,ruleVersion:RULE,policyVersion:POLICY,contextHash,candidateHash};
  const report={id:command.sessionId+'_report',binding,profileId:PROFILE.id,profileVersion:PROFILE.version,checks:[{id:'DOMAIN',status:'PASS'},{id:'SEMANTIC',status:'UNKNOWN'}],issues:[{id:'semantic-not-checked',checkId:'SEMANTIC',kind:'SEMANTIC_NOT_CHECKED',message:'仅检查领域命令的结构、版本和已声明来源；未检查叙事语义或全部隐含影响。'}]};
  const bundle=await sealBundle(proposal,PROFILE,[report]);
  p.guardChangeSessions.push({id:command.sessionId,proposal,bundle,approval:null,status:'awaiting_review',createdAt:now,notice:'仅验证现有领域规则与明确证据；语义、全书一致性和隐含依赖未检查，须作者审阅。'});
  return {type:'guarded_change_prepare',sessionId:command.sessionId};
 }
 const g=session(p,command.sessionId);if(!['awaiting_review','approved'].includes(g.status))fail('审阅已结束。',409);
 const current=await validateCurrent(p,g);
 if(command.action==='approve'){
  if(g.status!=='awaiting_review')fail('该审阅已经批准。',409);
  if(typeof command.reason!=='string'||!command.reason.trim()||command.reason.length>512)fail('请填写对语义未经检查的明确判断。');
  g.approval=await approveProposal(g.proposal,g.bundle,{approvalId:g.id+'_approval',principalId:owner,waivers:[{issueId:'semantic-not-checked',reason:command.reason.trim()}]});g.status='approved';g.approvedAt=now;
  return {type:'guarded_change_approve',sessionId:g.id};
 }
 if(command.action==='commit'){
  if(g.status!=='approved'||!g.approval)fail('请先针对当前报告完成审阅。',409);
  await verifyCommit({proposal:g.proposal,bundle:g.bundle,approval:g.approval,current,authorized:true,principalId:owner});
  const result=applyCommand(state,g.proposal.content.payload.change,now),p2=project(result.state,p.id),g2=session(p2,g.id);g2.status='committed';g2.committedAt=now;
  return {type:'guarded_change_commit',sessionId:g.id,effectReceipt:result.receipt,state:result.state};
 }
 fail('未知的审阅操作。');
}
export async function executeGuardedChange(adapter,owner,request,now=new Date().toISOString()){
 if(!id(owner)||!request||typeof request!=='object'||!id(request.commandId)||!Number.isSafeInteger(request.expectedVersion)||request.expectedVersion<0||!request.command||typeof request.command!=='object'||Array.isArray(request.command)||!['prepare','approve','commit'].includes(request.command.action))fail('命令、幂等标识或版本无效。');
 const requestHash=await hash(canonical({scope:'guarded-change-v1',expectedVersion:request.expectedVersion,command:request.command}));
 let cur=parse(await adapter.load(owner)),prior=Object.hasOwn(cur.envelope.receipts,request.commandId)?cur.envelope.receipts[request.commandId]:undefined;
 if(prior){if(prior.hash!==requestHash)fail('幂等标识已用于其他请求。',409);return {version:cur.version,state:cur.envelope.state,receipt:{...prior.receipt,committedVersion:prior.version,replayed:true}}}
 if(cur.version!==request.expectedVersion)fail('数据已在其他窗口更新，请重新读取。',409);
 let state=structuredClone(cur.envelope.state),result;try{result=await update(state,request.command,owner,now)}catch(e){if(e instanceof ApprovalError)fail(e.message,e.status);throw e}
 if(result.state){state=result.state;delete result.state}
 const version=cur.version+1,e={state,receipts:{...cur.envelope.receipts,[request.commandId]:{hash:requestHash,version,receipt:result}}},serialized=JSON.stringify(e),limit=adapter.maxStateBytes||1800000;
 if(new TextEncoder().encode(serialized).byteLength>limit)fail('作品库容量不足，本次未写入。',413);
 if(!await adapter.compareAndSwap(owner,cur.version,serialized,now)){cur=parse(await adapter.load(owner));prior=Object.hasOwn(cur.envelope.receipts,request.commandId)?cur.envelope.receipts[request.commandId]:undefined;if(prior&&prior.hash===requestHash)return {version:cur.version,state:cur.envelope.state,receipt:{...prior.receipt,committedVersion:prior.version,replayed:true}};fail('数据已在其他窗口更新，请重新读取。',409)}
 return {version,state,receipt:{...result,committedVersion:version,replayed:false}};
}
