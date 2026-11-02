/** Acceptance at the model HTTP boundary: the real planning, transport, parsing,
 * hashing and scene orchestration run; only the provider's HTTP reply is a fixture.
 * The examples verify who saw what and when, not literary quality. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../modules/novel-ai/analysis.mjs';
import { generateFromPreview } from '../modules/novel-ai/context.mjs';
import { preparePreview, prepareRun, preparePlanPreview, generatePlan, runPrepared } from '../modules/novel-orchestration/auto-run.mjs';

const provider={model:'fixture-writing',baseUrl:'https://api.openai.com/v1',key:'test-credential-only'};
const binding={source:'TEST_CONNECTION',revision:2};
const constraints='保留诸界尺度与古人布局，开局不用童谣或地方救灾故事。';
const now='浑仪在封殿前已有缺口';
const next='钟舌上有第三道锉痕';
const laterScene='两面古镜各自只照得见一半';
const secret='私底稿独有甲七四九';
const privateOther='另一部作品南窗案独有乙二六九';
const candidateOnly='提取器提出的假设丙五四三';
const first='季晦抬起浑仪，看见铜环上的缺口；他折断铜环，碎片留在殿外。';
const second='季晦从衣袋中摸出完整的铜环，它从未断过。';
const story={mode:'idea',idea:'横贯数纪的一部玄幻，失去旧境的测星师重生，由一条线索起步。',instruction:'写正文',prompts:{writer:'语言从容',extract:'把推测和目击区分开',review:'不要把未揭晓当成矛盾'},sceneCount:2,scenePlans:['观察浑仪',laterScene],writingProfile:{styleId:'xuanhuan',authorConstraints:constraints,revealNow:`第1幕：${now}\n第2幕：${next}`,holdBack:secret,otherBook:{notes:privateOther}}};
const makePlan=i=>preparePlanPreview({...i,plannerPrompt:'先陈列疑点；后用第二件物证排除一个解释。'},provider.model,provider.baseUrl,binding);
const makePreview=i=>preparePreview(i,null,provider.model,provider.baseUrl,binding);
const withProfile=(profile)=>({...story,writingProfile:{...story.writingProfile,...profile}});
const dump=x=>JSON.stringify(x);
const includes=(x,v)=>assert.ok(dump(x).includes(v),`missing allowed material: ${v}`);
const excludes=(x,v)=>assert.ok(!dump(x).includes(v),`unexpected material: ${v}`);

test('the exact seven provider payloads match the preview and canvas without leaking a later clue, private note or candidate fact', async()=>{
  const wire=[];
  const planResult={scenes:[{title:'浑仪',goal:'观察铜环'},{title:'双镜',goal:laterScene}]};
  const issue={sourceScope:'priorDraft',description:'前幕铜环折断，本幕却称从未断过。需要作者核对。',quote:'它从未断过',factIds:[],priorDraftEvidence:{revisionId:'candidate-1',quote:'他折断铜环'}};
  const contents=[JSON.stringify(planResult),first,JSON.stringify({candidates:[{statement:candidateOnly,kind:'belief',subject:'季晦',storyTime:'',quote:'铜环上的缺口'}]}),'{"issues":[]}',second,'{"candidates":[]}',JSON.stringify({issues:[issue]})];
  const fakeFetch=async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/chat/completions');
    const body=JSON.parse(options.body); wire.push(body);
    assert.equal(body.model,provider.model);
    assert.ok(wire.length<=contents.length,'unexpected extra provider request');
    return Response.json({model:provider.model,choices:[{finish_reason:'stop',message:{content:contents[wire.length-1]}}]});
  };
  const generate=(preview,options)=>generateFromPreview(preview,{...options,fetchImpl:fakeFetch});
  const runAnalysis=(input,options)=>analyze(input,{...options,fetchImpl:fakeFetch});
  const plan=await makePlan(story);
  const intended=await generatePlan(plan,{...provider,generate});
  assert.deepEqual(intended.scenes,planResult.scenes); assert.deepEqual(wire[0].messages,plan.messages);
  includes(wire[0],constraints); excludes(plan,secret); excludes(plan,privateOther);
  const input={...story,scenePlans:intended.scenes.map(s=>s.goal)};
  const pre=await makePreview(input);
  const ready=await prepareRun(input,null,provider.model,provider.baseUrl,provider.key,binding);
  assert.equal(ready.previewHash,pre.previewHash);
  const events=[];
  for await(const ev of runPrepared({input,...ready,...provider,generate,runAnalysis,loadArchive:async()=>{throw new Error('new book has no archive')}}))events.push(ev);
  assert.equal(events.at(-1)?.data?.status,'REVIEW',JSON.stringify(events.at(-1)));
  assert.equal(wire.length,7);
  assert.deepEqual(events.filter(e=>e.type==='stage_start').map(e=>e.data.messages),wire.slice(1).map(x=>x.messages));
  assert.deepEqual(wire[1].messages,pre.firstMessages);
  const [,w1,e1,r1,w2,e2,r2]=wire;
  for(const w of [w1,w2]){includes(w,constraints);includes(w,now);}
  excludes(w1,next);excludes(w1,laterScene);excludes(r1,next);includes(w2,next);includes(w2,laterScene);
  includes(w2,first);includes(r2,first);includes(r2,second);excludes(r1,second);
  for(const x of [e1,e2]){excludes(x,constraints);excludes(x,next);excludes(x,now);}
  excludes(e2,first);
  for(const x of [w1,e1,r1,w2,e2,r2])excludes(x,candidateOnly);
  includes(events.find(e=>e.type==='extract_ready').data.candidates,candidateOnly);
  for(const x of [plan,pre,ready,wire,events]){excludes(x,secret);excludes(x,privateOther);}
  assert.deepEqual(JSON.parse(r2.messages.at(-1).content).facts,[],'a previous draft was not promoted to approved facts');
  const found=events.filter(e=>e.type==='review_ready')[1].data.issues[0];
  assert.equal(found.sourceScope,'priorDraft');assert.equal(found.priorDraftEvidence.revisionId,'candidate-1');
  assert.equal(first.slice(found.priorDraftEvidence.start,found.priorDraftEvidence.end),'他折断铜环');
  assert.equal(second.slice(found.evidence.start,found.evidence.end),'它从未断过');
});

test('same-scene requests rebind on style/author edits and are independent of unrelated projects and never-send fields', async()=>{
  const x=await makePreview(story), p=await makePlan(story);
  const m=await makePreview(withProfile({styleId:'mystery'}));
  const g=await makePreview(withProfile({styleId:'general'}));
  assert.notEqual(m.previewHash,x.previewHash);assert.notEqual(g.previewHash,x.previewHash);assert.notDeepEqual(m.firstMessages,x.firstMessages);
  const edited=withProfile({authorConstraints:'开篇先证伪两种天象解释。'});
  assert.notEqual((await makePreview(edited)).previewHash,x.previewHash);
  assert.notEqual((await makePlan(edited)).previewHash,p.previewHash);
  const alteredPrivate=withProfile({holdBack:'另一条永不发送的答案',otherBook:{notes:'与当前作品无关'}});
  const same=await makePreview(alteredPrivate);
  assert.equal(same.previewHash,x.previewHash);assert.deepEqual(same.firstMessages,x.firstMessages);
  assert.equal((await makePlan(alteredPrivate)).previewHash,p.previewHash);
  const independent=await makePreview({mode:'idea',idea:'只在小镇中发生的独立推理。',sceneCount:1,writingProfile:{styleId:'mystery'}});
  excludes(independent.firstMessages,constraints);excludes(independent.firstMessages,now);excludes(independent.firstMessages,next);
});
