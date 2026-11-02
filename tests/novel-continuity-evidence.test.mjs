import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOutput,validateInput} from '../modules/novel-ai/analysis.mjs';
import {preparePreview,runPrepared} from '../modules/novel-orchestration/auto-run.mjs';

const earlier='玄碑被劈成两半，左半交给了守陵人。';
const later='他从未交出左半玄碑。';
const base='裴既明将玄碑藏在剑匣内。';
const revision='first-saved';
const check={mode:'check',scene:{revisionId:'candidate-2',text:later},facts:[],baseScene:{revisionId:revision,text:base},priorDrafts:[{revisionId:'candidate-1',text:earlier}]};
const issue={sourceScope:'priorDraft',description:'两幕对玄碑移交的描述需要作者核对。',factIds:[],quote:'从未交出左半玄碑',priorDraftEvidence:{revisionId:'candidate-1',quote:'左半交给了守陵人'}};
function parse(i,input=check){return parseOutput(JSON.stringify({issues:[i]}),validateInput(input)).issues[0]}
test('a prior draft conflict cites the correct revision and exact spans in both manuscripts; no canon ID is created',()=>{
 const r=parse(issue);
 assert.equal(r.sourceScope,'priorDraft');assert.deepEqual(r.factIds,[]);
 assert.equal(r.priorDraftEvidence.sceneIndex,1);
 assert.equal(earlier.slice(r.priorDraftEvidence.start,r.priorDraftEvidence.end),issue.priorDraftEvidence.quote);
 assert.equal(later.slice(r.evidence.start,r.evidence.end),issue.quote);
});
test('a cross-draft claim cannot invent a quote, cite a different manuscript, omit its scope, or masquerade as a formal fact',()=>{
 for(const i of [
   {...issue,quote:'第一章没说过这句话'},
   {...issue,priorDraftEvidence:{...issue.priorDraftEvidence,quote:'从未交出左半玄碑'}},
   {...issue,priorDraftEvidence:{...issue.priorDraftEvidence,revisionId:'candidate-2'}},
   {...issue,sourceScope:'canon'},{...issue,sourceScope:undefined},{...issue,factIds:['candidate-1']},
 ])assert.throws(()=>parse(i),x=>x.status===502);
});
test('saved text is a separate evidence class, scoped to the exact selected revision',()=>{
 const i={sourceScope:'baseScene',description:'需核对起点',quote:issue.quote,factIds:[],baseSceneEvidence:{revisionId:revision,quote:'藏在剑匣内'}};
 const r=parse(i);assert.equal(base.slice(r.baseSceneEvidence.start,r.baseSceneEvidence.end),'藏在剑匣内');assert.ok(!r.priorDraftEvidence);
 assert.throws(()=>parse({...i,baseSceneEvidence:{revisionId:'stale',quote:'藏在剑匣内'}}),x=>x.status===502);
 assert.throws(()=>parse({...i,baseSceneEvidence:{revisionId:revision,quote:'左半交给了守陵人'}}),x=>x.status===502);
});
test('only reviewers get reference manuscripts; future, unordered and oversized histories are rejected before calling the model',()=>{
 assert.throws(()=>validateInput({...check,mode:'extract'}),x=>x.status===400);
 assert.throws(()=>validateInput({...check,priorDrafts:[{revisionId:'candidate-3',text:'故意添加的未来文本'}]}),x=>x.status===400);
 const draft=n=>({revisionId:'candidate-'+n,text:'纸'.repeat(11000)});
 assert.throws(()=>validateInput({...check,scene:{...check.scene,revisionId:'candidate-3'},priorDrafts:[draft(1),draft(2)]}),x=>x.status===400);
});
test('saved-scene continuation previews and sends only the selected saved prose to the reviewer, never to the extractor as reference; ignores forged client history',async()=>{
 const other='另一本书的未公开结局';
 const archive={version:2,state:{projects:[{id:'p',canonVersion:0,scenes:[{id:'s',title:'玄碑',draft:base,revisions:[{id:revision,title:'玄碑',body:base}]}],facts:[]},{id:'other',scenes:[{draft:other}]}]}};
 const input={mode:'scene',projectId:'p',sceneId:'s',revisionId:revision,sceneCount:1,factIds:[],instruction:'写下一章',storyMoment:'2',perspective:'omniscient',pov:'',priorDrafts:[{text:other}],baseScene:{text:other}};
 const p=await preparePreview(input,archive,'model','https://api.openai.com/v1');
 const templates=p.analysisTemplates;assert.deepEqual(JSON.parse(templates.review[1].content).baseScene,{revisionId:revision,text:base});assert.ok(!('baseScene' in JSON.parse(templates.extract[1].content)));
 const seen=[],events=[];
 for await (const event of runPrepared({input,...p,key:'fake',model:'model',baseUrl:'https://api.openai.com/v1',loadArchive:async()=>archive,
   generate:async()=>({text:later}),runAnalysis:async i=>{seen.push(i);return {candidates:[],issues:[]}}}))events.push(event);
 assert.equal(events.at(-1).type,'complete');assert.ok(!('baseScene' in seen[0]));assert.deepEqual(seen[1].baseScene,{revisionId:revision,text:base});assert.ok(!('priorDrafts' in seen[1]));
 assert.doesNotMatch(JSON.stringify([templates,seen]),/另一本书的未公开结局/);
});
