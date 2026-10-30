/** Explicit-evidence revision branches. Persist via the caller's atomic archive CAS. */
export class RetconError extends Error { constructor(message,status=422){super(message);this.status=status} }
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const assertId=(v)=>{if(typeof v!=='string'||!ID.test(v))throw new RetconError('标识无效。');return v};
const string=(v,max,label,required=true)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new RetconError(`${label}无效。`);return v};
const project=(state,id)=>{const p=state.projects.find(x=>x.id===assertId(id));if(!p)throw new RetconError('作品不存在。',404);return p};
const branch=(p,id)=>{const b=(p.retconBranches||[]).find(x=>x.id===assertId(id));if(!b)throw new RetconError('修订分支不存在。',404);if(b.status!=='open')throw new RetconError('修订分支已经关闭。',409);return b};
const latest=s=>s.revisions.at(-1);
const canonString=v=>JSON.stringify(v);
function snapshot(p){
 const heads=p.scenes.map(s=>{let r=latest(s);if(!r||s.title!==r.title||s.draft!==r.body)throw new RetconError('创建或合并修订分支前，请先保存每个场景的当前版本。',409);return {id:s.id,revisionId:r.id}});
 // Snapshot user-authored definitions; server-derived presentation flags never affect the base.
 const deps=(p.dependencies||[]).map(({sourceStatus,targetStatus,impacted,...d})=>d);
 return {canonVersion:p.canonVersion,heads,dependencies:canonString(deps),records:canonString(p.records||[])};
}
function requireBase(p,b){if(canonString(snapshot(p))!==canonString(b.base))throw new RetconError('主线作品、版本、正式事实、依赖或设定已变化，请重新建立修订分支。',409)}
function scene(p,id){const s=p.scenes.find(x=>x.id===assertId(id));if(!s)throw new RetconError('场景不存在。',404);return s}
function draftRevision(p,b,id){const s=scene(p,id),changes=b.revisions.filter(r=>r.sceneId===s.id),change=changes.at(-1);return change?{id:change.id,title:change.title,body:change.body}:latest(s)}
/** Graph reachability is limited to explicit active edges; it does not infer meaning. */
export function impactReport(p,b){
 const modified=new Set(b.revisions.map(r=>r.sceneId));const edges=(p.dependencies||[]).filter(d=>!d.retiredAt);const queue=[...modified],reachable=new Set(queue),impacted=[];
 while(queue.length){const source=queue.shift();for(const d of edges){if(d.sourceSceneId!==source||impacted.some(x=>x.id===d.id))continue;impacted.push(d);if(!reachable.has(d.targetSceneId)){reachable.add(d.targetSceneId);queue.push(d.targetSceneId)}}}
 // An edited target can invalidate a direct edge even when its source is not changed.
 for(const d of edges)if(modified.has(d.targetSceneId)&&!impacted.some(x=>x.id===d.id))impacted.push(d);
 const result=impacted.map(d=>{const resolution=b.resolutions.find(x=>x.dependencyId===d.id);return {dependencyId:d.id,sourceSceneId:d.sourceSceneId,targetSceneId:d.targetSceneId,reason:d.reason,resolution:resolution?.mode||null}});
 return {branchId:b.id,branchVersion:b.version,changedScenes:[...modified],affectedSceneIds:[...reachable],dependencies:result,unresolved:result.filter(x=>!x.resolution).length,staleFacts:(p.facts||[]).filter(f=>modified.has(f.sceneId)).map(f=>({id:f.id,sceneId:f.sceneId,statement:f.statement})),coverage:'仅覆盖作者登记的显式场景依赖，未自动发现隐含依赖。'};
}
function open(p,c,now){assertId(c.branchId);p.retconBranches??=[];if(p.retconBranches.some(x=>x.id===c.branchId))throw new RetconError('分支标识已存在。',409);let b={id:c.branchId,status:'open',version:0,base:snapshot(p),createdAt:now,revisions:[],resolutions:[]};p.retconBranches.push(b);return {branchId:b.id,branchVersion:b.version}}
function change(p,b,c,now){requireBase(p,b);assertId(c.revisionId);const s=scene(p,c.sceneId);if(s.revisions.some(r=>r.id===c.revisionId)||b.revisions.some(r=>r.id===c.revisionId))throw new RetconError('版本标识已存在。',409);const title=string(c.title,100,'标题'),body=string(c.body,500000,'正文');const prev=draftRevision(p,b,s.id);if(prev.title===title&&prev.body===body)throw new RetconError('正文未变化。',409);b.revisions.push({id:c.revisionId,sceneId:s.id,title,body,createdAt:now});b.resolutions=[];b.version++;return {branchId:b.id,branchVersion:b.version}}
function resolve(p,b,c,now){requireBase(p,b);if(c.expectedBranchVersion!==b.version)throw new RetconError('修订分支已变化，请重新审阅。',409);const report=impactReport(p,b),target=report.dependencies.find(x=>x.dependencyId===assertId(c.dependencyId));if(!target)throw new RetconError('该依赖不在当前影响范围内。',409);if(!['rebind','retire'].includes(c.mode))throw new RetconError('请选择重新绑定或停用依赖。');const note=string(c.note,1000,'处理说明');const d=(p.dependencies||[]).find(x=>x.id===target.dependencyId);let resolution={dependencyId:d.id,mode:c.mode,note,reviewedAt:now};if(c.mode==='rebind'){let sr=draftRevision(p,b,d.sourceSceneId),tr=draftRevision(p,b,d.targetSceneId);const se=string(c.sourceEvidence,2000,'来源证据'),te=string(c.targetEvidence,2000,'目标证据');if(!sr.body.includes(se)||!tr.body.includes(te))throw new RetconError('两端证据必须匹配分支对应的当前正文。');Object.assign(resolution,{sourceRevisionId:sr.id,targetRevisionId:tr.id,sourceEvidence:se,targetEvidence:te})}b.resolutions=b.resolutions.filter(x=>x.dependencyId!==d.id);b.resolutions.push(resolution);b.version++;return {branchId:b.id,branchVersion:b.version}}
function merge(p,b,c,now){requireBase(p,b);if(!Number.isSafeInteger(c.expectedBranchVersion)||c.expectedBranchVersion!==b.version)throw new RetconError('修订分支已变化，请重新审阅。',409);const report=impactReport(p,b);if(!report.changedScenes.length)throw new RetconError('分支没有正文修改。');if(report.unresolved)throw new RetconError('仍有受影响的显式依赖未处理。',409);for(const sId of report.changedScenes){const s=scene(p,sId);const revisions=b.revisions.filter(x=>x.sceneId===sId);for(const r of revisions){if(s.revisions.some(x=>x.id===r.id))throw new RetconError('版本标识冲突。',409);s.revisions.push({id:r.id,title:r.title,body:r.body,createdAt:r.createdAt,retconBranchId:b.id})}let last=revisions.at(-1);s.title=last.title;s.draft=last.body}
 for(const resolution of b.resolutions){const d=(p.dependencies||[]).find(x=>x.id===resolution.dependencyId);d.history??=[];d.history.push({sourceRevisionId:d.sourceRevisionId,targetRevisionId:d.targetRevisionId,sourceEvidence:d.sourceEvidence,targetEvidence:d.targetEvidence,retiredAt:d.retiredAt,reviewedAt:now,branchId:b.id,note:resolution.note});if(resolution.mode==='retire')d.retiredAt=now;else Object.assign(d,{sourceRevisionId:resolution.sourceRevisionId,targetRevisionId:resolution.targetRevisionId,sourceEvidence:resolution.sourceEvidence,targetEvidence:resolution.targetEvidence})}
 p.canonVersion++;p.commits??=[];p.commits.push({type:'retcon_merge',canonVersion:p.canonVersion,branchId:b.id,branchVersion:b.version,createdAt:now});b.status='merged';b.mergedAt=now;b.mergedVersion=b.version;return {branchId:b.id,canonVersion:p.canonVersion,changedScenes:report.changedScenes,affectedSceneIds:report.affectedSceneIds,staleFactIds:report.staleFacts.map(x=>x.id),coverage:report.coverage};}
export function applyRetconCommand(state,c,now=new Date().toISOString()){
 const p=project(state,c.projectId);switch(c.type){case 'retcon_open':return open(p,c,now);case 'retcon_change':return change(p,branch(p,c.branchId),c,now);case 'retcon_resolve':return resolve(p,branch(p,c.branchId),c,now);case 'retcon_merge':return merge(p,branch(p,c.branchId),c,now);default:throw new RetconError('未知修订操作。')}
}
export function readRetcon(state,projectId,branchId){const p=project(state,projectId),b=branch(p,branchId);requireBase(p,b);return impactReport(p,b)}
