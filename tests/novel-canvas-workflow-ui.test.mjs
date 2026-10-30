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
async function boot({store=new Map(),mobile=false,auto=()=>eventStream(complete),allowLeave=false,projects=[]}={}){
 const calls=[],handlers={},windowHandlers={},toasts=[],focused=[],root={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn},viewport={clientWidth:mobile?340:800,scrollLeft:0,scrollTop:0};
 const document={querySelector:s=>s==='#root'?root:s==='.graph-viewport'?viewport:null,querySelectorAll:()=>[],getElementById:id=>['idea','instruction'].includes(id)?{focus:()=>focused.push(id)}:null,createElement:()=>({setAttribute(){},remove(){}}),body:{append(n){toasts.push(n.textContent)}}};
 const window={addEventListener:(type,fn)=>windowHandlers[type]=fn};
 const fetch=async(url,options={})=>{const body=options.body?JSON.parse(options.body):null;calls.push({url,body});if(url==='/api/hub/session')return reply({authenticated:true,userId:'qa'});if(url.endsWith('/canon'))return reply({version:0,state:{schema:1,projects}});if(url.endsWith('/model-status'))return reply({model:'qa-model'});if(url.endsWith('/model-preference'))return reply({model:'qa-model'});if(url.endsWith('/models'))return reply({models:[{id:'qa-model'}],writingModels:[{id:'qa-model'}],sourceRevision:0});if(url.endsWith('/auto-preview'))return reply({previewHash:'qa-preview',model:'qa-model',messages:[{role:'user',content:body.idea}],analysisTemplates:{}});if(url.endsWith('/plan-preview'))return reply({previewHash:'qa-plan',model:'qa-model',messages:[{role:'user',content:body.idea}]});if(url.endsWith('/plan'))return reply({model:'qa-model',scenes:[{title:'来信',goal:'拆开信封'}]});if(url.endsWith('/auto-run'))return auto();throw Error('unexpected route')};
 const sessionStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 vm.runInNewContext(code,{window,document,fetch,sessionStorage,crypto:webcrypto,Date,TextEncoder,TextDecoder,setTimeout:()=>0,console,confirm:()=>allowLeave,matchMedia:()=>({matches:mobile})});await pause();await pause();
 return {root,store,calls,viewport,window,windowHandlers,toasts,focused,input:(id,value)=>handlers.input({target:{id,value}}),click:async(act,data={})=>handlers.click({target:{closest:()=>({dataset:{act,...data}})}})};
}
test('primary start prepares and runs once; graph shows real stages and optional planner stays skipped',async()=>{const h=await boot();h.input('idea','一封信');assert.match(h.root.innerHTML,/graph-connectors/);assert.match(h.root.innerHTML,/marker-end="url\(#arrow-idle\)"/);assert.match(h.root.innerHTML,/graph-node skipped [^"]*" data-act="inspect-stage" data-stage="plan"/);await h.click('start-creation');assert.equal(h.calls.filter(x=>x.url.endsWith('/auto-preview')).length,1);assert.equal(h.calls.filter(x=>x.url.endsWith('/auto-run')).length,1);for(const stage of ['draft','extract','review'])assert.match(h.root.innerHTML,new RegExp('graph-node complete [^"]*" data-act="inspect-stage" data-stage="'+stage+'"'));assert.match(h.root.innerHTML,/画布测试正文/);assert.match(h.root.innerHTML,/graph-node ready [^"]*" data-act="inspect-stage" data-stage="save"/);assert.equal(h.calls.filter(x=>x.url.endsWith('/canon')&&x.body).length,0)});
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
 const h=await boot();h.input('idea','构思');await h.click('idea-preview');
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
