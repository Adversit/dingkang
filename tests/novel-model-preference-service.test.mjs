import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as preferences from '../modules/novel-ai/model-preference-core.mjs';
import * as selection from '../modules/novel-ai/model-selection.mjs';
import * as context from '../modules/novel-ai/context.mjs';

// Exercise the production TypeScript service, substituting the Worker bindings and provider.
const source=readFileSync(new URL('../modules/novel-ai/model-preference.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function service(){
 const rows=new Map();let binding={source:'WriterKey',revision:2,key:'private-in-memory-fixture'},networkCalls=0;
 let provider=async()=>({models:[{id:'text-model'},{id:'image-model'}],writingModels:[{id:'text-model'}]});
 const db={prepare(sql){return {bind(...values){return {
  async first(){return rows.get(values[0])||null},
  async run(){
   if(sql.startsWith('INSERT')){const [owner,model,sourceRevision]=values;if(rows.has(owner))return {meta:{changes:0}};rows.set(owner,{model_id:model,source_revision:sourceRevision,revision:1});return {meta:{changes:1}}}
   const [model,sourceRevision,_at,owner,revision]=values;const old=rows.get(owner);if(!old||old.revision!==revision)return {meta:{changes:0}};rows.set(owner,{model_id:model,source_revision:sourceRevision,revision:revision+1});return {meta:{changes:1}};
  }
 }}}}};
 const dependencies={
  '@/lib/hub/server':{database:()=>db},
  './route-support':{config:()=>''},
  './key-preference':{getNovelKeyBinding:async()=>({...binding})},
  './model-preference-core.mjs':preferences,
  './model-selection.mjs':selection,
  './context.mjs':context,
  './models-list.mjs':{listProviderModels:async key=>{networkCalls++;assert.equal(key,binding.key);return provider()}}
 };
 const module={exports:{}};
 vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`,{})(name=>{assert.ok(dependencies[name],name);return dependencies[name]},module,module.exports);
 return {api:module.exports,rows,get calls(){return networkCalls},changeBinding(value){binding={...binding,...value}},setProvider(fn){provider=fn}};
}
test('default model must be returned by this connection and suitable for the writing selector',async()=>{
 const x=service();
 for(const id of ['invented-model','image-model'])await assert.rejects(x.api.setModelPreference('owner',id,0,2),e=>e.status===400);
 assert.equal(x.rows.size,0);
 const saved=await x.api.setModelPreference('owner','text-model',0,2);
 assert.equal(saved.model,'text-model');assert.equal(saved.revision,1);assert.equal(saved.sourceRevision,2);
 assert.equal((await x.api.getModelPreference('other-owner')).model,null);
 assert.equal(JSON.stringify([...x.rows]).includes('private-in-memory-fixture'),false);
});
test('default save rejects stale source and model revisions before fetching models',async()=>{
 const x=service();
 await assert.rejects(x.api.setModelPreference('owner','text-model',0,1),e=>e.status===409);
 await assert.rejects(x.api.setModelPreference('owner','text-model',1,2),e=>e.status===409);
 assert.equal(x.calls,0);assert.equal(x.rows.size,0);
});
test('provider failures leave an existing default intact',async()=>{
 const x=service();await x.api.setModelPreference('owner','text-model',0,2);
 x.setProvider(async()=>{throw Error('network unavailable')});
 await assert.rejects(x.api.setModelPreference('owner','another-model',1,2),/network unavailable/);
 assert.equal((await x.api.getModelPreference('owner')).model,'text-model');assert.equal(x.rows.get('owner').revision,1);
});
test('source switching or secret rotation while listing models prevents saving a stale default',async()=>{
 for(const replacement of [{source:'SecondKey',revision:3},{key:'rotated-fixture'}]){
  const x=service();x.setProvider(async()=>{x.changeBinding(replacement);return {writingModels:[{id:'text-model'}]}});
  await assert.rejects(x.api.setModelPreference('owner','text-model',0,2),e=>e.status===409);
  assert.equal(x.rows.size,0);
 }
});
test('clearing the user override does not require a provider request',async()=>{
 const x=service();await x.api.setModelPreference('owner','text-model',0,2);
 x.setProvider(async()=>{throw Error('must not be called')});
 const before=x.calls,cleared=await x.api.setModelPreference('owner',null,1,2);
 assert.equal(cleared.model,null);assert.equal(cleared.revision,2);assert.equal(x.calls,before);
});
