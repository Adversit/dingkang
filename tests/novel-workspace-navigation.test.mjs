import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const response=(value,status=200)=>({ok:status>=200&&status<300,status,json:async()=>value});
const views=['overview','manage','write','records','facts','temporal','check','drafting','history','dependencies','retcon','guardchanges'];
const tick=()=>new Promise(setImmediate);

// Execute the actual view controller, with a minimal shell so navigation labels
// cannot make an otherwise identical initialization body appear unique.
async function boot({view='overview',authenticated=true,archiveStatus=200,projects=[],session=new Map(),userId='owner',confirmLeave=true,modelResponse}={}){
  const script=await readFile(new URL('../public/apps/novel-studio/consistency.js',import.meta.url),'utf8');
  let url=new URL(`https://writer.test/apps/novel-studio/consistency.html?view=${view}`);
  const calls=[],shells=[],events={},windowEvents={},documentEvents={},store=session,fields=new Map();
  const location={get href(){return url.href},get pathname(){return url.pathname},get search(){return url.search},get hash(){return url.hash},get origin(){return url.origin}};
  const history={state:null,pushState(state,_title,value){this.state=state;url=new URL(value,url)},replaceState(state,_title,value){this.state=state;url=new URL(value,url)}};
  const root={innerHTML:'',addEventListener(type,listener){events[type]=listener},querySelector(){return null},querySelectorAll(){return []}};
  const document={
    visibilityState:'visible',activeElement:null,
    querySelector(selector){return selector==='#root'?root:selector.startsWith('#')?fields.get(selector.slice(1))||null:null},
    querySelectorAll(){return []},getElementById(id){return fields.get(id)||null},
    addEventListener(type,listener){documentEvents[type]=listener},
    createElement(){return {setAttribute(){},remove(){},focus(){},click(){},textContent:'',classList:{add(){},remove(){}}}},
    body:{append(){}},
  };
  const window={location,history,addEventListener(type,listener){windowEvents[type]=listener},scrollTo(){},HubStorage:{ready:Promise.resolve()},NovelStudio:{shell(config){shells.push(config);return `<main data-area="${config.active}">${config.content}</main>`}}};
  const fetch=async(path,options={})=>{
    calls.push({path,options});
    if(path==='/api/hub/session')return response({authenticated,...(authenticated?{userId}:{})});
    if(path.endsWith('/canon'))return response(archiveStatus===200?{state:{schema:1,projects},version:0}:{error:'暂时无法读取作品，请重试。'},archiveStatus);
    if(path.endsWith('/model-status'))return response({model:'writer',keyConfigured:true});
    if(path.endsWith('/model-preference'))return response({model:'writer',revision:1,sourceRevision:1});
    if(path.endsWith('/models'))return response({models:[{id:'writer'}],writingModels:[{id:'writer'}],sourceRevision:1});
    if(path.endsWith('/context')&&modelResponse)return modelResponse();
    throw Error(`Unexpected request: ${path}`);
  };
  const sessionStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
  vm.runInNewContext(script,{window,document,location,history,fetch,sessionStorage,crypto:webcrypto,confirm:()=>confirmLeave,URL,URLSearchParams,Blob,TextEncoder,Date,console,setTimeout:()=>0,clearTimeout,requestAnimationFrame:fn=>fn()});
  await tick();await tick();
  return {root,calls,shells,events,windowEvents,fields,location,store,window,get last(){return shells.at(-1)},
    async navigate(view){await events.click({target:{closest:()=>({dataset:{action:'nav',page:view}})},preventDefault(){}});await tick()},
    async pop(view){url=new URL(`?view=${view}`,url);await windowEvents.popstate?.({state:{view}});await tick()},
  };
}

test('each empty workspace route renders its own task instead of the overview initializer',async()=>{
  const content=[];
  for(const view of views){
    const app=await boot({view});
    assert(app.last,`${view} retains the product shell`);
    assert(app.last.content,`${view} has a page body`);
    content.push(app.last.content.replace(/\s+/g,' ').trim());
    assert.equal(app.calls.filter(call=>call.options.method==='POST').length,0,`${view} does not create work during navigation`);
  }
  assert.equal(new Set(content).size,views.length,'all 12 route bodies differ even after the shared sidebar is removed');
});

test('empty-state tab navigation updates the route and back navigation restores the requested task',async()=>{
  const app=await boot({view:'records'});
  const records=app.last.content;
  await app.navigate('temporal');
  assert.equal(new URLSearchParams(app.location.search).get('view'),'temporal');
  assert.notEqual(app.last.content,records);
  await app.navigate('facts');
  assert.equal(new URLSearchParams(app.location.search).get('view'),'facts');
  await app.pop('records');
  assert.equal(app.last.content,records);
  assert.equal(app.calls.filter(call=>call.options.method==='POST').length,0);
});

test('invalid view safely opens the work library without running a write',async()=>{
  const invalid=await boot({view:'not-a-view'}),normal=await boot();
  assert.equal(invalid.last?.content,normal.last?.content);
  assert.equal(invalid.calls.filter(call=>call.options.method==='POST').length,0);
});

test('signed-out visitors retain the requested workspace shell and a sign-in action',async()=>{
  const app=await boot({view:'write',authenticated:false});
  assert(app.last,'the workspace shell remains available');
  assert.equal(app.last.active,'write');
  assert.match(app.last.content,/登录/);
  assert.match(app.last.content,/signin-with-chatgpt/);
  assert.equal(app.calls.some(call=>call.path.endsWith('/canon')),false,'private content is not fetched while signed out');
});

test('archive errors retain navigation and a retry action rather than switching to an obsolete app',async()=>{
  const app=await boot({view:'check',archiveStatus:503});
  assert(app.last);
  assert.equal(app.last.active,'review');
  assert.match(app.last.content,/data-action="reload"/);
  assert.doesNotMatch(app.last.content,/href="index\.html"/);
});

const work=(id,name,sceneNames)=>({id,name,description:'',facts:[],proposals:[],records:[],scenes:sceneNames.map((title,index)=>({id:`${id}s${index}`,title,draft:title+'正文',revisions:[]}))});

test('switching to another page preserves the selected book and scene across page reloads',async()=>{
  const projects=[work('p1','第一部',['甲幕']),work('p2','第二部',['乙幕','丙幕'])];
  const app=await boot({view:'write',projects});
  app.events.change({target:{id:'projects',value:'p2',dataset:{}}});
  await app.events.click({target:{closest:()=>({dataset:{action:'select-scene',id:'p2s1'}})}});
  const reopened=await boot({view:'write',projects,session:app.store});
  assert.match(reopened.last.content,/id="draft-title"[^>]*value="丙幕"/);
  assert.match(reopened.last.content,/丙幕正文/);
  assert.equal(reopened.calls.filter(call=>call.options.method==='POST').length,0);
});

test('remembered active work is account-specific and deleted work safely falls back',async()=>{
  const projects=[work('p1','第一部',['甲幕']),work('p2','第二部',['乙幕'])];
  const app=await boot({view:'write',projects});
  app.events.change({target:{id:'projects',value:'p2',dataset:{}}});
  const another=await boot({view:'write',projects,session:app.store,userId:'another-owner'});
  assert.match(another.last.content,/id="draft-title"[^>]*value="甲幕"/);
  const removed=await boot({view:'write',projects:[projects[0]],session:app.store});
  assert.match(removed.last.content,/id="draft-title"[^>]*value="甲幕"/);
});

test('cancelled navigation keeps unsaved manuscript and restores its route on browser back',async()=>{
  const projects=[work('p1','第一部',['甲幕'])];
  const app=await boot({view:'write',projects,confirmLeave:false});
  app.events.input({target:{id:'draft-body',value:'尚未保存的正文',dataset:{}}});
  const before=app.last.content;
  await app.navigate('records');
  assert.equal(app.last.content,before);
  assert.equal(new URLSearchParams(app.location.search).get('view'),'write');
  await app.pop('records');
  assert.equal(app.last.content,before);
  assert.equal(new URLSearchParams(app.location.search).get('view'),'write');
  assert.equal(app.calls.filter(call=>call.options.method==='POST').length,0);
});

test('custom guidance survives leaving and reopening its page without being submitted',async()=>{
  const projects=[work('p1','第一部',['甲幕'])];
  const app=await boot({view:'drafting',projects});
  app.events.input({target:{id:'draft-instruction',value:'请保留人物的犹豫和沉默。',dataset:{}}});
  await app.navigate('records');
  const reopened=await boot({view:'drafting',projects,session:app.store});
  assert.match(reopened.last.content,/请保留人物的犹豫和沉默。/);
  assert.equal(reopened.calls.filter(call=>call.options.method==='POST').length,0);
});

test('a pending model request holds the current work and unlocks navigation after an error',async()=>{
  const projects=[work('p1','第一部',['甲幕']),work('p2','第二部',['乙幕'])];
  projects[0].scenes[0].revisions=[{id:'r1',title:'甲幕',body:'甲幕正文'}];
  let release;const pending=new Promise(resolve=>{release=resolve});
  const app=await boot({view:'drafting',projects,modelResponse:()=>pending});
  for(const [id,value] of Object.entries({'draft-instruction':'继续写','draft-moment':'2','draft-perspective':'omniscient'}))app.fields.set(id,{value});
  const request=app.events.click({target:{closest:()=>({dataset:{action:'preview-context'}})}});
  await app.navigate('records');
  assert.equal(new URLSearchParams(app.location.search).get('view'),'drafting');
  const selector={id:'projects',value:'p2',dataset:{}};app.events.change({target:selector});
  assert.equal(selector.value,'p1');
  assert.equal(await app.window.HubBeforeLeave(),false);
  release(response({error:'预览暂时不可用'},503));await request;
  await app.navigate('records');
  assert.equal(new URLSearchParams(app.location.search).get('view'),'records');
  assert.equal(await app.window.HubBeforeLeave(),true);
});
