import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWritingProfile,publicBrief} from '../modules/novel-ai/writing-profile.mjs';
import {preparePlanPreview,preparePreview,runPrepared} from '../modules/novel-orchestration/auto-run.mjs';
import {buildAnalysisMessages} from '../modules/novel-ai/analysis.mjs';

const privateNote='私底稿：司时者埋下整片星海',future='解开第二重印才出现的银痕',first='纸面有压痕';
const writingProfile={styleId:'xuanhuan',authorConstraints:'保留两种能解释异象的假说',revealNow:first+'\n第二章：'+future+'\n凹处夹着银粉',holdBack:privateNote,untrustedMeta:{secret:'另一隐藏答案'}};
const seed={mode:'idea',idea:'古星葬中有一具无名遗骸。',sceneCount:2,writingProfile,prompts:{writer:'不作空泛议论'}};
const mockConfig=['test-model','https://api.openai.com/v1'];
const serialized=messages=>JSON.stringify(messages);

test('private notes cannot change a prompt or preview hash; late allowed text stays out of first stage',async()=>{
 const before=await preparePreview(seed,null,...mockConfig);
 const after=await preparePreview({...seed,writingProfile:{...writingProfile,holdBack:'换个幕后身份'}},null,...mockConfig);
 assert.equal(after.previewHash,before.previewHash);
 const publicLater=await preparePreview({...seed,writingProfile:{...writingProfile,revealNow:first+'\n第２幕：新的后幕线索'}},null,...mockConfig);
 assert.notEqual(publicLater.previewHash,before.previewHash);
 for(const object of [before,after]){
  assert.doesNotMatch(serialized(object),/私底稿|司时者|另一隐藏答案/);
  for(const msgs of [object.firstMessages,object.analysisTemplates.review,object.analysisTemplates.extract]){
   assert.ok(!serialized(msgs).includes(future));
  }
 }
 const plan=await preparePlanPreview(seed,...mockConfig);
 const planInput=JSON.parse(plan.messages[1].content);
 assert.equal(planInput.revealNow,first);assert.deepEqual(planInput.laterClueScenes,[2]);assert.ok(!serialized(plan.messages).includes(future));
 assert.match(plan.messages[0].content,/场景规划 v1/);
 assert.equal(publicBrief(normalizeWritingProfile(writingProfile),3).revealNow,first+'\n'+future+'\n凹处夹着银粉');
});

test('xuanhuan v2 observation/time/POV rules reach actual writer and reviewer but never the extraction prompt',async()=>{
 const prepared=await preparePreview(seed,null,...mockConfig), sent=[];
 for await(const event of runPrepared({...prepared,input:seed,key:'fixture',model:mockConfig[0],baseUrl:mockConfig[1],loadArchive:async()=>null,
   generate:async(preview)=>{sent.push(preview.messages);return {text:'他俯身，看见了星尘。'};},
   runAnalysis:async(input)=>{sent.push(buildAnalysisMessages(input));return {issues:[],candidates:[]};}
 })) assert.notEqual(event.type,'error');
 assert.equal(sent.length,6);
 assert.deepEqual(sent[0],prepared.firstMessages);
 assert.equal(sent[2][0].content,prepared.analysisTemplates.review[0].content);
 for(const i of [0,3]){assert.match(sent[i][0].content,/玄幻 · 布局悟道 v2/);assert.match(sent[i][0].content,/未经接触不能断言/);assert.match(sent[i][0].content,/更早触发/);assert.match(sent[i][0].content,/全知旁白/);}
 for(const i of [2,5]){assert.match(sent[i][0].content,/玄幻 · 布局悟道 v2/);assert.match(sent[i][0].content,/事后观察不可单独排除先前原因/);}
 for(const i of [1,4]){assert.match(sent[i][0].content,/证据抽取 v2/);assert.doesNotMatch(serialized(sent[i]),/题材 · |私底稿|银痕|两种能解释异象/);}
 for(const i of [0,1,2,4])assert.ok(!serialized(sent[i]).includes(future));
 for(const i of [3,5])assert.ok(serialized(sent[i]).includes(future));
 assert.ok(!serialized(sent).includes(privateNote));
});
test('generic/suspense writing requests remain independent and invalid profiles fail before model use',async()=>{
 const generic=await preparePreview({...seed,writingProfile:undefined},null,...mockConfig);
 const suspense=await preparePreview({...seed,writingProfile:{styleId:'mystery'}},null,...mockConfig);
 assert.doesNotMatch(serialized(generic.firstMessages),/题材 · |玄幻|悬疑 · 证据推理/);
 assert.match(suspense.firstMessages[0].content,/悬疑 · 证据推理 v1/);
 assert.doesNotMatch(serialized(suspense.firstMessages),/尚未开放|私底稿|布局悟道/);
 await assert.rejects(preparePreview({...seed,writingProfile:{styleId:'bogus'}},null,...mockConfig),e=>e.status===400);
 await assert.rejects(preparePlanPreview({...seed,writingProfile:{authorConstraints:'a'.repeat(2001)}},...mockConfig),e=>e.status===400);
});
