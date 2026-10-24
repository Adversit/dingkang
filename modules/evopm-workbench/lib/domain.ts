import { z } from 'zod';
import type { Action, Approval, Cluster, Plan, Requirement, State, Run, EvidenceLink } from './contracts';

export class DomainError extends Error {
  status:number;
  constructor(message: string, status = 422) { super(message); this.name = 'DomainError'; this.status=status; }
}
const id = z.string().min(1).max(100);
const short = z.string().trim().min(1).max(300);
const text = z.string().trim().max(12000);
const required = text.min(1);
const url = z.string().trim().max(2000).refine(v => !v || /^https:\/\/[^\s]+$/.test(v), '链接须为 HTTPS 地址');
const commit = z.string().trim().regex(/^[0-9a-f]{40}$/i, '须填写完整 40 位 Git commit SHA');
const links = z.array(z.object({ signalId: id, relation: z.enum(['supports','contradicts','insufficient']), note: text }).strict()).max(100);
const requirementFields = { title: short, story: text, scope: text, acceptance: text, links, impact: z.number().min(1).max(5), confidence: z.number().min(0).max(100), effort: z.number().min(1).max(5), critic: text };
const planFields = { title: short, goal: required, nonGoals: required, scope: required, risks: required, acceptance: required, rollback: required, baseCommit: commit, budget: required };
const productFields = { name: short, description: text.optional(), users: text.optional(), goal: text.optional(), repository: url.optional(), metric: text.optional() };
export const actionSchema = z.discriminatedUnion('type', [
  z.object({type:z.literal('product.create'), ...productFields}).strict(),
  z.object({type:z.literal('product.update'),productId:id,...productFields}).strict(),
  z.object({type:z.literal('sample.load')}).strict(),
  z.object({type:z.literal('signals.import'),productId:id,items:z.array(z.object({text:required,source:short.optional(),sourceId:z.string().trim().max(300).optional(),userKey:z.string().trim().max(300).optional(),occurredAt:z.string().datetime({offset:true}).optional(),redacted:z.boolean().optional()}).strict()).min(1).max(200)}).strict(),
  z.object({type:z.literal('cluster.create'),productId:id,title:short,signalIds:z.array(id).min(1).max(200)}).strict(),
  z.object({type:z.literal('cluster.merge'),productId:id,title:short,clusterIds:z.array(id).min(2).max(50)}).strict(),
  z.object({type:z.literal('cluster.split'),productId:id,clusterId:id,title:short,signalIds:z.array(id).min(1).max(200)}).strict(),
  z.object({type:z.literal('cluster.discard'),productId:id,clusterId:id,reason:required,duplicateOf:id.optional()}).strict(),
  z.object({type:z.literal('requirement.create'),productId:id,clusterId:id,...requirementFields}).strict(),
  z.object({type:z.literal('requirement.update'),productId:id,requirementId:id,...requirementFields}).strict(),
  z.object({type:z.literal('requirement.decide'),productId:id,requirementId:id,decision:z.enum(['approved','rejected','needs_evidence']),note:required}).strict(),
  z.object({type:z.literal('plan.create'),productId:id,requirementId:id,...planFields}).strict(),
  z.object({type:z.literal('plan.update'),productId:id,planId:id,...planFields}).strict(),
  z.object({type:z.literal('plan.approve'),productId:id,planId:id,decision:z.enum(['approved','rejected']),note:required}).strict(),
  z.object({type:z.literal('job.export'),productId:id,planId:id}).strict(),
  z.object({type:z.literal('run.analyze'),productId:id,clusterId:id}).strict(),
  z.object({type:z.literal('run.import'),productId:id,clusterId:id,result:z.unknown()}).strict(),
  z.object({type:z.literal('evaluation.record'),productId:id,planId:id,commit,kind:z.enum(['ci','evaluation']),status:z.enum(['passed','failed','pending']),url,note:required}).strict(),
  z.object({type:z.literal('release.record'),productId:id,planId:id,commit,url:url.refine(v=>v.length>0,'请填写发布出处'),note:required}).strict(),
  z.object({type:z.literal('outcome.record'),productId:id,planId:id,metric:short,before:z.number().finite(),after:z.number().finite(),unit:short,beforeWindow:short,afterWindow:short,sampleSize:z.number().int().min(1).max(1e10),source:required,confounders:required}).strict(),
]);
export const requestSchema = z.object({ revision:z.number().int().min(0), requestId:z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/), action:actionSchema }).strict();
export function parseAction(value: unknown): Action {
  const result = actionSchema.safeParse(value);
  if (!result.success) throw new DomainError(result.error.issues.slice(0,3).map(i=>`${i.path.join('.')}: ${i.message}`).join('；'), 400);
  return result.data as Action;
}
export function emptyState(): State { return {products:[],signals:[],clusters:[],requirements:[],plans:[],approvals:[],runs:[],jobs:[],evaluations:[],releases:[],outcomes:[],audit:[]}; }
export async function sha256(value:string):Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function uid(prefix:string) { return `${prefix}_${crypto.randomUUID()}`; }
function normalize(value:string) { return value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase(); }
function unique<T>(items:T[]):T[] { return [...new Set(items)]; }
function findOwned<T extends {id:string;productId:string}>(rows:T[], itemId:string, productId:string, label:string):T {
  const item = rows.find(row=>row.id===itemId && row.productId===productId);
  if (!item) throw new DomainError(`${label}不存在或不属于当前产品`,404);
  return item;
}
function requirementQuality(fields:Pick<Requirement,'story'|'scope'|'acceptance'|'links'|'critic'>):Requirement['quality'] {
  const checks = [
    {label:'明确用户与情境（至少 12 字）',pass:fields.story.trim().length>=12},
    {label:'边界清晰（至少 8 字）',pass:fields.scope.trim().length>=8},
    {label:'可检验的验收描述（至少 12 字）',pass:fields.acceptance.trim().length>=12},
    {label:'至少一条人工标注的支持证据',pass:fields.links.some(l=>l.relation==='supports'&&l.note.trim().length>=4)},
    {label:'记录反证审查与不确定性（至少 8 字）',pass:fields.critic.trim().length>=8},
  ];
  return {score:checks.filter(c=>c.pass).length*20,checks,missing:checks.filter(c=>!c.pass).map(c=>c.label)};
}
function validateLinks(state:State,productId:string,cluster:Cluster,evidence:EvidenceLink[]) {
  if(unique(evidence.map(l=>l.signalId)).length!==evidence.length) throw new DomainError('同一证据只能标注一次关系');
  for(const link of evidence) {
    findOwned(state.signals,link.signalId,productId,'证据');
    if(!cluster.signalIds.includes(link.signalId)) throw new DomainError('证据必须来自该需求的问题簇');
  }
}
export function currentApproval(state:State,plan:Plan):Approval|null {
  const requirement = state.requirements.find(r=>r.id===plan.requirementId && r.productId===plan.productId);
  const latest = state.approvals.filter(a=>a.planId===plan.id && a.productId===plan.productId).at(-1);
  const product=state.products.find(p=>p.id===plan.productId);
  if(!product || (plan.productVersion??1)!==(product.version??1))return null;
  if(!requirement || requirement.decision!=='approved' || !latest || latest.decision!=='approved') return null;
  if(latest.planVersion!==plan.version || latest.inputVersion!==plan.inputVersion || latest.inputVersion!==requirement.version || latest.baseCommit!==plan.baseCommit) return null;
  return latest;
}
function requireApproval(state:State,plan:Plan) {
  const approval=currentApproval(state,plan);
  if(!approval) throw new DomainError('方案未获有效批准，或需求、方案、基线已变化；请重新审查批准',409);
  return approval;
}
function invalidate(state:State,plans:Plan[],note:string,actor:string,now:string) {
  for(const plan of plans) {
    const latest=state.approvals.filter(a=>a.planId===plan.id).at(-1);
    if(latest?.decision==='approved') state.approvals.push({id:uid('approval'),productId:plan.productId,planId:plan.id,planVersion:plan.version,inputVersion:plan.inputVersion,baseCommit:plan.baseCommit,decision:'rejected',note:`批准自动失效：${note}`,actor,createdAt:now});
  }
}
function requireEditableCluster(state:State,cluster:Cluster) {
  if(cluster.status!=='active') throw new DomainError('只能编辑未关联需求的有效问题簇',409);
  if(state.requirements.some(r=>r.clusterId===cluster.id)) throw new DomainError('该问题簇已关联需求；请先建立新的问题簇，保留历史证据',409);
}
// Engine imports deliberately create inspectable run results, never approvals or execution jobs.
export const engineResultSchema = z.object({
  schemaVersion:z.literal('1.0'),
  summary:z.string().trim().min(1).max(12000),
  evidence:z.array(z.object({signalId:id,relation:z.enum(['supports','contradicts','insufficient']),note:required}).strict()).max(100),
  recommendations:z.array(z.object({title:short,story:required,scope:required,acceptance:required,critic:required}).strict()).max(20),
  model:z.string().max(200).optional(),
}).strict();
export type EngineResult = z.infer<typeof engineResultSchema>;
export type AnalysisInput = {product:State['products'][number];cluster:Cluster;signals:State['signals'];inputVersion:string};
export type AnalysisOutput = {result:unknown;model:string;durationMs:number};
export type DomainContext = {actor:string;now?:string;analyze?:(input:AnalysisInput)=>Promise<AnalysisOutput>};
export type Transition = {state:State;result?:unknown;notice?:string};

export async function applyAction(original:State, rawAction:unknown, context:DomainContext):Promise<Transition> {
  const action=parseAction(rawAction);
  const state:State=structuredClone(original);
  const now=context.now??new Date().toISOString();
  const actor=context.actor;
  let result:unknown;
  let notice:string|undefined;
  if(action.type==='sample.load') {
    const existing=state.products.find(p=>p.mode==='sample'&&p.name==='晚灯 · AI 陪伴（示例）');
    if(existing) return {state,result:{productId:existing.id},notice:'示例已存在，保留你的修改'};
    const sample=await buildSample(actor,now);
    for(const key of Object.keys(state) as (keyof State)[]) (state[key] as unknown[]).push(...sample[key]);
    assertCapacity(state);
    return {state,result:{productId:sample.products[0].id},notice:'已载入演示数据；这些反馈、判断和指标均为虚构示例'};
  }
  if(action.type==='product.create') {
    const product={id:uid('product'),version:1,name:action.name,description:action.description??'',users:action.users??'',goal:action.goal??'',repository:action.repository??'',metric:action.metric??'',mode:'manual' as const,createdAt:now};
    state.products.push(product); result={productId:product.id};
    state.audit.push({id:uid('audit'),productId:product.id,action:action.type,detail:'手工创建产品，尚未连接外部数据源',createdAt:now});
    assertCapacity(state);
    return {state,result};
  }
  const product=state.products.find(p=>p.id===action.productId);
  if(!product) throw new DomainError('产品不存在或无访问权限',404);
  const productId=product.id;
  const mode=product.mode==='sample'?'sample' as const:'manual' as const;
  switch(action.type) {
    case 'product.update': {
      Object.assign(product,{version:(product.version??1)+1,name:action.name,description:action.description??'',users:action.users??'',goal:action.goal??'',repository:action.repository??'',metric:action.metric??''});
      // Product intent and repository are part of the reviewed context.
      invalidate(state,state.plans.filter(p=>p.productId===productId),'产品背景或目标已修改',actor,now);
      break;
    }
    case 'signals.import': {
      let imported=0,duplicates=0;
      const ids:string[]=[];
      for(const item of action.items) {
        const source=item.source??'手工录入';
        const dedupeKey=await sha256(JSON.stringify(item.sourceId ? [productId,'source',normalize(source),item.sourceId] : [productId,'text',normalize(item.text)]));
        if(state.signals.some(s=>s.productId===productId&&s.dedupeKey===dedupeKey)){duplicates++;continue;}
        const signal={id:uid('signal'),productId,text:item.text,source,sourceId:item.sourceId??'',userKey:item.userKey??'',occurredAt:item.occurredAt??now,redacted:item.redacted??false,dedupeKey,mode,createdAt:now};
        state.signals.push(signal); ids.push(signal.id); imported++;
      }
      result={imported,duplicates,signalIds:ids}; notice=`导入 ${imported} 条，去重跳过 ${duplicates} 条`; break;
    }
    case 'cluster.create': {
      for(const signalId of action.signalIds) findOwned(state.signals,signalId,productId,'反馈');
      const cluster={id:uid('cluster'),productId,title:action.title,signalIds:unique(action.signalIds),status:'active' as const,reason:'',mode};state.clusters.push(cluster);result={clusterId:cluster.id};break;
    }
    case 'cluster.merge': {
      const ids=unique(action.clusterIds);if(ids.length<2) throw new DomainError('至少选择两个不同问题簇');
      const clusters=ids.map(clusterId=>findOwned(state.clusters,clusterId,productId,'问题簇'));
      clusters.forEach(c=>requireEditableCluster(state,c));
      const merged={id:uid('cluster'),productId,title:action.title,signalIds:unique(clusters.flatMap(c=>c.signalIds)),status:'active' as const,reason:'',mode};
      for(const c of clusters){c.status='discarded';c.reason=`合并至 ${merged.id}`;c.duplicateOf=merged.id;}
      state.clusters.push(merged);result={clusterId:merged.id};break;
    }
    case 'cluster.split': {
      const cluster=findOwned(state.clusters,action.clusterId,productId,'问题簇');requireEditableCluster(state,cluster);
      const ids=unique(action.signalIds);
      if(ids.some(s=>!cluster.signalIds.includes(s))) throw new DomainError('拆分证据必须属于原问题簇');
      if(ids.length>=cluster.signalIds.length) throw new DomainError('拆分后原问题簇至少保留一条反馈');
      cluster.signalIds=cluster.signalIds.filter(s=>!ids.includes(s));
      const split={id:uid('cluster'),productId,title:action.title,signalIds:ids,status:'active' as const,reason:`由 ${cluster.id} 拆分`,mode};state.clusters.push(split);result={clusterId:split.id};break;
    }
    case 'cluster.discard': {
      const cluster=findOwned(state.clusters,action.clusterId,productId,'问题簇');requireEditableCluster(state,cluster);
      if(action.duplicateOf){findOwned(state.clusters,action.duplicateOf,productId,'重复目标问题簇');if(action.duplicateOf===cluster.id) throw new DomainError('不能将问题簇标记为自身的重复项');}
      Object.assign(cluster,{status:'discarded',reason:action.reason,duplicateOf:action.duplicateOf});break;
    }
    case 'requirement.create':
    case 'requirement.update': {
      const existing=action.type==='requirement.update'?findOwned(state.requirements,action.requirementId,productId,'需求'):undefined;
      const cluster=findOwned(state.clusters,existing?existing.clusterId:(action as Extract<Action,{type:'requirement.create'}>).clusterId,productId,'问题簇');
      if(cluster.status==='discarded') throw new DomainError('已丢弃的问题簇不能生成需求');
      validateLinks(state,productId,cluster,action.links);
      const fields={title:action.title,story:action.story,scope:action.scope,acceptance:action.acceptance,links:action.links,critic:action.critic};
      const quality=requirementQuality(fields);
      const score={impact:action.impact,confidence:action.confidence,effort:action.effort,priority:Math.round(action.impact*(action.confidence/100)/action.effort*100)/100};
      if(existing){invalidate(state,state.plans.filter(p=>p.requirementId===existing.id),'需求内容或证据关系已修改',actor,now);Object.assign(existing,fields,{quality,score,version:existing.version+1,decision:'draft',decisionNote:''});result={requirementId:existing.id};}
      else{const requirement:Requirement={id:uid('requirement'),productId,clusterId:cluster.id,...fields,quality,score,decision:'draft',decisionNote:'',version:1,mode};state.requirements.push(requirement);cluster.status='linked';result={requirementId:requirement.id};}
      break;
    }
    case 'requirement.decide': {
      const requirement=findOwned(state.requirements,action.requirementId,productId,'需求');
      requirement.quality=requirementQuality(requirement);
      if(action.decision==='approved' && requirement.quality.missing.length) throw new DomainError(`需求未通过质量门禁：${requirement.quality.missing.join('；')}`);
      if(action.decision!=='approved') invalidate(state,state.plans.filter(p=>p.requirementId===requirement.id),'上游需求已撤回批准',actor,now);
      requirement.decision=action.decision;requirement.decisionNote=action.note;break;
    }
    case 'plan.create':
    case 'plan.update': {
      const existing=action.type==='plan.update'?findOwned(state.plans,action.planId,productId,'方案'):undefined;
      const requirement=findOwned(state.requirements,existing?existing.requirementId:(action as Extract<Action,{type:'plan.create'}>).requirementId,productId,'需求');
      if(requirement.decision!=='approved') throw new DomainError('请先人工批准需求再起草或更新方案',409);
      const fields={title:action.title,goal:action.goal,nonGoals:action.nonGoals,scope:action.scope,risks:action.risks,acceptance:action.acceptance,rollback:action.rollback,baseCommit:action.baseCommit.toLowerCase(),budget:action.budget,inputVersion:requirement.version,productVersion:product.version??1};
      if(existing){invalidate(state,[existing],'方案或基线已修改',actor,now);Object.assign(existing,fields,{version:existing.version+1});result={planId:existing.id};}
      else{const plan:Plan={id:uid('plan'),productId,requirementId:requirement.id,...fields,version:1,mode};state.plans.push(plan);result={planId:plan.id};}
      break;
    }
    case 'plan.approve': {
      const plan=findOwned(state.plans,action.planId,productId,'方案');
      const requirement=findOwned(state.requirements,plan.requirementId,productId,'需求');
      if(action.decision==='approved'&&(requirement.decision!=='approved'||requirement.version!==plan.inputVersion||(plan.productVersion??1)!==(product.version??1))) throw new DomainError('产品背景或需求已变化，或需求未批准；请更新方案至当前版本',409);
      state.approvals.push({id:uid('approval'),productId,planId:plan.id,planVersion:plan.version,inputVersion:plan.inputVersion,baseCommit:plan.baseCommit,decision:action.decision,note:action.note,actor,createdAt:now});break;
    }
    case 'job.export': {
      const plan=findOwned(state.plans,action.planId,productId,'方案');const approval=requireApproval(state,plan);
      const requirement=findOwned(state.requirements,plan.requirementId,productId,'需求');
      const job={id:uid('job'),productId,planId:plan.id,planVersion:plan.version,inputVersion:plan.inputVersion,approvalId:approval.id,baseCommit:plan.baseCommit,status:'exported' as const,reason:'变更包已导出；未连接执行器，未执行代码、未创建 PR',createdAt:now};state.jobs.push(job);
      result={filename:`evopm-change-${plan.id}-v${plan.version}.json`,changePackage:{schemaVersion:'1.0',executionStatus:'not_executed',product:{id:product.id,name:product.name,repository:product.repository},plan,requirement,approval,evidence:requirement.links.map(link=>({relation:link.relation,note:link.note,signal:findOwned(state.signals,link.signalId,productId,'证据')})),exportedAt:now}};
      notice=job.reason;break;
    }
    case 'run.analyze':
    case 'run.import': {
      const cluster=findOwned(state.clusters,action.clusterId,productId,'问题簇');
      if(cluster.status==='discarded') throw new DomainError('不能分析已丢弃的问题簇');
      const signals=cluster.signalIds.map(s=>findOwned(state.signals,s,productId,'反馈'));
      const inputVersion=await sha256(JSON.stringify({product,cluster,signals}));
      const attempt=state.runs.filter(r=>r.productId===productId&&r.inputVersion===inputVersion).length+1;
      const run:Run={id:uid('run'),productId,mode:mode==='sample'?'sample':action.type==='run.import'?'replay':'live',status:'waiting',model:'',inputVersion,promptVersion:'evopm-evidence-v1',attempt,budget:'1 次请求；30 秒；响应最多 150 KB',createdAt:now,durationMs:0,steps:[]};
      state.runs.push(run);
      run.steps.push({id:'input',name:'输入快照',status:'completed',message:`已锁定 ${signals.length} 条反馈`,checkpoint:inputVersion});
      let incoming:unknown;
      try {
        if(action.type==='run.import') incoming=action.result;
        else {
          if(!context.analyze) throw new DomainError('未连接模型或分析引擎。可手工建立需求，或导入 schemaVersion 1.0 的引擎 JSON。',503);
          const started=Date.now();
          try{const output=await context.analyze({product,cluster,signals,inputVersion});incoming=output.result;run.model=output.model;run.durationMs=output.durationMs;}
          finally{if(!run.durationMs)run.durationMs=Date.now()-started;}
        }
        const raw=JSON.stringify(incoming);
        if(!raw||new TextEncoder().encode(raw).byteLength>100000) throw new DomainError('引擎结果为空或超过 100 KB');
        run.rawResult=raw;
        const parsed=engineResultSchema.safeParse(incoming);
        if(!parsed.success) throw new DomainError(`引擎结果格式不符合 schemaVersion 1.0：${parsed.error.issues.slice(0,2).map(i=>i.path.join('.')+' '+i.message).join('；')}`);
        validateLinks(state,productId,cluster,parsed.data.evidence);
        if(!run.model) run.model=parsed.data.model??'';
        run.status='completed';run.steps.push({id:'validated',name:'结果校验',status:'completed',message:'结构与证据归属已验证；建议尚未转为人工需求或批准',checkpoint:await sha256(raw)});
        result={runId:run.id,result:parsed.data};notice='分析结果已保存，等待人工核验；不会自动创建批准或执行任务';
      } catch(error) {
        run.status='failed';run.mode=mode==='sample'?'sample':action.type==='run.import'?'replay':'degraded';
        const message=error instanceof DomainError?error.message:'分析服务请求失败；请检查服务端配置并重试';
        run.steps.push({id:'analyze',name:'分析检查点',status:'failed',message,checkpoint:inputVersion});notice=message;result={runId:run.id,error:message};
      }
      break;
    }
    case 'evaluation.record': {
      const plan=findOwned(state.plans,action.planId,productId,'方案');const approval=requireApproval(state,plan);
      if(!action.url) throw new DomainError('请填写可追溯的 CI 或评测出处链接');
      state.evaluations.push({id:uid('evaluation'),productId,planId:plan.id,planVersion:plan.version,inputVersion:plan.inputVersion,baseCommit:plan.baseCommit,approvalId:approval.id,commit:action.commit.toLowerCase(),kind:action.kind,status:action.status,url:action.url,note:action.note,mode,createdAt:now});
      notice='已记录人工回执，平台未自动运行或验证外部 CI / 评测';break;
    }
    case 'release.record': {
      const plan=findOwned(state.plans,action.planId,productId,'方案');const approval=requireApproval(state,plan);const sha=action.commit.toLowerCase();
      const job=state.jobs.find(j=>j.planId===plan.id&&j.planVersion===plan.version&&j.approvalId===approval.id&&j.status==='exported');
      if(!job) throw new DomainError('请先导出当前批准版本的变更包',409);
      for(const kind of ['ci','evaluation'] as const){
        const evaluation=state.evaluations.filter(e=>e.productId===productId&&e.planId===plan.id&&e.commit===sha&&e.kind===kind&&e.approvalId===approval.id&&e.planVersion===plan.version&&e.inputVersion===plan.inputVersion&&e.baseCommit===plan.baseCommit).at(-1);
        if(evaluation?.status!=='passed') throw new DomainError(`${kind==='ci'?'CI':'效果评测'}未针对当前批准版本和完整相同 commit 通过`,409);
      }
      if(state.releases.some(r=>r.planId===plan.id&&r.commit===sha&&r.approvalId===approval.id)) throw new DomainError('此批准版本与 commit 已登记发布',409);
      const release={id:uid('release'),productId,planId:plan.id,planVersion:plan.version,approvalId:approval.id,commit:sha,url:action.url,note:action.note,createdAt:now};state.releases.push(release);result={releaseId:release.id};notice='已登记人工发布证据；此操作不部署代码';break;
    }
    case 'outcome.record': {
      const plan=findOwned(state.plans,action.planId,productId,'方案');
      const release=state.releases.filter(r=>r.productId===productId&&r.planId===plan.id&&r.planVersion===plan.version).at(-1);
      if(!release) throw new DomainError('请先登记该方案当前版本的发布证据，再记录效果回收',409);
      if(action.beforeWindow===action.afterWindow) throw new DomainError('发布前后的观察窗口不能完全相同');
      state.outcomes.push({id:uid('outcome'),releaseId:release.id,commit:release.commit,planVersion:plan.version,productId,planId:plan.id,metric:action.metric,before:action.before,after:action.after,unit:action.unit,beforeWindow:action.beforeWindow,afterWindow:action.afterWindow,sampleSize:action.sampleSize,source:action.source,confounders:action.confounders,createdAt:now});
      notice='已记录观察数据；前后变化不能单独证明因果关系';break;
    }
    default: { const exhaustive:never=action; throw new DomainError(`不支持的操作 ${String(exhaustive)}`,400); }
  }
  state.audit.push({id:uid('audit'),productId,action:action.type,detail:`${actor} · ${notice??'操作已保存'}`,createdAt:now});
  // Bound persisted collections without silently discarding evidence or audit history.
  assertCapacity(state);
  return {state,result,notice};
}

function assertCapacity(state:State){
  if(state.products.length>100||state.signals.length>20000||state.audit.length>50000||new TextEncoder().encode(JSON.stringify(state)).byteLength>1_800_000) throw new DomainError('当前工作台已达到容量上限（约 1.8 MB），请联系管理员归档；本次修改未保存',413);
}

async function buildSample(actor:string,now:string):Promise<State> {
  let state=emptyState();
  async function run(action:Action){const transition=await applyAction(state,action,{actor,now});state=transition.state;return transition.result as Record<string,string>;}
  const {productId}=await run({type:'product.create',name:'晚灯 · AI 陪伴（示例）',description:'虚构演示产品。让独居青年在晚间获得有边界、可掌控的 AI 情感陪伴。',users:'22–35 岁独居青年；睡前轻量倾诉',goal:'提高每周主动回访率，同时降低过度依赖风险',metric:'7 日主动回访率 / 越界回复率 / 记忆纠错率'});
  state.products[0].mode='sample';
  await run({type:'signals.import',productId,items:[
    {text:'昨天说过今天要面试，晚上回来它完全不记得了，有点失落。',source:'示例 · 用户访谈',sourceId:'demo-001',userKey:'访谈 A',redacted:true},
    {text:'希望能看到它记住了什么，也能自己删除，不想每句倾诉都永久保存。',source:'示例 · 用户访谈',sourceId:'demo-002',userKey:'访谈 B',redacted:true},
    {text:'它记错我和朋友的关系，后面一直沿用错误信息。我不知道在哪里纠正。',source:'示例 · 客服记录',sourceId:'demo-003',userKey:'用户 C',redacted:true},
    {text:'我更喜欢每次从零开始，不希望 AI 保存任何私人生活细节。',source:'示例 · 反向意见',sourceId:'demo-004',userKey:'用户 D',redacted:true},
    {text:'凌晨一点又收到主动关心的消息，反而把我从睡眠中叫醒。',source:'示例 · 应用反馈',sourceId:'demo-005',userKey:'用户 E',redacted:true},
    {text:'连续几天不打开就用很失落的语气找我，有点被绑住了。',source:'示例 · 用户访谈',sourceId:'demo-006',userKey:'访谈 F',redacted:true},
    {text:'能不能自己设置每周联系几次，睡觉时间不打扰？',source:'示例 · 应用反馈',sourceId:'demo-007',userKey:'用户 G',redacted:true},
    {text:'我只是想倾诉一下，它总是给我很长的建议，感觉没被理解。',source:'示例 · 对话回访',sourceId:'demo-008',userKey:'用户 H',redacted:true},
    {text:'如果聊天开始能选只是听我说，或帮我想办法，会更舒服。',source:'示例 · 用户访谈',sourceId:'demo-009',userKey:'访谈 I',redacted:true},
    {text:'我想换一个更温暖的聊天背景，白色页面晚上太刺眼。',source:'示例 · 应用反馈',sourceId:'demo-010',userKey:'用户 J',redacted:true},
  ]});
  const ids=state.signals.map(s=>s.id);
  const memory=await run({type:'cluster.create',productId,title:'陪伴记忆不连续，且缺少可控性',signalIds:ids.slice(0,4)});
  const quiet=await run({type:'cluster.create',productId,title:'主动关心缺少节奏与免打扰边界',signalIds:ids.slice(4,7)});
  await run({type:'cluster.create',productId,title:'倾听与建议的对话模式不匹配',signalIds:ids.slice(7,9)});
  await run({type:'cluster.create',productId,title:'晚间阅读的视觉舒适度',signalIds:ids.slice(9)});
  const memoryReq=await run({type:'requirement.create',productId,clusterId:memory.clusterId,title:'给陪伴记忆一个可查看、纠正与关闭的入口',story:'作为希望长期倾诉的独居用户，我需要知道 AI 记住了哪些信息，并能纠正与关闭记忆，建立可控的信任。',scope:'本期仅支持查看、编辑、删除和关闭记忆；不做跨产品记忆共享。',acceptance:'关闭后新对话不写入长期记忆；删除项在下一轮对话不可召回；纠正项必须覆盖原记录并显示更新时间。',links:[{signalId:ids[0],relation:'supports',note:'支持记忆连续性需求，但不能证明用户愿意默认开启保存'},{signalId:ids[1],relation:'supports',note:'直接支持记忆可见和删除控制'},{signalId:ids[2],relation:'supports',note:'直接支持记忆纠错能力'},{signalId:ids[3],relation:'contradicts',note:'反对强制保存，要求保持关闭选项与明确同意'}],impact:5,confidence:75,effort:3,critic:'仅有四条虚构示例反馈，不能代表真实人群；可控性可能增加操作负担，需先验证理解度。'});
  await run({type:'requirement.decide',productId,requirementId:memoryReq.requirementId,decision:'approved',note:'示例人工决策：优先验证可控记忆；保留用户关闭权，并在小范围验证。'});
  await run({type:'plan.create',productId,requirementId:memoryReq.requirementId,title:'记忆控制中心 · 小步验证',goal:'降低错误记忆的重复出现，让用户理解并控制保存内容。',nonGoals:'不扩展跨产品记忆；不改变情绪回应策略；不默认保存所有聊天。',scope:'新增记忆列表、纠正、删除、总开关；读取链路执行关闭和删除过滤。',risks:'删除缓存未失效；纠错覆盖不完整；设置文案让用户误以为训练数据也同步删除。',acceptance:'单元与集成测试覆盖关闭、删除、纠正；20 条对话回放中删除项零召回；所有文案清楚描述范围。',rollback:'关闭记忆控制入口与新写入功能，保留用户已删除标记，不恢复被删除内容。',baseCommit:'0123456789abcdef0123456789abcdef01234567',budget:'示例预算：2 人日；回放不超过 20 条；暂不调用外部执行器'});
  await run({type:'requirement.create',productId,clusterId:quiet.clusterId,title:'允许用户设定主动关心与免打扰时段',story:'作为需要睡前陪伴但不希望被打扰的用户，我希望自己决定何时收到关心。',scope:'仅配置免打扰窗口和每周频次，不增加新的推送渠道。',acceptance:'免打扰窗口不发送主动消息；更改后立即生效；频次上限按用户时区计算。',links:[{signalId:ids[4],relation:'supports',note:'反馈直接描述深夜打扰问题'},{signalId:ids[5],relation:'supports',note:'提示需去除情感施压式召回'},{signalId:ids[6],relation:'supports',note:'直接表达频次与免打扰配置需求'}],impact:4,confidence:65,effort:2,critic:'样本为虚构，仅用于流程演示；应核验真实推送日志与实际时区覆盖。'});
  await run({type:'run.import',productId,clusterId:memory.clusterId,result:{schemaVersion:'1.0',summary:'示例回放：记忆连续性与用户控制应共同设计，不能因多数支持记忆而忽略关闭诉求。',evidence:[{signalId:ids[3],relation:'contradicts',note:'反对强制记忆，需保留退出机制'}],recommendations:[{title:'记忆控制中心',story:'在长期陪伴中给予用户可理解的记忆控制。',scope:'查看、纠正、删除、关闭。',acceptance:'关闭后不写入，删除后不召回。',critic:'未经真实模型运行；这些内容为人工编写的演示回放。'}]}});
  state.audit.push({id:uid('audit'),productId,action:'sample.load',detail:'整套内容为虚构示例，示例批准不是实际审批；方案等待你的审查。',createdAt:now});
  return state;
}
