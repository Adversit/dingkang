import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePreview,runPrepared} from '../modules/novel-orchestration/auto-run.mjs';
import {analyze,AnalysisOutputError,AnalysisError} from '../modules/novel-ai/analysis.mjs';
const model='fixture',baseUrl='https://api.openai.com/v1',key='fixture';
const input={mode:'idea',idea:'测试夹具：两章连续推理。',sceneCount:2,scenePlans:['第一章：铜环断裂','第二章：守门人见证'],proseUnit:'chapter',writingProfile:{styleId:'xuanhuan',revealNow:'第2章：只展示第二张纸。'}};
const prose=['他亲手折断铜环。','守门人说铜环从未断裂。'];
const complete=content=>Response.json({model,choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]});
async function run(req,respond,overrides={}){
 const prepared=await preparePreview(req,null,model,baseUrl);const calls=[],events=[];
 for await(const event of runPrepared({input:req,...prepared,key,model,baseUrl,loadArchive:async()=>null,
   generate:async p=>{const info=JSON.parse(p.messages.at(-1).content);calls.push(['draft',info.sceneIndex,info]);return {text:prose[info.sceneIndex-1]};},
   runAnalysis:async(i,opts)=>{calls.push([i.mode,i.scene.revisionId,i]);return analyze(i,{...opts,fetchImpl:async()=>respond(i)});},...overrides
 }))events.push(event);return {prepared,calls,events};
}
test('complete model answer with missing/false evidence leaves analysis incomplete and does not replay it or block later authorized chapters',async()=>{
 const {calls,events}=await run(input,i=>{
  if(i.scene.revisionId==='candidate-1')return i.mode==='extract'?complete({facts:[]}):complete({issues:[{description:'测试错误引文',quote:'编造引文',factIds:[]}]});
  return complete(i.mode==='extract'?{candidates:[]}:{issues:[{description:'铜环真伪待核',quote:'从未断裂',factIds:[],sourceScope:'priorDraft',priorDraftEvidence:{revisionId:'candidate-1',quote:'折断铜环'}}]});
 });
 assert.deepEqual(calls.map(c=>c[0]),['draft','extract','check','draft','extract','check']);
 const incomplete=events.filter(e=>e.type==='analysis_incomplete');assert.deepEqual(incomplete.map(e=>[e.data.stage,e.data.sceneIndex]),[['extract',1],['review',1]]);
 assert.match(incomplete[0].data.error,/candidates/);assert.match(incomplete[1].data.error,/证据/);
 assert.deepEqual(events.filter(e=>e.type==='draft_ready').map(e=>e.data.text),prose);
 assert.deepEqual(events.filter(e=>e.type==='review_ready').map(e=>e.data.sceneIndex),[2]);assert.deepEqual(events.filter(e=>e.type==='extract_ready').map(e=>e.data.sceneIndex),[2]);
 assert.equal(events.at(-1).data.status,'PARTIAL_REVIEW');assert.equal(events.at(-1).data.incompleteStages.length,2);
});
test('transport, provider HTTP denial and cancellation after analysis error do not trigger any further model work',async()=>{
 for(const result of [()=>{throw new Error('offline')},()=>new Response(null,{status:401}),()=>new Response(null,{status:429}),()=>new Response('not a provider response')]){
  const {events,calls}=await run(input,result);assert.deepEqual(calls.map(c=>c[0]),['draft','extract']);assert.equal(events.at(-1).type,'error');assert.equal(events.some(e=>e.type==='analysis_incomplete'),false);
 }
 let cancelled=false;const {events,calls}=await run(input,()=>{cancelled=true;return complete({invalid:true})},{isCancelled:()=>cancelled});
 assert.deepEqual(calls.map(c=>c[0]),['draft','extract']);assert.ok(!events.some(e=>e.type==='complete'));
});
test('resuming explicitly selected earlier prose starts at the next chapter, binds its text in preview and keeps it outside extraction and canon',async()=>{
 const resumed={...input,continuedDrafts:[prose[0]]};
 const {calls,events,prepared}=await run(resumed,i=>complete(i.mode==='extract'?{candidates:[]}:{issues:[]}));
 assert.equal(prepared.startSceneIndex,2);
 assert.notEqual(prepared.previewHash,(await preparePreview({...resumed,continuedDrafts:['作者另选的原稿。']},null,model,baseUrl)).previewHash);
 assert.deepEqual(events.find(e=>e.type==='stage_start'&&e.data.stage==='draft').data.messages,prepared.firstMessages);
 assert.deepEqual(calls.map(c=>c[0]),['draft','extract','check']);assert.equal(calls[0][1],2);
 assert.equal(calls[0][2].authorContinuedCount,1);assert.deepEqual(calls[0][2].previousDrafts,[prose[0]]);assert.match(calls[0][2].scenePlan,/第二章/);
 assert.ok(!('priorDrafts' in calls[1][2]));assert.deepEqual(calls[2][2].facts,[]);
 assert.equal(calls[2][2].priorDrafts[0].origin,'author_continued');assert.equal(events.at(-1).data.continuedDraftCount,1);
 assert.deepEqual(events.filter(e=>e.type==='draft_ready').map(e=>e.data.sceneIndex),[2]);
});
test('resume rejects forged ids, gaps, overflow and already-complete prefixes before billing',async()=>{
 for(const continuedDrafts of [[],[prose[0],prose[1]],[''],[{id:'candidate-1',text:'行'}],['x'.repeat(12001)]]){
  await assert.rejects(()=>preparePreview({...input,continuedDrafts},null,model,baseUrl),/连续前稿/);
 }
 await assert.rejects(()=>preparePreview({...input,sceneCount:4,continuedDrafts:['x'.repeat(11000),'y'.repeat(11000)]},null,model,baseUrl),/20000/);
});
test('model content validation errors are distinct from configuration/transport errors',async()=>{
 const i={mode:'check',scene:{revisionId:'fixture',text:'他望向长街。'},facts:[]};
 await assert.rejects(()=>analyze(i,{key,model,baseUrl,fetchImpl:async()=>complete({})}),e=>e instanceof AnalysisOutputError);
 await assert.rejects(()=>analyze(i,{key,model,baseUrl,fetchImpl:async()=>new Response(null,{status:503})}),e=>e instanceof AnalysisError&&!(e instanceof AnalysisOutputError));
});
test('only verified official GPT-5.5 extract uses strict candidates schema, and independent evidence checking stays active',async()=>{
 const base={mode:'extract',scene:{revisionId:'fixture',text:prose[0]},facts:[]};
 for(const [model,baseUrl,mode,strict] of [
   ['gpt-5.5',undefined,'extract',true],['gpt-5.5-2026-04-23','https://api.openai.com/v1/','extract',true],
   ['gpt-5.5-custom',undefined,'extract',false],['gpt-5.5-2099-01-01',undefined,'extract',false],['gpt-5.5',undefined,'check',false],
   ['gpt-5.5','https://example.org/v1','extract',false],['gpt-5.5','https://api.openai.com/custom','extract',false]
 ]){
   let params;
   await analyze({...base,mode},{key,model,baseUrl,fetchImpl:async(_url,init)=>{params=JSON.parse(init.body);return complete(mode==='extract'?{candidates:[]}:{issues:[]});}});
   if(!strict){assert.deepEqual(params.response_format,{type:'json_object'});continue;}
   const {type,json_schema}=params.response_format,s=json_schema.schema,item=s.properties.candidates.items;
   assert.equal(type,'json_schema');assert.equal(json_schema.strict,true);assert.deepEqual(s.required,['candidates']);assert.equal(s.additionalProperties,false);
   assert.deepEqual(item.required.sort(),['statement','kind','subject','storyTime','quote'].sort());assert.deepEqual(item.properties.kind.enum,['world','belief','speech','plan']);
   assert.equal(item.additionalProperties,false);assert.equal(s.properties.candidates.maxItems,8);
 }
 await assert.rejects(()=>analyze(base,{key,model:'gpt-5.5',fetchImpl:async()=>complete({candidates:[{statement:'虚构',kind:'world',subject:'',storyTime:'',quote:'不存在的原文'}]})}),e=>e instanceof AnalysisOutputError&&/证据/.test(e.message));
});
