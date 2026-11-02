import test from 'node:test';
import assert from 'node:assert/strict';
import {providerPolicy} from '../modules/novel-ai/provider-policy.mjs';
import {preparePlanPreview,generatePlan} from '../modules/novel-orchestration/auto-run.mjs';
import {generateFromPreview} from '../modules/novel-ai/context.mjs';
import {analyze} from '../modules/novel-ai/analysis.mjs';
const origin='https://api.openai.com/v1',key='qa';
const mock=(choice,seen=[])=>async(url,opts)=>{seen.push(JSON.parse(opts.body));return Response.json({choices:choice?[choice]:[]})};
const pFor=(model='gpt-5.5',mode='book')=>preparePlanPreview({idea:'作者要求',sceneCount:2,planMode:mode},model,origin);
test('planning calls use compact JSON output, safe allowlist, additional output room and timeout; chapter prose is not JSON',async()=>{
 for(const [model,low] of [['gpt-5.5',true],['gpt-5.5-2026-04-23',true],['gpt-5.5-pro',false],['gpt-4.1-mini',false]]){
  const p=await pFor(model),seen=[];await generateFromPreview(p,{key,model,baseUrl:origin,fetchImpl:mock({finish_reason:'stop',message:{content:'{}'}},seen)});
  assert.deepEqual(seen[0].response_format,{type:'json_object'});assert.equal(seen[0].reasoning_effort,low?'low':undefined);assert.ok(seen[0].max_completion_tokens>5000);assert.match(p.messages[0].content,/900 至 1500/);
 }
 const p=await pFor();delete p.planMode;const seen=[];await generateFromPreview(p,{key,model:p.model,baseUrl:origin,fetchImpl:mock({finish_reason:'stop',message:{content:'正文'}},seen)});assert.equal(seen[0].response_format,undefined);assert.equal(seen[0].reasoning_effort,undefined);assert.ok(seen[0].max_completion_tokens>5000);assert.ok(providerPolicy(p.model,'chapter').timeoutMs>90000);
});
test('model completion failures have distinguishable safe diagnostics, without copying a provider refusal/body',async()=>{
 const p=await pFor(),opts={key,model:p.model,baseUrl:origin};const cases=[
 [{finish_reason:'length',message:{content:'SENSITIVE'}},/输出额度.*规划.*截断/],
 [{finish_reason:'stop',message:{refusal:'SENSITIVE'}},/拒绝生成本次规划/],
 [{finish_reason:'content_filter',message:{}},/过滤/],
 [{finish_reason:'stop',message:{content:' '}},/空的规划内容/],
 [null,/空 choices/]];
 for(const [choice,rx] of cases)await assert.rejects(()=>generateFromPreview(p,{...opts,fetchImpl:mock(choice)}),e=>rx.test(e.message)&&!e.message.includes('SENSITIVE')&&e.status===502);
 await assert.rejects(()=>generatePlan(p,{...opts,generate:async()=>({text:'SENSITIVE malformed JSON'})}),e=>/有效 JSON/.test(e.message)&&!e.message.includes('SENSITIVE'));
});
test('analysis uses a larger envelope for chapter plus reference drafts, with JSON and scoped low reasoning',async()=>{
 const sample={mode:'extract',scene:{text:'正文'.repeat(1000),revisionId:'r',storyTime:'0'},facts:[]},seen=[];
 await analyze(sample,{key,model:'gpt-5.5',baseUrl:origin,fetchImpl:mock({finish_reason:'stop',message:{content:'{"candidates":[]}'}},seen)});assert.equal(seen[0].reasoning_effort,'low');assert.ok(seen[0].max_completion_tokens>3000);assert.ok(providerPolicy('gpt-5.5','longAnalysis').timeoutMs>30000);
 await assert.rejects(()=>analyze(sample,{key,model:'gpt-5.5',baseUrl:origin,fetchImpl:mock({finish_reason:'length',message:{content:'SENSITIVE'}})}),e=>/事实提取.*截断/.test(e.message)&&!e.message.includes('SENSITIVE'));
});
