import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const code=await readFile(new URL('../public/apps/novel-studio/canvas.js',import.meta.url),'utf8');
const reply=(body,status=200)=>({ok:status<400,status,json:async()=>body});
const pause=()=>new Promise(setImmediate);
function eventStream(events){let sent=false;return {ok:true,status:200,body:{getReader:()=>({read:async()=>sent?{done:true}:(sent=true,{done:false,value:new TextEncoder().encode(events.map(([kind,data])=>`event: ${kind}\ndata: ${JSON.stringify(data)}\n\n`).join(''))})})}}}
const complete=[['context_ready',{messages:[],model:'qa-model'}],['stage_start',{stage:'draft',sceneIndex:1,messages:[{role:'user',content:'实际写作要求'}]}],['draft_ready',{sceneIndex:1,text:'画布测试正文',model:'qa-model'}],['stage_start',{stage:'extract',sceneIndex:1,messages:[]}],['extract_ready',{sceneIndex:1,candidates:[{statement:'信封是蓝色。',evidence:{quote:'蓝色信封'}}]}],['stage_start',{stage:'review',sceneIndex:1,messages:[]}],['review_ready',{sceneIndex:1,issues:[{description:'核对送信日期',evidence:{quote:'星期三'}}]}],['complete',{status:'REVIEW'}]];
async function boot({store=new Map(),mobile=false,account='qa',plan=null,auto=()=>eventStream(complete),allowLeave=false,projects=[]}={}){
 const calls=[],handlers={},windowHandlers={},toasts=[],focused=[],root={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn},viewport={clientWidth:mobile?340:800,scrollLeft:0,scrollTop:0};
 const document={querySelector:s=>s==='#root'?root:s==='.graph-viewport'?viewport:null,querySelectorAll:()=>[],getElementById:id=>['idea','instruction'].includes(id)?{focus:()=>focused.push(id)}:null,createElement:()=>({setAttribute(){},remove(){}}),body:{append(n){toasts.push(n.textContent)}}};
 const window={addEventListener:(type,fn)=>windowHandlers[type]=fn};
 const fetch=async(url,options={})=>{const body=options.body?JSON.parse(options.body):null;calls.push({url,body});if(url==='/api/hub/session')return reply({authenticated:true,userId:account});if(url.endsWith('/canon'))return reply({version:0,state:{schema:1,projects}});if(url.endsWith('/model-status'))return reply({model:'qa-model'});if(url.endsWith('/model-preference'))return reply({model:'qa-model'});if(url.endsWith('/models'))return reply({models:[{id:'qa-model'}],writingModels:[{id:'qa-model'}],sourceRevision:0});if(url.endsWith('/auto-preview'))return reply({previewHash:'qa-preview-'+(body.continuedDrafts?.length||0),startSceneIndex:1+(body.continuedDrafts?.length||0),model:'qa-model',messages:[{role:'user',content:body.idea}],analysisTemplates:{}});if(url.endsWith('/plan-preview'))return reply({previewHash:'qa-plan',model:'qa-model',messages:[{role:'user',content:body.idea}]});if(url.endsWith('/plan'))return plan?plan(body):reply({model:'qa-model',scenes:[{title:'来信',goal:'拆开信封'}]});if(url.endsWith('/auto-run'))return auto(body);throw Error('unexpected route')};
 const sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 vm.runInNewContext(code,{window,document,fetch,sessionStorage,crypto:webcrypto,Date,TextEncoder,TextDecoder,setTimeout:()=>0,console,confirm:()=>allowLeave,matchMedia:()=>({matches:mobile})});await pause();await pause();
 return {root,store,calls,viewport,window,windowHandlers,toasts,focused,input:(id,value)=>handlers.input({target:{id,value}}),change:(id,value)=>handlers.change({target:{id,value,dataset:{}}}),click:async(act,data={})=>handlers.click({target:{closest:()=>({dataset:{act,...data}})}})};
}
test('primary start prepares and runs once; graph shows real stages and optional planner stays skipped',async()=>{const h=await boot();h.input('idea','一封信');assert.match(h.root.innerHTML,/graph-connectors/);assert.match(h.root.innerHTML,/data-stage="prepare"/);assert.doesNotMatch(h.root.innerHTML,/data-edge=|data-stage="(?:plan|draft|extract|review|save)"/);assert.doesNotMatch(h.root.innerHTML,/data-reader=/);await h.click('start-creation');assert.equal(h.calls.filter(x=>x.url.endsWith('/auto-preview')).length,1);assert.equal(h.calls.filter(x=>x.url.endsWith('/auto-run')).length,1);for(const stage of ['draft','extract','review'])assert.match(h.root.innerHTML,new RegExp('graph-node complete [^"]*" data-act="inspect-stage" data-stage="'+stage+'"'));assert.match(h.root.innerHTML,/画布测试正文/);assert.match(h.root.innerHTML,/graph-node ready [^"]*" data-act="inspect-stage" data-stage="save"/);assert.equal(h.calls.filter(x=>x.url.endsWith('/canon')&&x.body).length,0)});
test('output tabs have distinct content and prompt edits survive switching tabs and page boot',async()=>{const store=new Map(),h=await boot({store});h.input('idea','构思草稿');await h.click('result-tab',{tab:'prompts'});assert.match(h.root.innerHTML,/id="idea-writer"/);h.input('idea-writer','慢节奏，少对白');await h.click('result-tab',{tab:'facts'});assert.match(h.root.innerHTML,/事实与原文证据/);assert.doesNotMatch(h.root.innerHTML,/id="idea-writer"/);await h.click('result-tab',{tab:'review'});assert.match(h.root.innerHTML,/审阅意见与依据/);const restored=await boot({store});await restored.click('result-tab',{tab:'prompts'});assert.match(restored.root.innerHTML,/慢节奏，少对白/);restored.input('idea-model','qa-model');await restored.click('start-creation');assert.equal(restored.calls.find(x=>x.url.endsWith('/auto-run')).body.prompts.writer,'慢节奏，少对白')});
test('node selection opens the actual stage input and output, without model requests',async()=>{const h=await boot();h.input('idea','构思');await h.click('start-creation');const count=h.calls.length;await h.click('inspect-stage',{stage:'draft'});assert.match(h.root.innerHTML,/class="stage-inspector"/);assert.match(h.root.innerHTML,/画布测试正文/);await h.click('inspector-tab',{tab:'input'});assert.match(h.root.innerHTML,/实际写作要求/);assert.equal(h.calls.length,count);await h.click('result-tab',{tab:'facts'});assert.match(h.root.innerHTML,/信封是蓝色/);await h.click('result-tab',{tab:'review'});assert.match(h.root.innerHTML,/核对送信日期/)});
test('network interruption changes the active node to unknown instead of leaving a spinning state',async()=>{const first=new TextEncoder().encode('event: stage_start\ndata: {"stage":"draft","sceneIndex":1}\n\n');let read=0;const h=await boot({auto:()=>({ok:true,status:200,body:{getReader:()=>({read:async()=>{if(read++===0)return {done:false,value:first};throw Error('connection dropped')}})}})});h.input('idea','构思');await h.click('start-creation');assert.match(h.root.innerHTML,/graph-node unknown [^"]*" data-act="inspect-stage" data-stage="draft"/);assert.doesNotMatch(h.root.innerHTML,/graph-node running/);assert.match(h.root.innerHTML,/结果未知/);assert.equal(h.calls.filter(x=>x.url.endsWith('/auto-run')).length,1)});
test('mobile initially shows canvas with collapsed setup and zoom preserves viewport position',async()=>{const h=await boot({mobile:true});assert.match(h.root.innerHTML,/writing-desk brief-collapsed/);assert.match(h.root.innerHTML,/展开设置/);h.viewport.scrollLeft=72;await h.click('zoom-in');assert.equal(h.viewport.scrollLeft,72);assert.match(h.root.innerHTML,/110%/);await h.click('toggle-brief');assert.doesNotMatch(h.root.innerHTML,/writing-desk brief-collapsed/);assert.match(h.root.innerHTML,/id="idea"/)});
test('host navigation can be canceled when outputs are unsaved, and allowed navigation suppresses duplicate unload',async()=>{const h=await boot();h.input('idea','构思');await h.click('start-creation');assert.equal(await h.window.HubBeforeLeave(),false);let blocked=false;h.windowHandlers.beforeunload({preventDefault(){blocked=true}});assert.equal(blocked,true);const approved=await boot({allowLeave:true});approved.input('idea','构思');await approved.click('start-creation');assert.equal(await approved.window.HubBeforeLeave(),true);blocked=false;approved.windowHandlers.beforeunload({preventDefault(){blocked=true}});assert.equal(blocked,false);approved.window.HubCancelLeave();approved.windowHandlers.beforeunload({preventDefault(){blocked=true}});assert.equal(blocked,true)});

function edge(html,name){return html.match(new RegExp('<path[^>]*data-edge="'+name+'"[^>]*>'))?.[0]||''}
test('mobile canvas primary action opens and focuses an empty brief, then starts creation after typing',async()=>{
 const h=await boot({mobile:true});
 assert.match(h.root.innerHTML,/class="primary canvas-primary" data-act="canvas-primary"[^>]*>填写构思/);
 const initialCalls=h.calls.length;await h.click('canvas-primary');
 assert.doesNotMatch(h.root.innerHTML,/writing-desk brief-collapsed/);
 assert.ok(h.focused.includes('idea'));assert.equal(h.calls.length,initialCalls);
 assert.doesNotMatch(h.root.innerHTML,/class="primary canvas-primary"/);
 h.input('idea','一封从未来寄来的信');await h.click('start-creation');
 assert.equal(h.calls.filter(x=>x.url.endsWith('/auto-run')).length,1);
 assert.equal(h.calls.find(x=>x.url.endsWith('/auto-run')).body.idea,'一封从未来寄来的信');
});
test('optional planning stays dashed with direct bypass until a real plan is adopted',async()=>{
 const h=await boot();h.input('idea','构思');await h.click('idea-preview');await h.click('graph-view',{view:'blueprint'});
 assert.match(edge(h.root.innerHTML,'prepare-plan'),/graph-edge idle optional/);
 assert.match(edge(h.root.innerHTML,'plan-draft'),/graph-edge idle optional/);
 assert.ok(edge(h.root.innerHTML,'prepare-draft'));
 await h.click('plan-preview');await h.click('plan-run');
 assert.match(edge(h.root.innerHTML,'prepare-plan'),/graph-edge complete/);
 assert.match(edge(h.root.innerHTML,'plan-draft'),/optional/);
 assert.ok(edge(h.root.innerHTML,'prepare-draft'));
 await h.click('plan-apply');assert.equal(edge(h.root.innerHTML,'prepare-draft'),'');
 assert.doesNotMatch(edge(h.root.innerHTML,'plan-draft'),/optional/);
 await h.click('start-creation');assert.equal(edge(h.root.innerHTML,'prepare-draft'),'');
 assert.deepEqual(h.calls.find(x=>x.url.endsWith('/auto-run')).body.scenePlans,['来信：拆开信封']);
});
test('narrow layout and settings toggles preserve readable 100 percent zoom until explicit fit',async()=>{
 const h=await boot();h.viewport.clientWidth=340;await h.click('toggle-brief');
 assert.match(h.root.innerHTML,/transform:scale\(1\)/);
 await h.click('toggle-brief');assert.match(h.root.innerHTML,/transform:scale\(1\)/);
 await h.click('zoom-fit');assert.match(h.root.innerHTML,/transform:scale\(0\.5\)/);
 await h.click('toggle-brief');assert.match(h.root.innerHTML,/transform:scale\(0\.5\)/);
});

test('expanded desktop settings own the primary action and collapsing moves it into the toolbar',async()=>{
 const h=await boot();assert.match(h.root.innerHTML,/data-act="start-creation"/);
 assert.doesNotMatch(h.root.innerHTML,/class="primary canvas-primary"/);
 assert.doesNotMatch(h.root.innerHTML,/canvas-toolbar has-primary/);
 await h.click('toggle-brief');assert.match(h.root.innerHTML,/canvas-toolbar has-primary/);
 assert.match(h.root.innerHTML,/class="primary canvas-primary"/);
 await h.click('toggle-brief');assert.doesNotMatch(h.root.innerHTML,/class="primary canvas-primary"/);
});

const profileBook=(id)=>({id,name:id,facts:[],scenes:['1','2'].map(n=>({id:id+n,title:n,draft:n,revisions:[{id:'r'+id+n,title:n,body:n}]}))});
test('public constraints and scheduled reveals travel with planner and writer; private solutions never leave the browser',async()=>{
 const h=await boot({mobile:true});await h.click('toggle-brief');h.input('idea','开陵辨认旧伤');h.change('writing-style','xuanhuan');h.input('author-constraints','只借选择写悟道');h.input('scene-reveal','第一幕先见旧伤\n第2幕：刻痕调换');h.input('private-holdback','无人知道的幕后身份');h.change('idea-count','2');
 await h.click('plan-preview');await h.click('plan-run');await h.click('start-creation');
 const posted=h.calls.filter(c=>c.body);assert.equal(posted.length,4);for(const c of posted){assert.deepEqual(c.body.writingProfile,{styleId:'xuanhuan',authorConstraints:'只借选择写悟道',revealNow:'第一幕先见旧伤\n第2幕：刻痕调换'});assert.doesNotMatch(JSON.stringify(c.body),/无人知道的幕后身份|holdBack/)}
 assert.match(h.root.innerHTML,/无人知道的幕后身份/);assert.match(h.root.innerHTML,/第2幕：/);
});
test('new stories, accounts, books and scenes receive only their own notes and prompts',async()=>{
 const store=new Map(),projects=[profileBook('a'),profileBook('b')],h=await boot({store,projects});h.input('idea','新书开头');h.change('writing-style','xuanhuan');h.input('private-holdback','新书柜里的一封信');h.input('idea-writer','新作专用写法');
 await h.click('set-mode',{mode:'scene'});assert.doesNotMatch(h.root.innerHTML,/新书柜里的一封信/);h.change('writing-style','mystery');h.input('author-constraints','只写甲书');h.input('private-holdback','甲书秘密');h.input('scene-reveal','一幕蓝信');h.input('instruction','甲书一幕指令');
 h.change('scene','a2');assert.match(h.root.innerHTML,/甲书秘密/);assert.doesNotMatch(h.root.innerHTML,/一幕蓝信|甲书一幕指令/);h.input('scene-reveal','二幕红信');h.change('project','b');assert.doesNotMatch(h.root.innerHTML,/甲书秘密|二幕红信|只写甲书/);h.change('project','a');assert.match(h.root.innerHTML,/一幕蓝信/);assert.doesNotMatch(h.root.innerHTML,/二幕红信/);
 const reload=await boot({store,projects});assert.match(reload.root.innerHTML,/甲书秘密/);assert.match(reload.root.innerHTML,/一幕蓝信/);const other=await boot({store,projects,account:'other'});assert.doesNotMatch(other.root.innerHTML,/甲书秘密|一幕蓝信|新书柜里的一封信/);
 await reload.click('set-mode',{mode:'idea'});assert.match(reload.root.innerHTML,/新书柜里的一封信/);await reload.click('result-tab',{tab:'prompts'});assert.match(reload.root.innerHTML,/新作专用写法/);assert.doesNotMatch(reload.root.innerHTML,/甲书秘密/);
});
test('changing public profile invalidates preview while private-only edits do not change requests; a fresh brief clears old fiction',async()=>{
 const h=await boot({allowLeave:true});h.input('idea','旧题');h.change('writing-style','xuanhuan');await h.click('idea-preview');h.input('scene-reveal','改写伏笔');await h.click('auto-run');assert.equal(h.calls.filter(c=>c.url.endsWith('/auto-run')).length,0);await h.click('idea-preview');h.input('private-holdback','旧稿布局');await h.click('auto-run');assert.equal(h.calls.filter(c=>c.url.endsWith('/auto-run')).length,1);await h.click('new-brief');assert.doesNotMatch(h.root.innerHTML,/旧稿布局|旧题|改写伏笔/);assert.match(h.root.innerHTML,/value="general" selected/);assert.doesNotMatch(h.root.innerHTML,/画布测试正文/);
});

test('book canvas shows the mandatory planning path, two chapters and the full call count even while the plan is running',async()=>{
 let finish;const planPending=new Promise(resolve=>{finish=resolve}),h=await boot({mobile:true,plan:()=>planPending});
 h.change('planning-mode','book');h.input('idea','历经九纪的布局者');await h.click('inspect-stage',{stage:'plan'});
 const check=()=>{assert.match(h.root.innerHTML,/采用大纲章卡后，依次创作 2 章/);assert.match(h.root.innerHTML,/全书规划是第一步/);assert.match(h.root.innerHTML,/首次全书规划 1 次；2 章的正文、事实提取和审阅共 6 次，合计 7 次模型调用。每次修订大纲另计 1 次/);assert.equal(edge(h.root.innerHTML,'prepare-draft'),'');assert.doesNotMatch(edge(h.root.innerHTML,'prepare-plan'),/optional/);assert.doesNotMatch(edge(h.root.innerHTML,'plan-draft'),/optional/);assert.doesNotMatch(h.root.innerHTML,/直接起草|可选步骤|个场景按顺序执行|本次最多 6 次/)};
 check();const running=h.click('start-creation');await pause();check();assert.match(h.root.innerHTML,/正在规划全书/);assert.match(h.root.innerHTML,/正在生成全书大纲/);finish(reply({error:'本次未完成'},503));await running;assert.equal(h.calls.filter(x=>x.url.endsWith('/auto-run')).length,0);
 h.change('planning-mode','scenes');await h.click('graph-view',{view:'blueprint'});assert.match(h.root.innerHTML,/2 个场景按顺序执行/);assert.match(h.root.innerHTML,/本次最多 6 次/);assert.ok(edge(h.root.innerHTML,'prepare-draft'));
});

const chapterOne='### 第一章 冷灰重燃\n拾起半截灰香。',chapterTwo='第二章正文 · 木上还有刻痕。';
const firstInterruption=[['context_ready',{messages:[]}],['stage_start',{stage:'draft',sceneIndex:1,messages:[]}],['draft_ready',{sceneIndex:1,text:chapterOne,model:'first-model'}],['stage_start',{stage:'extract',sceneIndex:1,messages:[]}],['error',{error:'提取响应格式不合约',uncertain:false}]];
const secondOnly=[['context_ready',{model:'next-model',messages:[]}],['stage_start',{stage:'draft',sceneIndex:2,messages:[]}],['draft_ready',{sceneIndex:2,text:chapterTwo,model:'next-model'}],['stage_start',{stage:'extract',sceneIndex:2,messages:[]}],['extract_ready',{sceneIndex:2,candidates:[{statement:'木上有刻痕',evidence:{quote:'木上还有刻痕'}}]}],['stage_start',{stage:'review',sceneIndex:2,messages:[]}],['review_ready',{sceneIndex:2,issues:[]}],['complete',{status:'REVIEW',continuedDraftCount:1,incompleteStages:[]}]];
test('a refresh recovers the exact failed chapter, submits only a bound continuation, and keeps earlier review gaps',async()=>{
 const store=new Map();const first=await boot({store,auto:()=>eventStream(firstInterruption)});first.input('idea','星图中的缺音');first.change('idea-count','2');await first.click('start-creation');assert.match(first.root.innerHTML,/接着写第 2 幕/);
 const second=await boot({store,auto:()=>eventStream(secondOnly)});assert.match(second.root.innerHTML,/接着写第 2 幕/);await second.click('resume-draft');const preview=second.calls.find(c=>c.url.endsWith('/auto-preview')),call=second.calls.find(c=>c.url.endsWith('/auto-run'));assert.equal(call.body.sceneCount,2);assert.equal(call.body.previewHash,'qa-preview-1');assert.deepEqual(preview.body.continuedDrafts,[chapterOne]);assert.deepEqual(call.body.continuedDrafts,[chapterOne]);assert.equal(second.calls.filter(c=>c.url.endsWith('/auto-run')).length,1);assert.match(second.root.innerHTML,/正文已返回 · 检查有缺口/);assert.match(second.root.innerHTML,/已有 2\/2 幕 · 本轮新写 1 幕/);assert.match(second.root.innerHTML,/已返回 1\/2 幕 · 1 失败/);assert.match(second.root.innerHTML,/已返回 1\/2 幕 · 1 未返回/);await second.click('inspect-stage',{stage:'draft'});assert.match(second.root.innerHTML,/第 1 幕 · 保留前稿（本轮未重写）/);assert.match(second.root.innerHTML,/第 2 幕 · 本轮新写/);await second.click('read-results');assert.match(second.root.innerHTML,/<h3 class="prose-title">第一章 冷灰重燃<\/h3>/);assert.match(second.root.innerHTML,/### 第一章 冷灰重燃/);assert.match(second.root.innerHTML,/提取响应格式不合约/);assert.match(second.root.innerHTML,/木上还有刻痕/);await second.click('result-tab',{tab:'facts'});assert.match(second.root.innerHTML,/木上有刻痕/);assert.match(second.root.innerHTML,/提取响应格式不合约/);await second.click('result-tab',{tab:'review'});assert.match(second.root.innerHTML,/第 1 幕：尚未收到此步骤的检查结果/);assert.equal(second.calls.filter(c=>c.url.endsWith('/canon')&&c.body).length,0);
});
test('manual author recovery explicitly keeps original text, refuses competing pasted text and never treats prior review as complete',async()=>{
 const h=await boot({auto:()=>eventStream(secondOnly)});h.input('idea','布局');h.change('idea-count','2');h.input('prefix-paste-0',chapterOne);await h.click('adopt-paste');assert.match(h.root.innerHTML,/作者粘贴恢复 · 未确认/);h.input('prefix-paste-0','完全不同的旧稿');await h.click('adopt-paste');assert.match(h.toasts.at(-1),/已有不同|不一致/);await h.click('start-creation');const calls=h.calls.filter(c=>c.url.endsWith('/auto-run'));assert.equal(calls.length,1);assert.deepEqual(calls[0].body.continuedDrafts,[chapterOne]);await h.click('result-tab',{tab:'review'});assert.match(h.root.innerHTML,/作者带入的正文没有本站检查记录/);
});
test('candidate checkpoints are isolated by account, active book/scene, draft identity, original brief and chapter plan',async()=>{
 const store=new Map(),projects=[profileBook('a'),profileBook('b')];const h=await boot({store,projects,allowLeave:true});h.input('idea','相同题目');h.change('idea-count','2');h.input('idea-plans','第一幕旧章卡\n第二幕旧章卡');h.input('prefix-paste-0',chapterOne);await h.click('adopt-paste');h.input('idea-plans','第一幕改过章卡\n第二幕旧章卡');await h.click('start-creation');assert.equal(h.calls.filter(c=>c.url.endsWith('/auto-run')).length,0);await h.click('set-mode',{mode:'scene'});h.input('instruction','作品续写');h.input('moment','3');h.change('idea-count','2');h.input('prefix-paste-0','只属于甲书的一章');await h.click('adopt-paste');h.change('project','b');assert.doesNotMatch(h.root.innerHTML,/只属于甲书的一章|接着写第 2/);h.change('project','a');assert.match(h.root.innerHTML,/接着写第 2/);h.change('scene','a2');assert.doesNotMatch(h.root.innerHTML,/接着写第 2/);
 const other=await boot({store,projects,account:'other'});other.input('idea','相同题目');other.change('idea-count','2');other.input('idea-plans','第一幕旧章卡\n第二幕旧章卡');await other.click('restore-candidate');assert.doesNotMatch(other.root.innerHTML,/冷灰重燃|只属于甲书的一章/);
 await h.click('set-mode',{mode:'idea'});await h.click('new-brief');h.input('idea','相同题目');h.change('idea-count','2');h.input('idea-plans','第一幕旧章卡\n第二幕旧章卡');await h.click('restore-candidate');assert.doesNotMatch(h.root.innerHTML,/冷灰重燃/);
});
test('partial SSE reports failed check and preserves later successful evidence without starting another model call or claiming a pass',async()=>{
 const r=[...firstInterruption.slice(0,4),['analysis_incomplete',{stage:'extract',sceneIndex:1,error:'证据引文缺失'}],['stage_start',{stage:'review',sceneIndex:1,messages:[]}],['review_ready',{sceneIndex:1,issues:[{description:'缺口待核',evidence:{quote:'灰香'}}]}],...secondOnly.slice(1,-1),['complete',{status:'PARTIAL_REVIEW',incompleteStages:[{stage:'extract',sceneIndex:1,error:'证据引文缺失'}]}]];const h=await boot({auto:()=>eventStream(r)});h.input('idea','两章');h.change('idea-count','2');await h.click('start-creation');assert.match(h.root.innerHTML,/检查有缺口/);assert.match(h.root.innerHTML,/graph-node partial [^"]*" data-act="inspect-stage" data-stage="extract"/);await h.click('result-tab',{tab:'facts'});assert.match(h.root.innerHTML,/证据引文缺失/);assert.match(h.root.innerHTML,/木上还有刻痕/);await h.click('result-tab',{tab:'review'});assert.match(h.root.innerHTML,/缺口待核/);assert.doesNotMatch(h.root.innerHTML,/独立审阅尚有缺口/);assert.equal(h.calls.filter(c=>c.url.endsWith('/auto-run')).length,1);
});

test('aggregate analysis nodes reserve failure for confirmed failures in every requested chapter',async()=>{
 const restored=await boot(),matchState=(html,state,kind)=>assert.match(html,new RegExp('graph-node '+state+' [^"]*" data-act="inspect-stage" data-stage="'+kind+'"'));
 restored.input('idea','恢复旧稿');restored.change('idea-count','2');restored.input('prefix-paste-0',chapterOne);await restored.click('adopt-paste');matchState(restored.root.innerHTML,'missing','extract');assert.doesNotMatch(restored.root.innerHTML,/graph-node failed/);
 const stage=(i,kind,data={})=>[kind,{sceneIndex:i,...data}],fixture=[];for(let i=1;i<=2;i++)fixture.push(stage(i,'stage_start',{stage:'draft'}),stage(i,'draft_ready',{text:'本轮新章'+i}),stage(i,'stage_start',{stage:'extract'}),stage(i,'analysis_incomplete',{stage:'extract',error:'引用未通过校验'}),stage(i,'stage_start',{stage:'review'}),stage(i,'review_ready',{issues:[]}));fixture.push(['complete',{status:'PARTIAL_REVIEW'}]);
 const full=await boot({auto:()=>eventStream(fixture)});full.input('idea','审稿');full.change('idea-count','2');await full.click('start-creation');matchState(full.root.innerHTML,'failed','extract');matchState(full.root.innerHTML,'complete','review');assert.match(full.root.innerHTML,/已返回 0\/2 幕 · 2 失败/);
});
