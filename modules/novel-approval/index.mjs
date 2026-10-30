/** Integrity contracts only. The caller must persist immutable records, derive the
 * profile/permission on the server, and call verifyCommit inside the same atomic
 * transaction that writes canon and receipts. Model output is never an approval. */
export class ApprovalError extends Error {
  constructor(code, message, status = 422) { super(message); this.code = code; this.status = status; }
}
const fail=(code,message,status)=>{throw new ApprovalError(code,message,status)};
const isObject=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const nonempty=x=>typeof x==='string'&&x.trim().length>0&&x.length<=512;
const hashRe=/^[0-9a-f]{64}$/;
function canonical(x, seen = new Set()) {
  if(x===null||typeof x==='boolean'||typeof x==='string') return JSON.stringify(x);
  if(typeof x==='number'&&Number.isFinite(x)) return JSON.stringify(x);
  if(typeof x!=='object'||seen.has(x)) fail('INVALID_JSON','对象必须是无循环的 JSON 值。');
  if(Object.getPrototypeOf(x)!==Object.prototype && !Array.isArray(x)) fail('INVALID_JSON','对象类型无效。');
  seen.add(x);
  let out;
  if(Array.isArray(x)) { if(Object.keys(x).length!==x.length) fail('INVALID_JSON','数组必须是连续 JSON 值。'); out='['+x.map(v=>canonical(v,seen)).join(',')+']'; }
  else out='{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k],seen)).join(',')+'}';
  seen.delete(x); return out;
}
async function hash(x) {
  const bytes=new TextEncoder().encode(canonical(x));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function clone(x){return JSON.parse(canonical(x))}
function validBase(p){
  if(!isObject(p)||!nonempty(p.id)||!nonempty(p.projectId)||!nonempty(p.branchId)||!Number.isSafeInteger(p.baseVersion)||p.baseVersion<0||!nonempty(p.ruleVersion)||!nonempty(p.policyVersion)||!hashRe.test(p.contextHash||'')||!hashRe.test(p.candidateHash||'')||!isObject(p.payload)) fail('INVALID_PROPOSAL','提案缺少版本、内容或依据。');
}
/** Seal an immutable content copy. The payload contains all intended effects,
 * including source/target branch heads and impact actions for merge proposals. */
export async function sealProposal(input){validBase(input);const content=clone(input);return {content,hash:await hash(content)}}
export async function checkProposal(p){if(!isObject(p)||!hashRe.test(p.hash||''))fail('INVALID_PROPOSAL','封存提案格式无效。');validBase(p.content);if(await hash(p.content)!==p.hash)fail('PROPOSAL_CHANGED','封存提案内容已变化。',409);return p.content}
const statuses=new Set(['PASS','CONFLICT','UNKNOWN','NOT_APPLICABLE','ERROR']);
function checkProfile(profile){
  if(!isObject(profile)||!nonempty(profile.id)||!nonempty(profile.version)||!Array.isArray(profile.requiredChecks)||!profile.requiredChecks.length||!profile.requiredChecks.every(nonempty)||new Set(profile.requiredChecks).size!==profile.requiredChecks.length||!Array.isArray(profile.protectedChecks)||!profile.protectedChecks.every(nonempty)||!Array.isArray(profile.waivableKinds)||!profile.waivableKinds.every(nonempty)) fail('INVALID_PROFILE','服务器检查配置无效。');
}
const bindingKeys=['projectId','branchId','baseVersion','ruleVersion','policyVersion','contextHash','candidateHash'];
function sameBinding(binding,content,proposalHash){return isObject(binding)&&binding.proposalHash===proposalHash&&bindingKeys.every(k=>binding[k]===content[k])}
/** Reports must be server-stored results against the sealed proposal, not self-reported client approvals. */
export async function sealBundle(proposal,profile,reports){
  const content=await checkProposal(proposal);checkProfile(profile);
  if(!Array.isArray(reports)||!reports.length)fail('CHECKS_MISSING','没有检查报告。',409);
  const checkIds=new Set(),issueIds=new Set(),reportIds=new Set(),issues=[];let checks=[];
  for(const report of reports){
    if(!isObject(report)||!nonempty(report.id)||reportIds.has(report.id)||!sameBinding(report.binding,content,proposal.hash)||report.profileId!==profile.id||report.profileVersion!==profile.version||!Array.isArray(report.checks)||!Array.isArray(report.issues))fail('REPORT_STALE','报告依据或配置不匹配，需重新检查。',409);
    reportIds.add(report.id);
    const ownChecks=new Set();
    for(const c of report.checks){
      if(!isObject(c)||!nonempty(c.id)||checkIds.has(c.id)||!statuses.has(c.status)||(c.status==='NOT_APPLICABLE'&&!nonempty(c.reason)))fail('INVALID_REPORT','检查项重复、缺失或状态无效。');
      checkIds.add(c.id);ownChecks.add(c.id);checks.push(clone(c));
    }
    for(const issue of report.issues){
      if(!isObject(issue)||!nonempty(issue.id)||issueIds.has(issue.id)||!nonempty(issue.kind)||!ownChecks.has(issue.checkId))fail('INVALID_ISSUE','问题引用或标识无效。');
      issueIds.add(issue.id);issues.push(clone(issue));
    }
  }
  const missing=profile.requiredChecks.filter(id=>!checkIds.has(id));
  if(missing.length)fail('CHECKS_MISSING',`必需检查未完成：${missing.join('、')}`,409);
  for(const c of checks){
    if(c.status==='ERROR')fail('CHECK_ERROR',`检查 ${c.id} 失败，不能批准。`,409);
    if(['UNKNOWN','CONFLICT'].includes(c.status)&&!issues.some(i=>i.checkId===c.id))fail('ISSUE_MISSING',`检查 ${c.id} 缺少待审问题。`,409);
    if(issues.some(i=>i.checkId===c.id)&&!['UNKNOWN','CONFLICT'].includes(c.status))fail('INVALID_ISSUE','问题与检查结论不一致。');
  }
  checks=checks.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  issues.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const body={proposalHash:proposal.hash,profile:clone(profile),reports:reports.map(clone).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),checks,issues};
  return {content:body,hash:await hash(body)};
}
async function checkBundle(proposal,bundle){
  await checkProposal(proposal);
  if(!isObject(bundle)||!isObject(bundle.content)||!hashRe.test(bundle.hash||'')||bundle.content.proposalHash!==proposal.hash||await hash(bundle.content)!==bundle.hash)fail('BUNDLE_CHANGED','检查报告集合已变化。',409);
  // Rebuild from immutable stored source reports; do not trust derived summaries.
  const rebuilt=await sealBundle(proposal,bundle.content.profile,bundle.content.reports);
  if(rebuilt.hash!==bundle.hash)fail('BUNDLE_CHANGED','检查报告集合不完整。',409);
  return rebuilt.content;
}
/** User may waive only exact issues allowed by the trusted server profile.
 * Missing, error, protected check, invalid evidence and authorization failures cannot be waived. */
export async function approveProposal(proposal,bundle,{approvalId,principalId,waivers=[]}={}){
  if(!nonempty(approvalId)||!nonempty(principalId)||!Array.isArray(waivers))fail('INVALID_APPROVAL','审批身份或内容无效。');
  const b=await checkBundle(proposal,bundle),p=b.profile;
  const byId=new Map();
  for(const w of waivers){if(!isObject(w)||!nonempty(w.issueId)||!nonempty(w.reason)||byId.has(w.issueId))fail('INVALID_WAIVER','定向处理缺少问题或原因。');byId.set(w.issueId,w)}
  for(const issue of b.issues){
    const w=byId.get(issue.id);
    if(p.protectedChecks.includes(issue.checkId)||!p.waivableKinds.includes(issue.kind))fail('NON_WAIVABLE','此问题不可通过人工豁免。',409);
    if(!w)fail('REVIEW_REQUIRED','存在未定向处理的问题。',409);
    byId.delete(issue.id);
  }
  if(byId.size)fail('INVALID_WAIVER','审批包含不属于当前报告的问题。');
  const content={approvalId,principalId,proposalHash:proposal.hash,bundleHash:bundle.hash,policyVersion:proposal.content.policyVersion,waivers:clone(waivers).sort((a,b)=>a.issueId<b.issueId?-1:a.issueId>b.issueId?1:0)};
  return {content,hash:await hash(content)};
}
/** Must run after current permission is checked inside the transaction. */
export async function verifyCommit({proposal,bundle,approval,current,principalId,authorized,revoked=false}){
  if(authorized!==true||!nonempty(principalId))fail('FORBIDDEN','当前用户没有提交权限。',403);
  const p=await checkProposal(proposal);const checkedBundle=await checkBundle(proposal,bundle);
  if(!isObject(approval)||!isObject(approval.content)||!hashRe.test(approval.hash||'')||await hash(approval.content)!==approval.hash||approval.content.proposalHash!==proposal.hash||approval.content.bundleHash!==bundle.hash||approval.content.policyVersion!==p.policyVersion||revoked)fail('APPROVAL_INVALID','审批已撤销或与当前提案、报告不一致。',409);
  const validated=await approveProposal(proposal,bundle,approval.content);
  if(validated.hash!==approval.hash)fail('APPROVAL_INVALID','审批内容不完整。',409);
  if(!isObject(current)||current.projectId!==p.projectId||current.branchId!==p.branchId||current.headVersion!==p.baseVersion||current.ruleVersion!==p.ruleVersion||current.policyVersion!==p.policyVersion)fail('STALE_BASE','当前版本、规则或权限策略已变化。',409);
  if(current.profileId!==checkedBundle.profile.id||current.profileVersion!==checkedBundle.profile.version)fail('STALE_PROFILE','检查配置已变化，请重新检查并审批。',409);
  if(current.approverAuthorized!==true)fail('APPROVER_UNAUTHORIZED','批准人的授权已变化。',403);
  if(current.sourceValid!==true||current.contextValid!==true)fail('STALE_SOURCE','证据或上下文已变化。',409);
  if(p.payload.merge && (!isObject(p.payload.merge)||current.mergeSourceHead!==p.payload.merge.sourceHead||current.mergeTargetHead!==p.payload.merge.targetHead))fail('STALE_MERGE','修订来源或目标分支已变化。',409);
  return {eligible:true,proposalHash:proposal.hash,bundleHash:bundle.hash,approvalHash:approval.hash};
}
