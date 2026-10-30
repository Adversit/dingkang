import test from 'node:test';
import assert from 'node:assert/strict';
import { listProviderModels } from '../modules/novel-ai/models-list.mjs';
import { readModelPreference,saveModelPreference } from '../modules/novel-ai/model-preference-core.mjs';

const response=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
test('fetches only the official endpoint and returns valid actual model IDs without exposing the key',async()=>{
  let seen;const result=await listProviderModels('private-test-value',{fetchImpl:async(url,init)=>{seen={url,init};return response({object:'list',data:[{object:'model',id:'gpt-a',owned_by:'openai',created:123},{object:'model',id:'gpt-a',owned_by:'openai'}, {object:'model',id:'image-b',created:2},{object:'model',id:'<script>'},{object:'model',id:'sk-secret'}]})}});
  assert.equal(seen.url,'https://api.openai.com/v1/models');assert.equal(seen.init.redirect,'manual');assert.deepEqual(result.models.map(x=>x.id),['gpt-a','image-b']);assert.equal(result.rejected,2);assert.equal(JSON.stringify(result).includes('private-test-value'),false);
});
test('upstream 401/403/429/500 and broken responses give safe actionable errors without raw body',async()=>{
 for(const [status,expected] of [[401,401],[403,403],[429,429],[500,502]])await assert.rejects(listProviderModels('private-test-value',{fetchImpl:async()=>new Response('secret text',{status})}),e=>e.status===expected&&!e.message.includes('secret'));
 await assert.rejects(listProviderModels('key',{fetchImpl:async()=>new Response('{bad')}),/格式无效/);
 await assert.rejects(listProviderModels('',{fetchImpl:()=>{throw Error('must not be called')}}),e=>e.status===503);
});
test('oversized upstream response is rejected and upstream errors are never leaked',async()=>{
 await assert.rejects(listProviderModels('key',{fetchImpl:async()=>new Response('a'.repeat(2*1024*1024+1))}),/超出处理限制/);
 await assert.rejects(listProviderModels('secret',{fetchImpl:async()=>{throw Error('secret')}}),e=>!e.message.includes('secret'));
});
test('truncation and rejected IDs are disclosed',async()=>{const data=Array.from({length:2502},(_,i)=>({object:'model',id:`gpt-${i}`}));const r=await listProviderModels('x',{fetchImpl:async()=>response({object:'list',data})});assert.equal(r.models.length,2500);assert.equal(r.truncated,true)});
test('secret-shaped provider metadata is not reflected in the response',async()=>{const value='sk-provider-fixture-not-a-real-key';const result=await listProviderModels(value,{fetchImpl:async()=>response({object:'list',data:[{object:'model',id:'gpt-example',owned_by:value}]})});assert.equal(result.models[0].ownedBy,null);assert.equal(JSON.stringify(result).includes(value),false)});
function memory(){const rows=new Map();return {load:async o=>rows.get(o)||null,compareAndSwap:async(o,v,m,s)=>{const old=rows.get(o);if((old?.revision??0)!==v)return false;rows.set(o,{model_id:m,source_revision:s,revision:v+1});return true}}}
test('preferences are isolated by owner and track connection revision',async()=>{const a=memory();assert.deepEqual(await readModelPreference(a,'u1',0),{model:null,revision:0,sourceRevision:0,stale:false});await saveModelPreference(a,'u1','gpt-one',0,0,0);assert.equal((await readModelPreference(a,'u1',0)).model,'gpt-one');assert.equal((await readModelPreference(a,'u2',0)).model,null);assert.deepEqual(await readModelPreference(a,'u1',1),{model:null,revision:1,sourceRevision:1,stale:true});await assert.rejects(saveModelPreference(a,'u1','gpt-one',1,0,1),e=>e.status===409);await saveModelPreference(a,'u1',null,1,1,1);assert.equal((await readModelPreference(a,'u1',1)).stale,false)});
test('CAS prevents concurrent overwrite and rejects secret-shaped default names',async()=>{const a=memory();const writes=await Promise.allSettled([saveModelPreference(a,'u','gpt-a',0,0,0),saveModelPreference(a,'u','gpt-b',0,0,0)]);assert.equal(writes.filter(x=>x.status==='fulfilled').length,1);await assert.rejects(saveModelPreference(a,'v','sk-secret',0,0,0));});
