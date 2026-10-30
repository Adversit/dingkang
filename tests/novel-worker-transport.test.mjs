import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';

// Use Wrangler's pinned workerd runtime, not Node's more permissive fetch implementation.
// All outbound requests are intercepted locally; no real credentials or network are used.
const require=createRequire(import.meta.resolve('wrangler'));
const {Miniflare}=require('miniflare');
const fixtureKey='sk-workerd-regression-fixture-not-a-real-api-key';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sources=[
 'modules/novel-ai/models-list.mjs','modules/novel-ai/context.mjs','modules/novel-ai/analysis.mjs',
 'modules/novel-ai/connection-sources.mjs','modules/novel-ai/key-preference-core.mjs','modules/novel-studio/temporal.mjs',
].map(path=>({type:'ESModule',path,contents:read(path)}));
let legacy=ts.transpileModule(read('app/api/m/novel-studio/generate/route.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
legacy=legacy.replaceAll('@/modules/novel-ai/context.mjs','./modules/novel-ai/context.mjs').replaceAll('@/modules/novel-ai/key-preference-core.mjs','./modules/novel-ai/key-preference-core.mjs');
for(const name of ['@/lib/feedback/server','@/lib/hub/server','@/modules/novel-ai/model-preference','@/modules/novel-ai/key-preference'])legacy=legacy.replaceAll(name,'./stubs.mjs');
const stubs=`
export class HubError extends Error {constructor(message,status=400){super(message);this.status=status}}
export const feedbackIdentity=()=>({authenticated:true,isOwner:true});
export const requireMutation=()=>{};export const requireUser=()=>({userId:'fixture-owner'});
export const json=(body,status=200)=>Response.json(body,{status});export const failure=e=>json({error:e.message},e.status||500);
export const readBoundedBody=async req=>new Uint8Array(await req.arrayBuffer());
export const chooseModel=async()=> 'fixture-model';
export const getNovelKeyBinding=async()=>({key:${JSON.stringify(fixtureKey)},source:'FixtureKey',revision:1});
`;
const entry=`
import {listProviderModels} from './modules/novel-ai/models-list.mjs';
import {generateFromPreview} from './modules/novel-ai/context.mjs';
import {analyze} from './modules/novel-ai/analysis.mjs';
import {POST as legacyGenerate} from './legacy.mjs';
const options={key:${JSON.stringify(fixtureKey)},model:'fixture-model'};
export default {async fetch(){
 const results={};
 const calls={
  models:()=>listProviderModels(options.key),
  draft:()=>generateFromPreview({provider:'https://api.openai.com/v1/chat/completions',model:options.model,messages:[{role:'user',content:'Write a scene.'}],previewHash:'fixture'},options),
  analysis:()=>analyze({mode:'check',scene:{text:'A fixture scene.',revisionId:'fixture-revision',storyTime:'1'},facts:[]},options),
  legacy:()=>legacyGenerate(new Request('https://site.invalid/api/m/novel-studio/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({instruction:'Write a scene.',scene:'A fixture scene.',facts:[]})})),
 };
 for(const [name,run] of Object.entries(calls))try{const value=await run();results[name]=value instanceof Response?{status:value.status}:{status:200}}catch(error){results[name]={status:error.status||500,code:error.code||null}}
 return Response.json(results);
}};
`;
test('production model discovery, writing, review and legacy generation work in workerd and never follow credential-bearing redirects',{timeout:60000},async()=>{
 let redirect=false;const requests=[];
 const mf=new Miniflare({compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],modules:[{type:'ESModule',path:'index.mjs',contents:entry},...sources,{type:'ESModule',path:'legacy.mjs',contents:legacy},{type:'ESModule',path:'stubs.mjs',contents:stubs}],
  outboundService:async request=>{
   const url=new URL(request.url);requests.push({origin:url.origin,path:url.pathname,method:request.method,authorization:request.headers.get('authorization')});
   if(redirect)return new Response(null,{status:302,headers:{location:'https://redirect-destination.invalid/collect'}});
   if(url.pathname==='/v1/models')return new Response(JSON.stringify({object:'list',data:[{object:'model',id:'fixture-model'}]}),{headers:{'content-type':'application/json'}});
   const input=await request.json();
   return new Response(JSON.stringify({model:'fixture-model',choices:[{finish_reason:'stop',message:{content:input.response_format?'{"issues":[]}':'A fixture scene.'}}]}),{headers:{'content-type':'application/json'}});
  },
 });
 try{
  const ok=await (await mf.dispatchFetch('https://runtime-test.invalid')).json();
  assert.deepEqual(ok,{models:{status:200},draft:{status:200},analysis:{status:200},legacy:{status:200}});
  assert.equal(requests.length,4);
  redirect=true;
  const blocked=await (await mf.dispatchFetch('https://runtime-test.invalid')).json();
  for(const name of ['models','draft','analysis','legacy'])assert.equal(blocked[name].status,502,name);
  assert.equal(blocked.models.code,'MODEL_PROVIDER_ERROR');
  assert.equal(requests.length,8,'one official request per operation, no redirect follow-ups');
  assert.ok(requests.every(request=>request.origin==='https://api.openai.com'));
  assert.ok(requests.every(request=>request.authorization==='Bearer '+fixtureKey));
 }finally{await mf.dispose()}
});
