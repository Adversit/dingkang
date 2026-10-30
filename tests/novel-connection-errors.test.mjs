import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {listProviderModels,ModelListError,modelListFailure} from '../modules/novel-ai/models-list.mjs';
import {testAndSelectPreference} from '../modules/novel-ai/key-preference-core.mjs';

const secret='private-error-fixture-do-not-reflect';
test('model-list failures distinguish provider responses, malformed responses, network and runtime failures',async()=>{
 const cases=[
  {run:async()=>new Response(secret,{status:503}),code:'MODEL_PROVIDER_ERROR',category:'provider',providerStatus:503,status:502},
  {run:async()=>new Response(secret,{status:401}),code:'MODEL_AUTH_FAILED',category:'provider',providerStatus:401,status:401},
  {run:async()=>new Response(secret,{status:429}),code:'MODEL_REQUEST_LIMIT',category:'provider',providerStatus:429,status:429},
  {run:async()=>new Response(secret),code:'MODEL_RESPONSE_INVALID',category:'malformed',providerStatus:200,status:502},
  {run:async()=>{throw Error('network failure '+secret)},code:'MODEL_NETWORK_ERROR',category:'network',providerStatus:null,status:502},
  {run:async()=>{throw TypeError('Illegal invocation: function called with incorrect this reference '+secret)},code:'MODEL_RUNTIME_ERROR',category:'runtime_api',providerStatus:null,status:502},
  {run:async()=>{throw TypeError('Invalid redirect value '+secret)},code:'MODEL_RUNTIME_ERROR',category:'runtime_api',providerStatus:null,status:502},
  {run:async()=>new Response(new ReadableStream({start(controller){controller.error(Error(secret))}})),code:'MODEL_RESPONSE_READ_ERROR',category:'response_read',providerStatus:200,status:502},
 ];
 for(const {run,code,category,providerStatus,status} of cases){
  await assert.rejects(listProviderModels(secret,{fetchImpl:run}),error=>{
   assert.ok(error instanceof ModelListError);assert.equal(error.status,status);assert.equal(error.code,code);
   const safe=modelListFailure(error);assert.equal(safe.category,category);assert.equal(safe.providerStatus,providerStatus);
   assert.equal(JSON.stringify(safe).includes(secret),false);assert.equal(error.message.includes(secret),false);return true;
  });
 }
});
test('an aborted provider read is classified as timeout without echoing exception details',async()=>{
 await assert.rejects(listProviderModels(secret,{timeoutMs:1,fetchImpl:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error(secret))))}),error=>error.code==='MODEL_REQUEST_TIMEOUT'&&error.status===504&&!error.message.includes(secret));
});
test('typed provider failure is guaranteed to occur before connection persistence',async()=>{
 let writes=0;const adapter={load:async()=>({source:'PreviousKey',revision:4}),compareAndSwap:async()=>{writes++;return true}};
 await assert.rejects(testAndSelectPreference(adapter,'owner','NextKey',4,()=>secret,async()=>{throw new ModelListError('MODEL_NETWORK_ERROR')}),error=>error.code==='MODEL_NETWORK_ERROR');
 assert.equal(writes,0);
});

const routeSource=readFileSync(new URL('../app/api/m/novel-studio/model-connection/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function route(error){
 const logs=[];class HubError extends Error{}
 const modules={
  '@/lib/feedback/server':{feedbackIdentity:()=>({isOwner:true})},
  '@/lib/hub/server':{HubError,json:(body,status=200)=>Response.json(body,{status}),readBoundedBody:async req=>new Uint8Array(await req.arrayBuffer()),requireMutation:()=>{},requireUser:()=>({userId:'owner'})},
  '@/modules/novel-ai/route-support':{config:()=>'',problem:()=>Response.json({error:'请求未完成，请检查服务状态后重试。'},{status:500})},
  '@/modules/novel-ai/key-preference':{testNovelConnection:async()=>{throw error}},
  '@/modules/novel-ai/models-list.mjs':{ModelListError,modelListFailure},
 };
 const module={exports:{}};
 vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`,{TextDecoder,console:{warn:(...values)=>logs.push(values)}})(name=>modules[name],module,module.exports);
 return {post:module.exports.POST,logs};
}
const request=()=>new Request('https://site.example/api/m/novel-studio/model-connection',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source:'WritingKey',expectedRevision:0})});
test('connection endpoint returns a no-change guarantee only for known pre-save provider errors and logs fixed diagnostic fields',async()=>{
 const r=route(new ModelListError('MODEL_PROVIDER_ERROR',503)),response=await r.post(request()),body=await response.json();
 assert.equal(response.status,502);assert.equal(body.connectionUnchanged,true);assert.equal(body.code,'MODEL_PROVIDER_ERROR');assert.equal(body.category,'provider');assert.equal(body.providerStatus,503);
 assert.equal(r.logs.length,1);assert.equal(r.logs[0][0],'[novel-model-connection]');
 assert.equal(JSON.stringify(r.logs[0][1]),JSON.stringify({code:'MODEL_PROVIDER_ERROR',category:'provider',providerStatus:503}));
});
test('unknown storage/acknowledgement failures are not labeled unchanged or logged with raw details',async()=>{
 const r=route(Error('database acknowledgment lost '+secret)),response=await r.post(request()),body=await response.json();
 assert.equal(response.status,500);assert.equal('connectionUnchanged' in body,false);assert.equal(r.logs.length,0);
 assert.equal(JSON.stringify(body).includes(secret),false);
});
