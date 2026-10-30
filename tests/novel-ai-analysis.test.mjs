import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, AnalysisError, validateInput } from '../modules/novel-ai/analysis.mjs';

const sample={mode:'extract',scene:{text:'林追说：“门是锁着的。”其实门是开着的。',revisionId:'rev-1',storyTime:'第三夜'},facts:[{id:'f1',statement:'门在第三夜开着',kind:'world',storyTime:'第三夜'}]};
const options={key:'test-only',model:'test-model'};
const mock=(content, extra={})=>async()=>Response.json({model:'test-model',choices:[{finish_reason:'stop',message:{content},...extra}]});
const bad=async (p, code)=>assert.rejects(p,error=>error instanceof AnalysisError && error.status===code);

test('a speech claim remains speech; evidence must be an exact scene quote',async()=>{
 const r=await analyze(sample,{...options,fetchImpl:mock(JSON.stringify({candidates:[{statement:'林追声称门锁着',kind:'speech',subject:'林追',storyTime:'第三夜',quote:'门是锁着的。'}]}))});
 assert.equal(r.status,'REVIEW');assert.equal(r.candidates[0].kind,'speech');assert.equal(sample.scene.text.slice(r.candidates[0].evidence.start,r.candidates[0].evidence.end),'门是锁着的。');assert.equal(r.sceneHash.length,64);assert.equal(r.inputHash.length,64);assert.deepEqual(r.issues,[]);
});
test('world facts and mistaken beliefs stay separate and never become authoritative',async()=>{
 const r=await analyze(sample,{...options,fetchImpl:mock(JSON.stringify({candidates:[{statement:'林追误以为门锁着',kind:'belief',subject:'林追',storyTime:'第三夜',quote:'门是锁着的。'},{statement:'门是开着的',kind:'world',subject:'',storyTime:'第三夜',quote:'其实门是开着的。'}]}))});
 assert.deepEqual(r.candidates.map(c=>c.kind),['belief','world']);assert.equal(r.status,'REVIEW');
});
test('unknown facts and fabricated quotations fail closed',async()=>{
 await bad(analyze(sample,{...options,fetchImpl:mock(JSON.stringify({candidates:[{statement:'测试',kind:'world',subject:'',storyTime:'',quote:'正文中不存在'}]}))}),502);
 await bad(analyze({...sample,mode:'check'},{...options,fetchImpl:mock(JSON.stringify({issues:[{description:'疑似矛盾',quote:'门是锁着的。',factIds:['unknown']}]}))}),502);
});
test('duplicate quote locations are disclosed',async()=>{
 const i={...sample,scene:{...sample.scene,text:'门开了。后来门开了。'}};
 const r=await analyze(i,{...options,fetchImpl:mock(JSON.stringify({candidates:[{statement:'门开了',kind:'world',subject:'',storyTime:'',quote:'门开了。'}]}))});
 assert.equal(r.candidates[0].evidence.occurrences,2);
});
test('empty valid issue list means REVIEW not PASS',async()=>{
 const r=await analyze({...sample,mode:'check'},{...options,fetchImpl:mock('{"issues":[]}')});assert.equal(r.status,'REVIEW');assert.deepEqual(r.issues,[]);assert.match(r.notice,/不代表全书一致/);
});
test('missing credentials, empty result, invalid JSON, missing fields and truncated output fail closed',async()=>{
 await bad(analyze(sample,{key:'',model:'x'}),503);
 await bad(analyze(sample,{...options,fetchImpl:mock('')}),502);
 await bad(analyze(sample,{...options,fetchImpl:mock('not json')}),502);
 await bad(analyze(sample,{...options,fetchImpl:mock('{}')}),502);
 await bad(analyze(sample,{...options,fetchImpl:mock('{"candidates":[]}',{finish_reason:'length'})}),502);
});
test('malformed or oversized inputs rejected and facts may not share identity',()=>{
 assert.throws(()=>validateInput({...sample,scene:{...sample.scene,text:'x'.repeat(12001)}}),AnalysisError);
 assert.throws(()=>validateInput({...sample,facts:[sample.facts[0],sample.facts[0]]}),AnalysisError);
 assert.throws(()=>validateInput({...sample,facts:[{...sample.facts[0],kind:'confirmed'}]}),AnalysisError);
});
test('network errors do not expose error details or credentials',async()=>{
 await assert.rejects(analyze(sample,{...options,fetchImpl:async()=>{throw Error('sensitive internal details')}}),error=>error.status===502&&!error.message.includes('sensitive'));
});
