import { applyRetconCommand, RetconError } from '../../novel-retcon/branch.mjs';
import { applyTemporalCommand, isTemporalCommand, TemporalError } from '../temporal.mjs';
/** Domain operations for the first server-backed novel archive. Pure functions only. */
export class NovelError extends Error { constructor(message, status=422) { super(message); this.status=status; } }
export function initialState(){ return {schema:1,projects:[],imports:[]}; }
const ID=/^[A-Za-z0-9_-]{1,80}$/;
function identifier(value,label='标识'){if(typeof value!=='string'||!ID.test(value))throw new NovelError(`${label}无效。`);return value}
function text(value,label,max,required=false){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new NovelError(`${label}无效或超出长度限制。`);return value}
const kinds=new Set(['人物','物件','地点','世界规则','事件','人物认知','其他']);
const layers=new Set(['world','belief','speech','plan','unknown']);
function project(state,id){let p=state.projects.find(x=>x.id===identifier(id,'作品标识'));if(!p)throw new NovelError('作品不存在。',404);return p}
function scene(p,id){let s=p.scenes.find(x=>x.id===identifier(id,'场景标识'));if(!s)throw new NovelError('场景不存在。',404);return s}
function notUsed(items,id,label){identifier(id,label);if(items.some(x=>x.id===id))throw new NovelError(`${label}已存在。`,409)}
function unchanged(s,r){return s.revisions.at(-1)?.id===r.id && s.title===r.title && s.draft===r.body}
function proposed(p,c,now){let s=scene(p,c.sceneId),r=s.revisions.find(x=>x.id===identifier(c.revisionId,'版本标识'));if(!r||!unchanged(s,r))throw new NovelError('来源不是当前已保存版本，或草稿已变化。',409);notUsed(p.proposals,c.proposalId,'提案标识');const evidence=text(c.evidence,'证据',2000,true);if(!r.body.includes(evidence))throw new NovelError('证据不属于所选版本。');if(!kinds.has(c.kind)||!layers.has(c.layer))throw new NovelError('事实分类或信息层无效。');return {id:c.proposalId,sceneId:s.id,revisionId:r.id,statement:text(c.statement,'事实描述',500,true),evidence,kind:c.kind,layer:c.layer,storyTime:text(c.storyTime??'','故事时点',120),subject:text(c.subject??'','主体',120),baseCanon:p.canonVersion,status:'proposed',createdAt:now}}
function legacyImport(state,c,now){
  identifier(c.importId,'导入标识');if(state.imports.includes(c.importId))throw new NovelError('此导入已处理。',409);
  if(!Array.isArray(c.projects)||!c.projects.length||c.projects.length>100)throw new NovelError('备份作品数量无效。');
  const added=[];
  for(let pi=0;pi<c.projects.length;pi++){
    const old=c.projects[pi];if(!old||typeof old!=='object'||!Array.isArray(old.scenes)||old.scenes.length>2000||!Array.isArray(old.facts)||old.facts.length>10000)throw new NovelError('备份作品格式无效。');
    const id=`${c.importId}_p${pi}`;identifier(id,'导入后的作品标识');notUsed(state.projects,id,'作品标识');
    const p={id,name:text(old.name,'作品名称',100,true),description:text(old.description??'','作品简介',2000),canonVersion:0,scenes:[],proposals:[],facts:[],commits:[],legacyFacts:[],records:[]};
    const seenScenes=new Set(), seenRevisions=new Set(),sceneMap=new Map(),revisionMap=new Map();
    old.scenes.forEach((s,si)=>{if(!s||typeof s!=='object'||typeof s.id!=='string'||seenScenes.has(s.id)||!Array.isArray(s.revisions)||s.revisions.length>5000)throw new NovelError('备份场景格式或标识无效。');seenScenes.add(s.id);const sid=`${c.importId}_p${pi}s${si}`;identifier(sid,'导入后的场景标识');sceneMap.set(s.id,sid);const n={id:sid,title:text(s.title,'场景标题',100,true),draft:text(s.body??'','正文',500000),revisions:[]};s.revisions.forEach((r,ri)=>{if(!r||typeof r.id!=='string'||seenRevisions.has(r.id))throw new NovelError('备份版本标识重复或无效。');seenRevisions.add(r.id);let rid=`${c.importId}_p${pi}s${si}r${ri}`;identifier(rid,'导入后的版本标识');revisionMap.set(`${s.id}\u0000${r.id}`,rid);n.revisions.push({id:rid,title:text(r.title,'版本标题',100,true),body:text(r.body,'版本正文',500000),createdAt:typeof r.created==='string'&&r.created.length<=100?r.created:now})});p.scenes.push(n)});
    // Legacy facts remain evidence for human migration; they are never promoted to server canon.
    old.facts.forEach((f,fi)=>{if(!f||typeof f!=='object')throw new NovelError('备份事实格式无效。');let sid=sceneMap.get(f.sceneId),rid=revisionMap.get(`${f.sceneId}\u0000${f.revisionId}`);if(!sid||!rid)throw new NovelError('备份事实引用无效。');p.legacyFacts.push({id:`${c.importId}_p${pi}f${fi}`,sceneId:sid,revisionId:rid,statement:text(f.statement,'旧事实',500,true),evidence:text(f.evidence,'旧证据',2000,true),kind:text(f.kind??'其他','旧分类',80),status:text(f.status??'unknown','旧状态',80),note:text(f.note??'','旧备注',2000)})});
    state.projects.push(p);added.push(id);
  }
  state.imports.push(c.importId);return {importedProjectIds:added};
}
function commitFact(state,c,now,guarded=false){
 const p=project(state,c.projectId),proposalId=identifier(c.proposalId,'提案标识');
 if(!guarded&&(p.guardSessions||[]).some(g=>['awaiting_review','approved'].includes(g.status)&&g.proposal?.content?.payload?.factProposalId===proposalId))throw new NovelError('此提案已有受控审阅，请完成对应审批流程。',409);
 const q=p.proposals.find(x=>x.id===proposalId);if(!q||q.status!=='proposed')throw new NovelError('提案不存在或已处理。',409);
 const s=scene(p,q.sceneId),r=s.revisions.find(x=>x.id===q.revisionId);if(q.baseCanon!==p.canonVersion||!r||!unchanged(s,r)||!r.body.includes(q.evidence))throw new NovelError('提案依据已变化，请重新审阅。',409);
 notUsed(p.facts,c.factId,'事实标识');p.canonVersion++;q.status='committed';p.facts.push({id:c.factId,proposalId:q.id,sceneId:q.sceneId,revisionId:q.revisionId,statement:q.statement,evidence:q.evidence,kind:q.kind,layer:q.layer,storyTime:q.storyTime,subject:q.subject,committedAt:now,canonVersion:p.canonVersion});p.commits.push({canonVersion:p.canonVersion,proposalId:q.id,factId:c.factId,createdAt:now});
}
// Internal helper: callers must first verify current signed/hashed guard session and commit via archive CAS.
// It is intentionally not dispatched by applyCommand or accepted from the public canon endpoint.
export function applyGuardedFactCommand(original,c,now=new Date().toISOString()){
 if(!original||original.schema!==1||!Array.isArray(original.projects)||!c||c.type!=='commit_fact')throw new NovelError('受控事实提交格式无效。');
 const state=structuredClone(original);commitFact(state,c,now,true);return {state,receipt:{type:'guarded_commit_fact'}};
}
export function applyCommand(original,c,now=new Date().toISOString()){
  if(!original||original.schema!==1||!Array.isArray(original.projects)||!Array.isArray(original.imports)||!c||typeof c!=='object'||Array.isArray(c))throw new NovelError('状态或命令无效。');
  let state=structuredClone(original),receipt={type:c.type};
  switch(c.type){
    case 'create_project': {notUsed(state.projects,c.projectId,'作品标识');state.projects.push({id:c.projectId,name:text(c.name,'作品名称',100,true),description:text(c.description??'','作品简介',2000),canonVersion:0,scenes:[],proposals:[],facts:[],commits:[],legacyFacts:[],records:[]});break}
    case 'create_project_with_scene_draft': {notUsed(state.projects,c.projectId,'作品标识');identifier(c.sceneId,'场景标识');const name=text(c.name,'作品名称',100,true),description=text(c.description??'','作品简介',2000),title=text(c.title,'场景标题',100,true),draft=text(c.body,'场景正文',500000,true);state.projects.push({id:c.projectId,name,description,canonVersion:0,scenes:[{id:c.sceneId,title,draft,revisions:[]}],proposals:[],facts:[],commits:[],legacyFacts:[],records:[]});Object.assign(receipt,{projectId:c.projectId,sceneId:c.sceneId,status:'draft_saved'});break}
    case 'create_project_with_scene_drafts': {notUsed(state.projects,c.projectId,'作品标识');const name=text(c.name,'作品名称',100,true),description=text(c.description??'','作品简介',2000);if(!Array.isArray(c.scenes)||c.scenes.length<1||c.scenes.length>5)throw new NovelError('候选场景数量须为 1 至 5。');const ids=new Set(),scenes=c.scenes.map(item=>{if(!item||typeof item!=='object'||Array.isArray(item))throw new NovelError('场景内容无效。');const sceneId=identifier(item.sceneId,'场景标识');if(ids.has(sceneId))throw new NovelError('场景标识重复。');ids.add(sceneId);return {id:sceneId,title:text(item.title,'场景标题',100,true),draft:text(item.body,'场景正文',500000,true),revisions:[]}});state.projects.push({id:c.projectId,name,description,canonVersion:0,scenes,proposals:[],facts:[],commits:[],legacyFacts:[],records:[]});Object.assign(receipt,{projectId:c.projectId,sceneIds:scenes.map(s=>s.id),status:'draft_saved'});break}
    case 'create_scene': {let p=project(state,c.projectId);notUsed(p.scenes,c.sceneId,'场景标识');p.scenes.push({id:c.sceneId,title:text(c.title,'场景标题',100,true),draft:'',revisions:[]});break}
    case 'save_draft': {let p=project(state,c.projectId),s=scene(p,c.sceneId);s.title=text(c.title,'场景标题',100,true);s.draft=text(c.body,'场景正文',500000);break}
    case 'save_revision': {let p=project(state,c.projectId),s=scene(p,c.sceneId);notUsed(s.revisions,c.revisionId,'版本标识');if(!s.draft.trim())throw new NovelError('空场景不能保存版本。');if(s.revisions.length&&unchanged(s,s.revisions.at(-1)))throw new NovelError('正文未变化。',409);s.revisions.push({id:c.revisionId,title:s.title,body:s.draft,createdAt:now});break}
    case 'propose_fact': {let p=project(state,c.projectId);p.proposals.push(proposed(p,c,now));break}
    case 'commit_fact': {commitFact(state,c,now);break}
    case 'create_dependency': {let p=project(state,c.projectId);p.dependencies??=[];notUsed(p.dependencies,c.dependencyId,'依赖标识');let source=scene(p,c.sourceSceneId),target=scene(p,c.targetSceneId);if(source.id===target.id)throw new NovelError('依赖两端必须是不同场景。');let sr=source.revisions.find(x=>x.id===identifier(c.sourceRevisionId,'来源版本标识')),tr=target.revisions.find(x=>x.id===identifier(c.targetRevisionId,'目标版本标识'));if(!sr||!tr||!unchanged(source,sr)||!unchanged(target,tr))throw new NovelError('依赖两端必须是当前已保存的场景版本。',409);let se=text(c.sourceEvidence,'来源证据',2000,true),te=text(c.targetEvidence,'目标证据',2000,true);if(!sr.body.includes(se)||!tr.body.includes(te))throw new NovelError('依赖证据必须出现在对应版本正文中。');p.dependencies.push({id:c.dependencyId,sourceSceneId:source.id,sourceRevisionId:sr.id,sourceEvidence:se,targetSceneId:target.id,targetRevisionId:tr.id,targetEvidence:te,reason:text(c.reason,'依赖说明',1000,true),createdAt:now,retiredAt:null});break}
    case 'retire_dependency': {let p=project(state,c.projectId),d=(p.dependencies||[]).find(x=>x.id===identifier(c.dependencyId,'依赖标识'));if(!d||d.retiredAt)throw new NovelError('依赖不存在或已停用。',409);d.retiredAt=now;break}
    case 'save_record': {let p=project(state,c.projectId);identifier(c.recordId,'记录标识');const categories=new Set(['outline','character','world','knowledge','foreshadow']),statuses=new Set(['plan','open','resolved','unknown']);if(!categories.has(c.category)||!statuses.has(c.status))throw new NovelError('档案类型或状态无效。');let item={id:c.recordId,category:c.category,title:text(c.title,'标题',100,true),content:text(c.content,'内容',4000),subject:text(c.subject??'','主体',120),storyTime:text(c.storyTime??'','故事时点',120),status:c.status,updatedAt:now};p.records??=[];let i=p.records.findIndex(x=>x.id===c.recordId);if(i<0)p.records.push({...item,history:[]});else{let old=p.records[i];if(old.category!==c.category)throw new NovelError('不能改变已有记录的类别。',409);p.records[i]={...item,history:[...old.history,{title:old.title,content:old.content,subject:old.subject,storyTime:old.storyTime,status:old.status,updatedAt:old.updatedAt}]}}break}
    case 'retcon_open': case 'retcon_change': case 'retcon_resolve': case 'retcon_merge': { try { Object.assign(receipt,applyRetconCommand(state,c,now)); } catch(error) { if(error instanceof RetconError) throw new NovelError(error.message,error.status); throw error; } break; }
    case 'import_legacy': Object.assign(receipt,legacyImport(state,c,now));break;
    default: { if(!isTemporalCommand(c.type)) throw new NovelError('未知操作。'); try { Object.assign(receipt,applyTemporalCommand(state,c,now)); } catch(error) { if(error instanceof TemporalError) throw new NovelError(error.message,error.status); throw error; } }
  }
  return {state,receipt};
}
