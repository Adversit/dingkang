import { providerModelError } from './fallback-service.mjs';
import { providerPolicy,completionText } from './provider-policy.mjs';
/** Pure AI analysis pipeline. Its inputs are caller-supplied; it never commits facts. */
import { normalizeStyleId, roleSystem } from './writing-profile.mjs';
const TYPES = new Set(['world', 'belief', 'speech', 'plan']);
const MAX_RESPONSE = 128 * 1024;
export class AnalysisError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
// A complete provider answer was received, but its proposed analysis did not pass validation.
// These deterministic content errors must not be treated like transport, auth, or quota failures.
export class AnalysisOutputError extends AnalysisError {
  constructor(message) { super(message,502); }
}
const text = (value, max, required = true) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);

// Only auto-run supplies this evidence, from completed draft steps in the same run.
// It is neither a fact catalogue nor output from another reviewer/extractor.
const DRAFT_REVIEW_SYSTEM = `baseScene 是作者选择续写的已保存正文，priorDrafts 是本轮较早候选；origin 为 author_continued 的是作者在继续创作时选回的前稿，未重新生成或验证；两者都与正式 facts 分开。将当前正文与前幕逐项比对：动作或物件去向、人物已知线索、已展示的规则和代价。区分角色推测、误信、布局者证词、确有原文支持的观察；有意悬置的谜题不是自动判错。不要续写、揭谜或把前幕升为设定。每条问题新增 sourceScope："current"（当前正文内部）、"canon"（给出的正式事实）、"baseScene"（所选已保存正文）或 "priorDraft"（前后候选疑似冲突）。quote 始终是当前原文；sourceScope 为 priorDraft 时另填 priorDraftEvidence:{"revisionId":"对应前幕实际 ID","quote":"该幕连续原文"}，指出两段为何需核对；baseScene 同样必须附 baseSceneEvidence:{"revisionId":"所选场景版本 ID","quote":"该版本连续原文"}。current/canon 不填这些字段。factIds 只容纳正式事实 ID，不能填前幕 ID。不能提供两段原文时不要声称跨幕矛盾。`;
function normalizeBaseScene(input) {
  if (input.baseScene === undefined) return {};
  const b=input.baseScene;
  if (input.mode!=='check' || !b || !text(b.revisionId,120) || !text(b.text,12000)) throw new AnalysisError('仅能对照所选已保存正文版本。');
  return {baseScene:{revisionId:b.revisionId,text:b.text}};
}
function normalizePriorDrafts(input) {
  if (input.priorDrafts === undefined) return {};
  if (input.mode !== 'check' || !Array.isArray(input.priorDrafts) || input.priorDrafts.length>4) throw new AnalysisError('较早候选正文仅供本轮跨幕审阅，最多四幕。');
  const current = /^candidate-([1-5])$/.exec(input.scene.revisionId);
  if (!current || input.priorDrafts.length !== Number(current[1])-1) throw new AnalysisError('前幕候选与当前幕次不符。');
  let total=0;
  const priorDrafts=input.priorDrafts.map((draft,index)=>{
    if (!draft || draft.revisionId!==`candidate-${index+1}` || !text(draft.text,12000) || (total+=draft.text.length)>20000) throw new AnalysisError('前幕候选格式或长度无效。');
    if(draft.origin!==undefined && draft.origin!=='author_continued')throw new AnalysisError('前幕候选来源无效。');
    return {revisionId:draft.revisionId,text:draft.text,...(draft.origin?{origin:draft.origin}:{})};
  });
  return {priorDrafts};
}
export function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !['extract','check'].includes(input.mode)) throw new AnalysisError('请选择事实提取或一致性检查。');
  if (input.guidance !== undefined && !text(input.guidance,2000,false)) throw new AnalysisError('作者检查要求格式无效或超过 2000 字符。');
  const styleId = input.mode==='check' ? normalizeStyleId(input.styleId,AnalysisError) : 'general';
  if(input.mode==='check' && input.revealedClues!==undefined && !text(input.revealedClues,2000,false))throw new AnalysisError('本幕公开线索格式无效。');
  const scene = input.scene;
  if (!scene || typeof scene !== 'object' || Array.isArray(scene) || !text(scene.text,12000) || !text(scene.revisionId,120) || (scene.storyTime !== undefined && !text(scene.storyTime,120,false))) throw new AnalysisError('请填写场景正文和版本标识，正文不超过 12000 字符。');
  if (!Array.isArray(input.facts) || input.facts.length > 40) throw new AnalysisError('参考事实最多 40 条。');
  const ids = new Set();
  const facts = input.facts.map(f => {
    if (!f || typeof f !== 'object' || Array.isArray(f) || !text(f.id,120) || ids.has(f.id) || !text(f.statement,500) || !TYPES.has(f.kind) || (f.storyTime !== undefined && !text(f.storyTime,120,false)) || (f.subject !== undefined && !text(f.subject,120,false))) throw new AnalysisError('参考事实格式不正确。');
    ids.add(f.id);
    return { id:f.id, statement:f.statement, kind:f.kind, storyTime:f.storyTime || '', subject:f.subject || '' };
  });
  return { mode:input.mode, ...(input.mode==='check'?{styleId,...(input.revealedClues?{revealedClues:input.revealedClues}:{})}:{}), scene:{ text:scene.text, revisionId:scene.revisionId, storyTime:scene.storyTime || '' }, facts, ...normalizePriorDrafts(input), ...normalizeBaseScene(input), ...(input.guidance !== undefined ? {guidance:input.guidance} : {}) };
}
function evidenceFor(quote, sceneText) {
  if (!text(quote,1000) || !sceneText.includes(quote)) throw new AnalysisOutputError('模型引用的证据不在所给场景中，结果未保存。');
  const start=sceneText.indexOf(quote); let occurrences=0, pos=0;
  while ((pos=sceneText.indexOf(quote,pos)) !== -1) { occurrences++; pos += Math.max(quote.length,1); }
  return {quote,start,end:start+quote.length,occurrences};
}
export function parseOutput(raw, input) {
  let result;
  try { result=JSON.parse(raw); } catch { throw new AnalysisOutputError('模型返回的 JSON 不完整或格式无效，未完成检查。'); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new AnalysisOutputError('模型返回结构无效，未完成检查。');
  if (input.mode === 'extract') {
    if (!Array.isArray(result.candidates)) throw new AnalysisOutputError('模型没有返回 candidates 候选数组。');
    if (result.candidates.length>40) throw new AnalysisOutputError('事实候选超过 40 条的接收上限。');
    const candidates=result.candidates.map(c => {
      if (!c || !text(c.statement,500) || !TYPES.has(c.kind) || !text(c.subject,200,false) || !text(c.storyTime,120,false) || (c.kind==='belief' && !c.subject.trim())) throw new AnalysisOutputError('模型事实候选缺少必要字段，未完成提取。');
      return {statement:c.statement,kind:c.kind,subject:c.subject,storyTime:c.storyTime,evidence:evidenceFor(c.quote,input.scene.text)};
    });
    return {candidates,issues:[]};
  }
  if (!Array.isArray(result.issues)) throw new AnalysisOutputError('模型没有返回 issues 审阅数组。');
  if (result.issues.length>40) throw new AnalysisOutputError('审阅意见超过 40 条的接收上限。');
  const permitted=new Set(input.facts.map(f=>f.id));
  const issues=result.issues.map(i=>{
    if (!i || !text(i.description,1000) || !Array.isArray(i.factIds) || i.factIds.length>40 || !i.factIds.every(id=>typeof id==='string' && permitted.has(id))) throw new AnalysisOutputError('模型问题引用了未知事实或缺少必要字段，未完成检查。');
    const evidence=evidenceFor(i.quote,input.scene.text);
    const result={description:i.description,quote:evidence.quote,evidence,factIds:[...new Set(i.factIds)]};
    if (i.sourceScope!==undefined || i.priorDraftEvidence!==undefined || i.baseSceneEvidence!==undefined || input.priorDrafts?.length || input.baseScene) {
      if (!['current','canon','priorDraft','baseScene'].includes(i.sourceScope)) throw new AnalysisOutputError('审阅意见未区分本幕、正式事实和前幕候选，未完成检查。');
      result.sourceScope=i.sourceScope;
      if (i.sourceScope==='priorDraft') {
        const ref=i.priorDraftEvidence, prior=input.priorDrafts?.find(d=>d.revisionId===ref?.revisionId);
        if (i.baseSceneEvidence!=null || !prior || !text(ref?.quote,1000) || !prior.text.includes(ref.quote)) throw new AnalysisOutputError('跨幕意见未引用所指前幕的连续原文，未完成检查。');
        result.priorDraftEvidence={revisionId:prior.revisionId,sceneIndex:Number(prior.revisionId.slice('candidate-'.length)),...(prior.origin?{origin:prior.origin}:{}),...evidenceFor(ref.quote,prior.text)};
      } else if (i.sourceScope==='baseScene') {
        const ref=i.baseSceneEvidence, prior=input.baseScene;
        if (i.priorDraftEvidence!=null || !prior || ref?.revisionId!==prior.revisionId || !text(ref.quote,1000) || !prior.text.includes(ref.quote)) throw new AnalysisOutputError('续写意见未引用所选保存版本的连续原文，未完成检查。');
        result.baseSceneEvidence={revisionId:prior.revisionId,...evidenceFor(ref.quote,prior.text)};
      } else if (i.priorDraftEvidence!=null || i.baseSceneEvidence!=null || (i.sourceScope==='canon' && !result.factIds.length) || (i.sourceScope==='current' && result.factIds.length)) {
        throw new AnalysisOutputError('审阅意见的证据类型与引用不符，未完成检查。');
      }
    }
    return result;
  });
  return {candidates:[],issues};
}
function endpoint(raw) {
  let url; try { url=new URL(raw); } catch { throw new AnalysisError('模型服务地址配置无效。',503); }
  const h=url.hostname.toLowerCase();
  if (url.protocol!=='https:' || url.username || url.password || url.search || url.hash || h==='localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(h)) throw new AnalysisError('模型服务地址配置无效。',503);
  url.pathname=url.pathname.replace(/\/$/,'')+'/chat/completions'; return url.toString();
}
async function jsonBounded(res) {
  if (!res.body) throw new AnalysisError('模型服务返回空响应。',502);
  const reader=res.body.getReader(), decoder=new TextDecoder(); let bytes=0, raw='';
  try { while (true) { const c=await reader.read(); if(c.done)break; bytes+=c.value.byteLength; if(bytes>MAX_RESPONSE){await reader.cancel();throw new AnalysisError('模型响应超出限制，未完成检查。',502);} raw+=decoder.decode(c.value,{stream:true}); } raw+=decoder.decode(); }
  finally {reader.releaseLock();}
  try{return JSON.parse(raw);}catch{throw new AnalysisError('模型服务响应格式错误，未完成检查。',502);}
}
async function hash(value) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function buildAnalysisMessages(inputRaw){
  const input=validateInput(inputRaw);
  const isCheck=input.mode==='check';
  const extra=isCheck && (input.priorDrafts?.length||input.baseScene)?DRAFT_REVIEW_SYSTEM:'';
  return [{role:'system',content:roleSystem(isCheck?'review':'extract',isCheck?input.styleId:'general',extra)},{role:'user',content:JSON.stringify(input)}];
}
// Exact official Chat Completions endpoint + documented GPT-5.5 IDs only.
// A compatible/custom provider or another role may support JSON mode but not strict schemas.
const strictExtractModels=new Set(['gpt-5.5','gpt-5.5-2026-04-23']);
const candidateProperties={
  statement:{type:'string'},kind:{type:'string',enum:['world','belief','speech','plan']},
  subject:{type:'string'},storyTime:{type:'string'},quote:{type:'string'},
};
const strictExtractFormat={type:'json_schema',json_schema:{name:'novel_fact_candidates',strict:true,schema:{
  type:'object',additionalProperties:false,required:['candidates'],properties:{
    candidates:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:Object.keys(candidateProperties),properties:candidateProperties}},
  },
}}};
export async function analyze(inputRaw, options) {
  const input=validateInput(inputRaw);
  if (!options?.key || !options?.model) throw new AnalysisError('站点尚未配置模型，请先配置服务端模型后再使用 AI 检查。',503);
  const url=endpoint(options.baseUrl || 'https://api.openai.com/v1');
  const totalChars=input.scene.text.length+(input.baseScene?.text?.length||0)+(input.priorDrafts||[]).reduce((n,x)=>n+x.text.length,0);
  const policy=providerPolicy(options.model,totalChars>=1600?'longAnalysis':'analysis');const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),policy.timeoutMs);
  try {
    const response=await (options.fetchImpl || fetch)(url,{method:'POST',redirect:'manual',signal:controller.signal,headers:{'content-type':'application/json',authorization:`Bearer ${options.key}`},body:JSON.stringify({model:options.model,...policy.params,...(input.mode==='extract'&&url==='https://api.openai.com/v1/chat/completions'&&strictExtractModels.has(options.model)?{response_format:strictExtractFormat}:{}),messages:buildAnalysisMessages(input)})});
    if(!response.ok)throw await providerModelError(response,options.model,AnalysisError);
    const result=await jsonBounded(response); const choice=result?.choices?.[0];
    const parsed=parseOutput(completionText(choice,input.mode==='extract'?'事实提取':'审阅',AnalysisError),input);
    return {status:'REVIEW',mode:input.mode,sceneHash:await hash(input.scene.text),inputHash:await hash(JSON.stringify(input)),revisionId:input.scene.revisionId,model:typeof result.model==='string'?result.model.slice(0,200):options.model,...parsed,notice:'仅分析本次提供的场景和事实；结果需作者审阅，不代表全书一致，也不验证服务器当前版本。'};
  } catch(error) {
    if(error instanceof AnalysisError)throw error;
    if(controller.signal.aborted)throw new AnalysisError(`模型分析超过 ${policy.timeoutMs/1000} 秒，未完成检查。`,504);
    throw new AnalysisError('模型服务连接失败，未完成检查。',502);
  } finally {clearTimeout(timer);}
}
