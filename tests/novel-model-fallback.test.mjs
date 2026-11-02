import test from 'node:test';
import assert from 'node:assert/strict';
import {createTextFallback,providerModelError} from '../modules/novel-ai/fallback-service.mjs';
import {generateFromPreview,ContextError} from '../modules/novel-ai/context.mjs';
import {analyze} from '../modules/novel-ai/analysis.mjs';
const base='https://api.openai.com/v1',model='old-model',key='fixture';
const list=ids=>Response.json({object:'list',data:ids.map(id=>({object:'model',id}))});
const ok=(content)=>Response.json({choices:[{finish_reason:'stop',message:{content}}]});
const denied=(status=404,error={code:'model_not_found',message:'PRIVATE upstream content'})=>Response.json({error},{status});
const planner=(m,fetchImpl,baseUrl=base)=>generateFromPreview({provider:baseUrl+'/chat/completions',model:m,messages:[{role:'user',content:'PRIVATE manuscript'}]}, {model:m,key,fetchImpl,baseUrl});
const opts=rest=>({key,model,baseUrl:base,ErrorClass:ContextError,...rest});
test('same-key live directory + tiny no-manuscript probes; only confirmed candidate reruns the unchanged task, reused for review',async()=>{
 const calls=[], switches=[];
 const f=async(url,init)=>{
   const body=init.body&&JSON.parse(init.body);
   assert.equal(init.redirect,'manual');assert.equal(init.headers.authorization||init.headers.Authorization,'Bearer '+key);
   calls.push([url,body]);
   if(url.endsWith('/models'))return list(['gpt-image-2','gpt-5.5-pro','gpt-6-astra','gpt-5.5','gpt-5.5-2026-04-23','gpt-5.5-2026-01-10']);
   if(body.model===model || body.model==='gpt-5.5')return denied();
   return ok(body.response_format?'{"issues":[]}':body.messages[0].content==='Reply OK.'?'OK':'正文');
 };
 const s=createTextFallback(opts({fetchImpl:f,onSwitch:x=>switches.push(x)}));
 const d=await s.run(m=>planner(m,f));
 assert.equal(d.text,'正文');assert.equal(s.currentModel,'gpt-5.5-2026-04-23');
 const rv=await s.run(m=>analyze({mode:'check',scene:{text:'正文',revisionId:'r',storyTime:'1'},facts:[]},{key,model:m,baseUrl:base,fetchImpl:f}));
 assert.deepEqual(rv.issues,[]);assert.deepEqual(switches,[{requestedModel:model,selectedModel:s.currentModel,reason:'model_not_found'}]);
 assert.equal(calls.filter(x=>x[0].endsWith('/models')).length,1);
 assert.deepEqual(calls.filter(x=>x[1]).map(x=>x[1].model),[model,'gpt-5.5',s.currentModel,s.currentModel,s.currentModel]);
 assert.deepEqual(calls[0][1].messages,calls[4][1].messages);
 for(const [,body] of calls.slice(2,4)){assert.equal(body.max_completion_tokens,64);assert.equal(body.messages.length,1);assert.equal(body.messages[0].content,'Reply OK.')}
});
test('ambiguous, non-model, quota, authorization, redirect and network failures never probe or replay',async()=>{
 for(const [status,error] of [[401,{code:'model_not_found'}],[429,{code:'model_not_found'}],[500,{code:'model_not_found'}],[302,{code:'model_not_found'}],[404,{message:'unknown resource'}],[403,{code:'insufficient_permissions',message:'endpoint authentication failed'}],[400,{code:'unsupported_value',param:'temperature',message:'this parameter is not supported for this model'}],[400,{code:'model_not_found',param:'tools'}],[422,{code:'model_not_found'}]]){
  let n=0; const s=createTextFallback(opts({fetchImpl:()=>{assert.fail('unexpected discovery')}}));
  await assert.rejects(s.run(async m=>{n++;throw await providerModelError(denied(status,error),m,ContextError)}),e=>!e.message.includes('authentication failed'));
  assert.equal(n,1);
 }
 for(const fail of [new ContextError('网络错误',502),new ContextError('超时',504),new ContextError('截断',502)]){
   const s=createTextFallback(opts({fetchImpl:()=>assert.fail()}));await assert.rejects(s.run(async()=>{throw fail}),e=>e===fail);
 }
});
test('explicit selected-model permission and endpoint errors from analysis enter fallback, return no raw upstream detail',async()=>{
 for(const [status,error,reason] of [[403,{code:'insufficient_permissions',param:'model',message:'You do not have access to model old-model. SECRET'},'model_access'],[400,{code:null,message:'This is not a chat model and thus not supported in the v1/chat/completions endpoint. SECRET'},'endpoint_incompatible']]){
  const f=async(url,init)=>{if(url.endsWith('/models'))return list(['gpt-5.5']);const b=JSON.parse(init.body);return b.model===model?denied(status,error):ok(b.response_format?'{"issues":[]}':'OK')};
  const s=createTextFallback(opts({fetchImpl:f}));
  await s.run(m=>analyze({mode:'check',scene:{text:'正文',revisionId:'r',storyTime:'1'},facts:[]},{key,model:m,fetchImpl:f}));
  assert.equal(s.switchInfo.reason,reason);assert.ok(!JSON.stringify(s.switchInfo).includes('SECRET'));
 }
});
test('custom provider retains its credential and probe errors/changed bindings stop BEFORE a manuscript replay',async()=>{
 const custom='https://other-provider.example/tenant/v1';let calls=[],altered=false;
 const f=async(url,init)=>{assert.ok(url.startsWith(custom+'/'));calls.push(url);if(url.endsWith('/models'))return list(['gpt-5.5','gpt-5.5-chat-latest']);const b=JSON.parse(init.body);return b.model===model?denied():(altered=true,ok('OK'))};
 const s=createTextFallback(opts({baseUrl:custom,fetchImpl:f,checkBinding:()=>!altered}));
 await assert.rejects(s.run(m=>planner(m,f,custom)),e=>e.status===409);
 assert.equal(calls.length,3);assert.equal(s.switchInfo,null);
 const f2=async(url,init)=>{if(url.endsWith('/models'))return list(['gpt-5.5']);const m=JSON.parse(init.body).model;return m===model?denied():denied(429,{code:'insufficient_quota',message:'SECRET'})};
 await assert.rejects(createTextFallback(opts({fetchImpl:f2})).run(m=>planner(m,f2)),e=>e.message.includes('429')&&!e.message.includes('SECRET'));
});
test('at most three listed affordable candidates; no cross-account cache, guessed models, or recursive replay',async()=>{
 let count=0; const no=async(url,init)=>{if(url.endsWith('/models'))return list(['gpt-5.5-pro','gpt-5.5-2026-05-03','gpt-5.5-2026-04-03','gpt-5.5-2026-03-03','gpt-5.5-2026-02-03','gpt-5.5-chat-latest']);count++;return denied()};
 const s=createTextFallback(opts({fetchImpl:no}));await assert.rejects(s.run(m=>planner(m,no)),/未找到通过实测/);assert.equal(count,4);
 for(const ids of [[],['gpt-5.5-pro','gpt-5.5-image','gpt-5.5-preview-test','gpt-6-sol']]){
  let attempted=0;const f=async(url,init)=>{if(url.endsWith('/models'))return list(ids);attempted++;return denied()};
  await assert.rejects(createTextFallback(opts({key:'different',fetchImpl:f})).run(m=>planner(m,f)),/未找到/);assert.equal(attempted,1);
 }
});
test('author text is never replayed again after an uncertain replacement result; a terminal unusable probe may try another listed candidate',async()=>{
 const attempts=[];let tasks=0;
 const f=async(url,init)=>{
  if(url.endsWith('/models'))return list(['gpt-5.5','gpt-5.5-2026-04-23','gpt-5.5-chat-latest']);
  const b=JSON.parse(init.body);attempts.push(b.model);
  if(b.model===model)return denied();
  if(b.model==='gpt-5.5')return Response.json({choices:[{finish_reason:'length',message:{content:''}}]});
  if(b.messages[0].content==='Reply OK.')return ok('OK');
  tasks++;return denied(502,{message:'PRIVATE'});
 };
 const s=createTextFallback(opts({fetchImpl:f}));const run=()=>s.run(m=>planner(m,f));await assert.rejects(run(),e=>e.message.includes('502')&&!e.message.includes('PRIVATE'));
 await assert.rejects(run());assert.equal(tasks,1);assert.equal(s.switchInfo,null);
 assert.deepEqual(attempts,[model,'gpt-5.5','gpt-5.5-2026-04-23','gpt-5.5-2026-04-23']);
});
