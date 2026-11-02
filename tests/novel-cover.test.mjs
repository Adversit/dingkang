import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {coverKey,generateCover,inspectCover,isImageModel} from '../modules/novel-cover/core.mjs';
const {Miniflare}=createRequire(import.meta.resolve('wrangler'))('miniflare');
const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j97sAAAAASUVORK5CYII=','base64'));
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('rejects disguised inputs, invalid sizes, mismatched declared MIME and unsupported models',async()=>{
  assert.deepEqual(inspectCover(png,'image/png'),{mime:'image/png',width:1,height:1,size:png.length});assert.throws(()=>inspectCover(png,'image/jpeg'));assert.throws(()=>inspectCover(new TextEncoder().encode('<svg><script>doNotRun()</script></svg>'),'image/png'));
  const bombs=png.slice();new DataView(bombs.buffer).setUint32(16,65536);assert.throws(()=>inspectCover(bombs,'image/png'),/尺寸/);
  assert.notEqual(await coverKey('person-A','shared-id'),await coverKey('person-B','shared-id'));
  assert.ok(isImageModel('gpt-image-2.5-sunburst'));assert.ok(!isImageModel('gpt-5.5'));assert.ok(!isImageModel('dall-e-2'));assert.ok(!isImageModel('gpt-image-2/edit'));
  let calls=0;await assert.rejects(generateCover({key:'fixture',model:'gpt-image-2',prompt:'封面',models:[{id:'gpt-image-1'}],fetchImpl(){calls++}}),/模型列表/);assert.equal(calls,0);
});
test('generated candidates send only the image brief to the official provider; redirects and missing images never replace anything',async()=>{
  const jpeg=new Uint8Array([255,216,255,192,0,11,8,0,1,0,1,1,1,17,0,255,218,0,8,1,1,0,0,63,0,41,255,217]);
  const opts={key:'fictional-token',model:'gpt-image-2',prompt:'雨夜祠堂，竖版插画',models:[{id:'gpt-image-2'}],secretNotes:'DO_NOT_INCLUDE'};
  const bytes=await generateCover({...opts,fetchImpl:async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/images/generations');assert.equal(init.redirect,'manual');const payload=JSON.parse(init.body);assert.deepEqual(payload,{model:opts.model,prompt:opts.prompt,size:'1024x1536',n:1,output_format:'jpeg',quality:'medium'});return Response.json({data:[{b64_json:Buffer.from(jpeg).toString('base64')}]})}});assert.deepEqual(bytes,jpeg);
  await assert.rejects(generateCover({...opts,fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://example.invalid/private'}})}),/HTTP 302/);
  await assert.rejects(generateCover({...opts,fetchImpl:async()=>Response.json({data:[{url:'https://example.invalid/private'}]})}),/没有收到/);
});
test('private Workers-R2 route prevents cross-account and stale replacement without database migrations',async()=>{
  const file=ts.transpileModule(read('app/api/m/novel-studio/cover/route.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll('@/lib/hub/server','./hub.mjs').replaceAll('@/modules/novel-ai/route-support','./support.mjs').replaceAll('@/modules/novel-ai/key-preference','./key.mjs').replaceAll('@/modules/novel-ai/models-list.mjs','./models.mjs').replaceAll('@/modules/novel-cover/core.mjs','./cover.mjs');
  const modules=[
    ['worker.mjs',"import * as route from './api.mjs';export default {fetch(req){return route[req.method](req)}}"],
    ['api.mjs',file],['cover.mjs',read('modules/novel-cover/core.mjs')],
    ['hub.mjs',`import {env} from 'cloudflare:workers';export class HubError extends Error{constructor(m,status=400){super(m);this.status=status}};export const bucket=()=>env.IMAGES;export function requireUser(req){const userId=req.headers.get('x-test-owner');if(!userId)throw new HubError('login',401);return {userId}};export function requireMutation(req){if(req.headers.get('origin')!==new URL(req.url).origin)throw new HubError('origin',403)};export const readBoundedBody=async(req,max)=>new Uint8Array(await req.arrayBuffer());export const json=(data,status=200)=>Response.json(data,{status});export const failure=e=>json({error:e.message},e.status??500)`],
    ['support.mjs',`import {failure,requireUser,requireMutation,HubError} from './hub.mjs';export const problem=failure;export const archiveFor=async owner=>({state:{projects:[{id:owner==='writer'?'private-book':'other-book'}]}});export const inputFor=async req=>{requireMutation(req);const owner=requireUser(req).userId;if(owner!=='writer')throw new HubError('owner only',403);return {owner,input:await req.json()}}`],
    ['key.mjs',"export const getNovelKeyBinding=async()=>({source:'fixture',key:'',revision:0});"],['models.mjs',"export class ModelListError extends Error{};export const listProviderModels=async()=>({models:[]})"]
  ].map(([path,contents])=>({type:'ESModule',path,contents}));
  const mf=new Miniflare({modules,compatibilityDate:'2026-05-15',r2Buckets:['IMAGES']});
  try{
    const base='http://site.invalid/api/m/novel-studio/cover?project=private-book',h={'x-test-owner':'writer',origin:'http://site.invalid','content-type':'image/png','x-cover-version':'none'};
    const req=(method='GET',headers=h,body,url=base)=>mf.dispatchFetch(url,{method,headers,body:body===undefined?undefined:new Uint8Array(body)});
    const initial=await req('GET',h,undefined,base+'&meta=1');assert.deepEqual(await initial.json(),{exists:false,etag:'none'});
    assert.equal((await req('PUT',{...h,origin:'https://foreign.invalid'},png)).status,403);
    assert.equal((await req('GET',{'x-test-owner':'intruder'})).status,404);assert.equal((await req('GET',{})).status,401);
    const first=await req('PUT',h,png);assert.equal(first.status,200,await first.clone().text());const {etag}=await first.json();assert.match(etag,/^".+"$/);
    const fetched=await req();assert.equal(fetched.headers.get('content-type'),'image/png');assert.equal(fetched.headers.get('cache-control'),'private, no-store');assert.deepEqual(new Uint8Array(await fetched.arrayBuffer()),png);
    assert.equal((await req('PUT',h,png)).status,409);
    assert.equal((await req('PUT',{...h,'x-cover-version':etag},png)).status,200);
    assert.equal((await req('PUT',{...h,'x-cover-version':'"an-old-version"'},png)).status,409);
    assert.equal((await req('PUT',{...h,'x-test-owner':'intruder','x-cover-version':etag},png)).status,404);
    assert.equal((await req('GET',{'x-test-owner':'intruder'},undefined,base.replace('private-book','other-book')+'&meta=1')).status,200);
  }finally{await mf.dispose()}
});
