import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generatePlan,preparePlanPreview,prepareRun,runPrepared} from '../modules/novel-orchestration/auto-run.mjs';
import {applyCommand,initialState} from '../modules/novel-studio/server/domain.mjs';
const model='qa-writing-model',config={model,baseUrl:'https://api.openai.com/v1',key:'test-key'},binding={source:'NOVEL_OPENAI_API_KEY',revision:0};
const input={idea:'玄幻，重生，调查布局。',planMode:'book',writingProfile:{styleId:'xuanhuan',holdBack:'AUTHOR-NOTE'},sceneCount:2};
const outline={title:'模型返回的标题',premise:'命题摘要',rules:['规则产生可验后果。'],volumes:[{title:'第一卷',turn:'事件一导致改变。',reveal:'WRAP-ONLY-FIRST'},{title:'第二卷',turn:'转折有代价。',reveal:'AUTHOR-ONLY-ANSWER'}],convergence:'不同力量汇合',ending:'NEVER-IN-WRITER'};
const scenes=[{title:'章甲',goal:'PUBLIC-01'},{title:'章乙',goal:'PUBLIC-02'}],complete={bookOutline:outline,scenes};
const plan=async (p,payload=complete)=>generatePlan(p,{...config,generate:async actual=>{assert.deepEqual(actual.messages,p.messages);return {text:JSON.stringify(payload),model:'qa-returned'}}});
test('book and scenes contracts are mutually exclusive; book output is structured and attributable to the invoked planner',async()=>{
 const preview=await preparePlanPreview(input,model,config.baseUrl,binding);
 const other=await preparePlanPreview({...input,planMode:'scenes'},model,config.baseUrl,binding);
 assert.notEqual(preview.previewHash,other.previewHash);assert.match(preview.messages[0].content,/bookOutline/);assert.doesNotMatch(other.messages[0].content,/bookOutline/);assert.doesNotMatch(JSON.stringify(preview.messages),/AUTHOR-NOTE/);
 const result=await plan(preview);assert.deepEqual(result.bookOutline,outline);assert.deepEqual(result.scenes,scenes);assert.deepEqual(result.source,{role:'book-planner',template:'book-outline-v1',model:'qa-returned',previewHash:preview.previewHash,round:1});
 await assert.rejects(()=>plan(preview,{scenes}),/全书规划/);
 const old=await plan(other,{scenes});assert.deepEqual(old.scenes,scenes);assert.equal(old.bookOutline,undefined);
});
test('new feedback revises the prior model result only in planner; book plan and future card never enter chapter one, even if extra fields supplied',async()=>{
 const first=await plan(await preparePlanPreview(input,model,config.baseUrl,binding));
 const revision={previousOutline:first.bookOutline,previousChapters:first.scenes,source:first.source,feedback:'REVISION-ONLY 请改收束。'};
 const pp=await preparePlanPreview({...input,planRevision:revision},model,config.baseUrl,binding);
 assert.match(pp.messages[1].content,/NEVER-IN-WRITER/);assert.match(pp.messages[1].content,/REVISION-ONLY/);
 const other=await preparePlanPreview({...input,planRevision:{...revision,feedback:'改另一处'}},model,config.baseUrl,binding);assert.notEqual(other.previewHash,pp.previewHash);
 const second=await plan(pp);assert.equal(second.source.round,2);
 const manuscript={...input,mode:'idea',proseUnit:'chapter',scenePlans:second.scenes.map(x=>x.title+'：'+x.goal),bookOutline:second.bookOutline,planRevision:revision};
 const p=await prepareRun(manuscript,null,model,config.baseUrl,config.key,binding),sent=[],checks=[];
 for await(const e of runPrepared({input:manuscript,...p,...config,generate:async prev=>{sent.push(prev.messages);return {text:'候选正文'+sent.length,model}},runAnalysis:async i=>{checks.push(i);return {candidates:[],issues:[]}}}))assert.notEqual(e.type,'error');
 assert.equal(sent.length,2);assert.deepEqual(p.firstMessages,sent[0]);assert.match(JSON.stringify(sent[0]),/完整中文小说章节/);assert.match(JSON.stringify(sent[0]),/PUBLIC-01/);assert.doesNotMatch(JSON.stringify(sent[0]),/PUBLIC-02/);assert.match(JSON.stringify(sent[1]),/PUBLIC-02/);
 assert.doesNotMatch(JSON.stringify([sent,checks]),/AUTHOR-NOTE|AUTHOR-ONLY|WRAP-ONLY|NEVER-IN-WRITER|REVISION-ONLY/);
});
test('confirmed save preserves opening chapters and book outline as author plans only; forged contour cannot create canon/facts',async()=>{
 const r=await plan(await preparePlanPreview(input,model,config.baseUrl,binding));let original=initialState();
 const cmd={type:'create_project_with_scene_drafts',projectId:'p',name:'qa',scenes:scenes.map((s,i)=>({sceneId:'s'+i,title:s.title,body:'候选正文'})),bookPlan:{bookOutline:r.bookOutline,source:{...r.source,anotherField:'ignore-me'},facts:['never']}};
 const p=applyCommand(original,cmd).state.projects[0];assert.equal(original.projects.length,0);assert.equal(p.scenes.length,2);assert.equal(p.facts.length,0);assert.equal(p.canonVersion,0);assert.ok(p.records.some(e=>e.content.includes('NEVER-IN-WRITER')));assert.ok(p.records.every(x=>x.status==='plan'&&x.category==='outline'&&x.visibility==='author_only'&&x.source.round===1));assert.doesNotMatch(JSON.stringify(p.records),/ignore-me/);
 assert.throws(()=>applyCommand(original,{...cmd,bookPlan:{...cmd.bookPlan,source:{...r.source,template:'other'}}}),/来源/);
});
