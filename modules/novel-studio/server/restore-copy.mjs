import { NovelError, applyCommand } from './domain.mjs';
import { readArchive, executeCommand } from './store.mjs';

const ID=/^[A-Za-z0-9_-]{1,48}$/;
const nonempty=(x,max)=>typeof x==='string'&&x.length<=max&&x.trim().length>0;
const OMITTED=['正式事实的确认状态与审批回执（事实作为旧资料保留，需重新审阅）','待审提案','结构化时态及知情事件','场景依赖','修订分支和合并历史','大纲、人物、世界、认知和伏笔设定记录','原稿附件、导入记录与操作回执'];
function convert(input){
  const b=input?.backup;
  if(!input||typeof input!=='object'||!ID.test(input.commandId??'')||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||!b||b.format!=='novel-server-archive'||b.schema!==1||!b.state||b.state.schema!==1||!Array.isArray(b.state.projects)||!b.state.projects.length||b.state.projects.length>100)throw new NovelError('备份格式、恢复标识或目标版本无效。');
  let scenes=0,revisions=0,facts=0;
  const projects=b.state.projects.map(p=>{
    if(!p||!nonempty(p.name,100)||typeof p.description!=='string'||p.description.length>2000||!Array.isArray(p.scenes)||p.scenes.length>2000||!Array.isArray(p.facts)||!Array.isArray(p.legacyFacts??[]))throw new NovelError('备份作品结构无效。');
    let sceneIds=new Set(),revisionIds=new Set();
    const mappedScenes=p.scenes.map(s=>{
      if(!s||!nonempty(s.id,200)||sceneIds.has(s.id)||!nonempty(s.title,100)||typeof s.draft!=='string'||s.draft.length>500000||!Array.isArray(s.revisions)||s.revisions.length>5000)throw new NovelError('备份场景结构无效。');
      sceneIds.add(s.id);scenes++;
      const mappedRevisions=s.revisions.map(r=>{
        if(!r||!nonempty(r.id,200)||revisionIds.has(r.id)||!nonempty(r.title,100)||typeof r.body!=='string'||r.body.length>500000||typeof r.createdAt!=='string'||r.createdAt.length>100)throw new NovelError('备份场景版本无效或重复。');
        revisionIds.add(r.id);revisions++;return {id:r.id,title:r.title,body:r.body,created:r.createdAt};
      });return {id:s.id,title:s.title,body:s.draft,revisions:mappedRevisions};
    });
    const all=[...p.facts,...(p.legacyFacts||[])];if(all.length>10000)throw new NovelError('备份事实数量超过限制。');
    const mappedFacts=all.map(f=>{
      if(!f||!nonempty(f.sceneId,200)||!nonempty(f.revisionId,200)||!nonempty(f.statement,500)||!nonempty(f.evidence,2000))throw new NovelError('备份事实格式无效。');
      const s=mappedScenes.find(x=>x.id===f.sceneId),r=s?.revisions.find(x=>x.id===f.revisionId);
      if(!r||!r.body.includes(f.evidence))throw new NovelError('备份事实的来源或原文证据无效。');
      facts++;return {sceneId:f.sceneId,revisionId:f.revisionId,statement:f.statement,evidence:f.evidence,kind:typeof f.kind==='string'&&f.kind.length<=80?f.kind:'其他',status:'needs_review',note:'从服务端备份恢复，仅作旧资料，需重新审阅。'};
    });
    return {name:p.name,description:p.description,scenes:mappedScenes,facts:mappedFacts};
  });
  const summary={projects:projects.length,scenes,revisions,legacyFacts:facts,omitted:OMITTED};
  return {command:{type:'import_legacy',importId:`restore_${input.commandId}`,projects},summary};
}
async function digest(value){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(d)].map(v=>v.toString(16).padStart(2,'0')).join('')}
export async function previewRestore(adapter,owner,input){const {command,summary}=convert(input),current=await readArchive(adapter,owner);if(current.version!==input.expectedVersion)throw new NovelError('当前档案已变化，请重新读取并预览。',409);applyCommand(current.state,command);return {expectedVersion:current.version,summary,previewHash:await digest({command,expectedVersion:input.expectedVersion}),notice:'只作为独立副本追加；列出的内容不会恢复，旧事实需重新审阅。'};}
export async function restoreCopy(adapter,owner,input){const {command,summary}=convert(input);const expected=await digest({command,expectedVersion:input.expectedVersion});if(typeof input.previewHash!=='string'||input.previewHash!==expected)throw new NovelError('备份与预览不一致，请重新预览。',409);const result=await executeCommand(adapter,owner,{commandId:input.commandId,expectedVersion:input.expectedVersion,command});return {...result,summary};}
