import test from 'node:test';
import assert from 'node:assert/strict';
import { compileContext,generateFromPreview,ContextError } from '../modules/novel-ai/context.mjs';
import { analyze } from '../modules/novel-ai/analysis.mjs';
const archived={version:6,state:{projects:[{id:'p1',canonVersion:4,scenes:[{id:'s1',title:'现在',draft:'门开了。',revisions:[{id:'r1',title:'现在',body:'门开了。'}]},{id:'s2',title:'旧',draft:'钥匙交给梅。',revisions:[{id:'r2',title:'旧',body:'钥匙交给梅。'}]}],facts:[{id:'f1',layer:'world',subject:'',statement:'钥匙在梅手里',storyTime:'2',sceneId:'s2',revisionId:'r2',evidence:'钥匙交给梅。',canonVersion:1},{id:'f2',layer:'belief',subject:'梅',statement:'梅认为钥匙是铜的',storyTime:'3',sceneId:'s2',revisionId:'r2',evidence:'钥匙交给梅。',canonVersion:2},{id:'f3',layer:'speech',subject:'林',statement:'林声称钥匙丢了',storyTime:'4',sceneId:'s2',revisionId:'r2',evidence:'钥匙交给梅。',canonVersion:3},{id:'f4',layer:'plan',subject:'梅',statement:'梅计划开门',storyTime:'第十天',sceneId:'s2',revisionId:'r2',evidence:'钥匙交给梅。',canonVersion:4}]}]}};
const input={projectId:'p1',sceneId:'s1',revisionId:'r1',instruction:'接着写',storyMoment:'3',perspective:'omniscient',pov:'',factIds:['f1','f2','f3','f4']};
const compile=(i=input,a=archived,model='model')=>compileContext(i,a,model);
const failure=async (p,status)=>assert.rejects(p,e=>e instanceof ContextError&&e.status===status);

test('preview includes confirmed selected past records with layers and excludes future or incomparable time',async()=>{
 const p=await compile();assert.deepEqual(p.included.map(x=>x.id),['f1','f2']);assert.match(p.excluded.find(x=>x.id==='f3').reason,/晚于/);assert.match(p.excluded.find(x=>x.id==='f4').reason,/数字/);
 const payload=JSON.parse(p.messages[1].content);assert.equal(payload.reference.world[0].statement,'钥匙在梅手里');assert.equal(payload.reference.belief[0].subject,'梅');assert.equal(payload.reference.speech.length,0);assert.match(p.messages[0].content,/计划.*不表示事件已经发生/);assert.equal(p.provider,'https://api.openai.com/v1/chat/completions');
});
test('limited viewpoint excludes unverified world knowledge and other people, includes own belief',async()=>{
 const p=await compile({...input,perspective:'limited',pov:'梅',storyMoment:'5'});assert.deepEqual(p.included.map(x=>x.id),['f2']);assert.match(p.excluded.find(x=>x.id==='f1').reason,/知情关系/);assert.match(p.excluded.find(x=>x.id==='f3').reason,/视角人物/);
});
test('revised source or uncommitted facts do not enter context',async()=>{
 const a=structuredClone(archived);a.state.projects[0].scenes[1].draft='钥匙藏在井里。';const p=await compile({...input,factIds:['f1','not_committed']},a);assert.deepEqual(p.included,[]);assert.match(p.excluded[0].reason,/变化/);assert.match(p.excluded[1].reason,/已确认/);
});
test('rejects unsaved/old scene or unparseable story moment',async()=>{
 const a=structuredClone(archived);a.state.projects[0].scenes[0].draft='修改中的正文';await failure(compile(input,a),409);await failure(compile({...input,storyMoment:'第三夜'}),400);
});
test('preview binds archive, instruction, input messages and model',async()=>{
 const a=await compile(),b=await compile({...input,instruction:'写另一种结局'}),c=await compile(input,{...archived,version:7}),d=await compile(input,archived,'different');assert.notEqual(a.previewHash,b.previewHash);assert.notEqual(a.previewHash,c.previewHash);assert.notEqual(a.previewHash,d.previewHash);assert.equal(a.previewHash.length,64);
});
test('model receives exactly preview messages and result stays candidate only',async()=>{
 const p=await compile();let req;const result=await generateFromPreview(p,{key:'secret',model:'model',fetchImpl:async(_url,options)=>{req=JSON.parse(options.body);return Response.json({model:'model',choices:[{finish_reason:'stop',message:{content:'一段候选'}}]})}});assert.deepEqual(req.messages,p.messages);assert.equal(req.max_completion_tokens,p.maxCompletionTokens);assert.equal(result.status,'REVIEW');assert.equal(result.text,'一段候选');assert.equal(result.previewHash,p.previewHash);
});
test('missing key, changed model, refusal and truncated response fail closed',async()=>{
 const p=await compile();await failure(generateFromPreview(p,{key:'',model:'model'}),503);await failure(generateFromPreview(p,{key:'x',model:'different'}),409);await failure(generateFromPreview(p,{key:'x',model:'model',fetchImpl:async()=>Response.json({choices:[{finish_reason:'length',message:{content:'partial'}}]})}),502);
});

test('review uses exact previewed messages, after future and stale facts were removed',async()=>{
 const p=await compile();let req;await analyze(p.reviewInput,{key:'secret',model:'model',fetchImpl:async(_url,options)=>{req=JSON.parse(options.body);return Response.json({model:'model',choices:[{finish_reason:'stop',message:{content:'{\"issues\":[]}'}}]})}});
 assert.deepEqual(req.messages,p.checkMessages);const source=JSON.parse(req.messages[1].content);assert.deepEqual(source.facts.map(f=>f.id),['f1','f2']);assert.equal(source.facts[1].subject,'梅');
});
