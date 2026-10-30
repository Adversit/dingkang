import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverConnectionSources,readConnectionSecret,validSourceName} from '../modules/novel-ai/connection-sources.mjs';
import {testAndSelectPreference,readPreference} from '../modules/novel-ai/key-preference-core.mjs';
import {listProviderModels,isWritingCandidate} from '../modules/novel-ai/models-list.mjs';
import {compileContext} from '../modules/novel-ai/context.mjs';
const fixtureKey='sk-unit-test-value-never-a-real-api-key';
function adapter(){const rows=new Map();return {rows,load:async owner=>rows.get(owner)||null,compareAndSwap:async(owner,revision,source)=>{if((rows.get(owner)?.revision??0)!==revision)return false;rows.set(owner,{source,revision:revision+1});return true}}}
const listed={models:[{id:'gpt-example'}],writingModels:[{id:'gpt-example'}]};

test('discovers any safe runtime credential name without exposing values or unrelated bindings',()=>{
 const env=Object.assign(Object.create({INHERITED:fixtureKey}),{MyWritingKey:fixtureKey,OPENAI_CHATGPT:fixtureKey,NOVEL_OPENAI_API_KEY:'not-a-key',SITE_ADMIN_EMAIL:fixtureKey,FEEDBACK_RATE_SALT:fixtureKey,CF_ACCESS_TOKEN:fixtureKey,NOVEL_OPENAI_MODEL:'gpt-example',OtherProvider:'sk_live_private',Data:{prepare(){}},EMPTY:''});
 const sources=discoverConnectionSources(env);
 assert.deepEqual(sources,[{name:'MyWritingKey',configured:true,eligible:true},{name:'OPENAI_CHATGPT',configured:true,eligible:true}]);
 assert.equal(JSON.stringify(sources).includes(fixtureKey),false);
 assert.equal(readConnectionSecret(env,'MyWritingKey'),fixtureKey);
 for(const name of ['SITE_ADMIN_EMAIL','FEEDBACK_RATE_SALT','CF_ACCESS_TOKEN','NOVEL_OPENAI_MODEL','INHERITED','NOVEL_OPENAI_API_KEY'])assert.equal(readConnectionSecret(env,name),'');
 for(const name of ['__proto__','../API_KEY','OTHER-KEY','A'.repeat(129),''])assert.equal(validSourceName(name),false);
});
test('successful test selects exactly the chosen dynamic source and never saves the key',async()=>{
 const db=adapter(),env={WriterCredential:fixtureKey};let calls=0;
 const result=await testAndSelectPreference(db,'owner','WriterCredential',0,name=>readConnectionSecret(env,name),async key=>{calls++;assert.equal(key,fixtureKey);return listed});
 assert.equal(calls,1);assert.equal(result.source,'WriterCredential');assert.equal(result.revision,1);assert.deepEqual(result.writingModels,listed.writingModels);
 assert.deepEqual(await readPreference(db,'owner'),{source:'WriterCredential',revision:1});
 assert.equal(JSON.stringify([...db.rows]).includes(fixtureKey),false);assert.equal(JSON.stringify(result).includes(fixtureKey),false);
 assert.equal((await readPreference(db,'another-owner')).source,'NOVEL_OPENAI_API_KEY');
});
test('same-source test preserves the revision so an existing default model stays valid',async()=>{
 const db=adapter();db.rows.set('owner',{source:'OPENAI_CHATGPT',revision:3});
 const result=await testAndSelectPreference(db,'owner','OPENAI_CHATGPT',3,()=>fixtureKey,async()=>listed);
 assert.equal(result.revision,3);assert.deepEqual(db.rows.get('owner'),{source:'OPENAI_CHATGPT',revision:3});
});
test('failed test and missing/malformed secret leave the current connection unchanged',async()=>{
 const db=adapter();db.rows.set('owner',{source:'OPENAI_CHATGPT',revision:3});let calls=0;
 await assert.rejects(testAndSelectPreference(db,'owner','AnotherKey',3,()=>fixtureKey,async()=>{calls++;throw Error('provider rejected')}),/provider rejected/);
 await assert.rejects(testAndSelectPreference(db,'owner','AnotherKey',3,()=>'',async()=>{calls++;return listed}),e=>e.status===422);
 await assert.rejects(testAndSelectPreference(db,'owner','FEEDBACK_RATE_SALT',3,()=>fixtureKey,async()=>{calls++;return listed}));
 assert.equal(calls,1);assert.deepEqual(db.rows.get('owner'),{source:'OPENAI_CHATGPT',revision:3});
});
test('stale settings are rejected before network access and concurrent changes during the test are not overwritten',async()=>{
 const db=adapter();db.rows.set('owner',{source:'OPENAI_CHATGPT',revision:3});let calls=0;
 await assert.rejects(testAndSelectPreference(db,'owner','AnotherKey',2,()=>fixtureKey,async()=>{calls++;return listed}),e=>e.status===409);assert.equal(calls,0);
 await assert.rejects(testAndSelectPreference(db,'owner','AnotherKey',3,()=>fixtureKey,async()=>{db.rows.set('owner',{source:'ThirdKey',revision:4});return listed}),e=>e.status===409);
 assert.deepEqual(db.rows.get('owner'),{source:'ThirdKey',revision:4});
});
test('a changed secret during the test cannot reuse the previous verification',async()=>{
 const db=adapter();let current=fixtureKey;
 await assert.rejects(testAndSelectPreference(db,'owner','WriterKey',0,()=>current,async()=>{current='sk-rotated-unit-test-only-value';return listed}),e=>e.status===409);
 assert.equal(db.rows.size,0);
});
test('two simultaneous choices only save one tested source',async()=>{
 const db=adapter();let unblock;const gate=new Promise(resolve=>{unblock=resolve});
 const first=testAndSelectPreference(db,'owner','FirstKey',0,()=>fixtureKey,async()=>{await gate;return listed});
 const second=testAndSelectPreference(db,'owner','SecondKey',0,()=>fixtureKey,async()=>{await gate;return listed});
 unblock();const results=await Promise.allSettled([first,second]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal((await readPreference(db,'owner')).revision,1);
});
test('known non-writing families are excluded while actual returned IDs remain intact',async()=>{
 const excluded=['gpt-image-1','dall-e-3','whisper-1','tts-1','gpt-4o-realtime-preview','gpt-4o-mini-transcribe','gpt-audio','text-embedding-3-small','omni-moderation-latest','sora-2','babbage-002'];
 const included=['gpt-4.1','gpt-4o','o3','ft:gpt-4o:example','future-text-model','gpt-new-writing'];
 for(const id of excluded)assert.equal(isWritingCandidate(id),false,id);
 for(const id of included)assert.equal(isWritingCandidate(id),true,id);
 const ids=[...included,...excluded];const result=await listProviderModels(fixtureKey,{fetchImpl:async()=>Response.json({object:'list',data:ids.map(id=>({object:'model',id}))})});
 assert.deepEqual(new Set(result.writingModels.map(x=>x.id)),new Set(included));assert.equal(result.excludedCount,excluded.length);assert.equal(result.models.length,ids.length);
});
test('context previews support dynamic source references and remain bound to their revision',async()=>{
 const archive={version:1,state:{projects:[{id:'p',canonVersion:0,scenes:[{id:'s',title:'Scene',draft:'Text',revisions:[{id:'r',title:'Scene',body:'Text'}]}],facts:[]}]}};
 const input={projectId:'p',sceneId:'s',revisionId:'r',instruction:'Continue',storyMoment:'1',perspective:'omniscient',pov:'',factIds:[]};
 const a=await compileContext(input,archive,'model','https://api.openai.com/v1',{source:'MyWritingKey',revision:1});
 const b=await compileContext(input,archive,'model','https://api.openai.com/v1',{source:'MyWritingKey',revision:2});
 assert.notEqual(a.previewHash,b.previewHash);assert.equal(a.credentialSource,'MyWritingKey');
 await assert.rejects(compileContext(input,archive,'model','https://api.openai.com/v1',{source:'SITE_ADMIN_EMAIL',revision:1}));
});
