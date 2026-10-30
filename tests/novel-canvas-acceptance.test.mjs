import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
async function boot(overrides={}){
 const code=await readFile(new URL('../public/apps/novel-studio/canvas.js',import.meta.url),'utf8');
 const handlers={},calls=[],root={innerHTML:'',addEventListener:(type,fn)=>{handlers[type]=fn}};
 const state={schema:1,projects:[{id:'p',name:'书',facts:[],scenes:[{id:'s',title:'第一幕',draft:'这是一段正文。',revisions:[{id:'r',title:'第一幕',body:'这是一段正文。'}]},{id:'s2',title:'第二幕',draft:'另一段正文。',revisions:[{id:'r2',title:'第二幕',body:'另一段正文。'}]}]}]};
 const preview={status:'REVIEW',previewHash:'hash123',stateVersion:1,revisionId:'r',included:[],excluded:[],messages:[],checkMessages:[],model:'model',provider:'https://api.openai.com/v1/chat/completions'};
 const fakeFetch=async(url,opts={})=>{calls.push({url,body:opts.body&&JSON.parse(opts.body)});if(url==='/api/hub/session')return response({authenticated:true,userId:'u'});if(url.endsWith('/canon')&&!opts.method)return response({version:1,state});if(url.endsWith('/canon')&&opts.method)return overrides.canonPost?overrides.canonPost():response({error:'版本冲突'},409);if(url.endsWith('/context'))return overrides.context?overrides.context():response(preview);if(url.endsWith('/draft'))return overrides.draft?overrides.draft():response({status:'ERROR',error:'尚未配置模型'},503);if(url.endsWith('/review'))return response({status:'ERROR',error:'尚未配置模型'},503);throw Error(`unexpected ${url}`)};
 const document={querySelector:s=>s==='#root'?root:null,querySelectorAll:()=>[],createElement:()=>({setAttribute(){},remove(){},textContent:''}),body:{append(){}}};
 const store=new Map(),sessionStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const window={addEventListener(){}};
 vm.runInNewContext(code,{document,window,fetch:fakeFetch,sessionStorage,crypto:webcrypto,confirm:()=>true,Date,console,setTimeout:()=>0,clearTimeout});
 await new Promise(setImmediate);
 const input=(id,value)=>handlers.input({target:{id,value}});
 const change=(id,value)=>handlers.change({target:{id,value,dataset:{}}});
 const click=async action=>handlers.click({target:{closest:()=>({dataset:{act:action}})}});
 return {root,calls,input,change,click,store};
}
const prepare=async h=>{h.input('instruction','继续写');h.input('moment','2');await h.click('preview')};

test('unconfigured model reports a real failure without displaying a candidate',async()=>{
 const h=await boot();await prepare(h);await h.click('draft');
 assert.ok(h.calls.some(c=>c.url.endsWith('/draft')));
 assert.match(h.root.innerHTML,/候选生成失败/);assert.match(h.root.innerHTML,/HTTP 503/);
 assert.match(h.root.innerHTML,/尚无候选正文/);assert.doesNotMatch(h.root.innerHTML,/已收到候选，等待作者审阅/);
});

test('changing the instruction after preview prevents a model request',async()=>{
 const h=await boot();await prepare(h);h.input('instruction','改写成另一段');await h.click('draft');
 assert.equal(h.calls.filter(c=>c.url.endsWith('/draft')).length,0);
});

test('a network disconnect while generating is an unknown result, not a confirmed failure',async()=>{
 const h=await boot({draft:async()=>{throw Error('connection dropped')}});await prepare(h);await h.click('draft');
 assert.match(h.root.innerHTML,/结果未知/);assert.doesNotMatch(h.root.innerHTML,/已收到候选，等待作者审阅/);
});

test('an in-flight preview is not applied to a newly selected scene',async()=>{
 let resolve;const pending=new Promise(r=>{resolve=r});const h=await boot({context:()=>pending});
 h.input('instruction','继续写');h.input('moment','2');const run=h.click('preview');
 h.change('scene','s2');resolve(response({status:'REVIEW',previewHash:'old',stateVersion:1,revisionId:'r',included:[],excluded:[],messages:[]}));await run;
 assert.doesNotMatch(h.root.innerHTML,/预览指纹 old/);
});

test('a concurrent server-side edit rejects candidate application without claiming a save',async()=>{
 const h=await boot({draft:async()=>response({status:'REVIEW',previewHash:'hash123',stateVersion:1,revisionId:'r',model:'model',text:'候选段落'})});
 await prepare(h);await h.click('draft');assert.match(h.root.innerHTML,/待作者审阅/);await h.click('apply');
 assert.ok(h.calls.some(c=>c.url.endsWith('/canon')&&c.body));
 assert.match(h.root.innerHTML,/版本冲突/);assert.doesNotMatch(h.root.innerHTML,/草稿已由服务端确认保存/);
});

test('session expiry after submitting the draft retains the same recovery command',async()=>{
 const h=await boot({draft:async()=>response({status:'REVIEW',previewHash:'hash123',stateVersion:1,revisionId:'r',model:'model',text:'候选段落'}),canonPost:async()=>response({error:'请先登录'},401)});
 await prepare(h);await h.click('draft');await h.click('apply');
 assert.match(h.root.innerHTML,/结果尚未确认/);assert.equal(h.store.size,1);
 const first=h.calls.filter(c=>c.url.endsWith('/canon')&&c.body)[0].body;await h.click('retry');
 const second=h.calls.filter(c=>c.url.endsWith('/canon')&&c.body)[1].body;assert.deepEqual(second,first);
});

test('model timeout is reported as unknown rather than a completed result',async()=>{
 const h=await boot({draft:async()=>response({error:'模型请求超时'},504)});await prepare(h);await h.click('draft');
 assert.match(h.root.innerHTML,/结果未知/);assert.doesNotMatch(h.root.innerHTML,/已收到候选，等待作者审阅/);
});
