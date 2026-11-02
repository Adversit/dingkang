import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {initialState,applyCommand} from '../modules/novel-studio/server/domain.mjs';
import {preparePlanRevision} from '../modules/novel-orchestration/plan-revision.mjs';
const code=await readFile(new URL('../public/apps/novel-studio/canvas.js',import.meta.url),'utf8');
const base={bookOutline:{title:'返回的标题',premise:'作者可见提要',rules:['上层生成下层'],volumes:[{title:'甲卷',turn:'卷一转折',reveal:'幕后甲'},{title:'乙卷',turn:'卷二转折',reveal:'幕后二'}],convergence:'终点',ending:'DO-NOT-SEND-TO-WRITER'},scenes:[{title:'第一章',goal:'FIRST-CARD'},{title:'第二章',goal:'SECOND-CARD'}],source:{role:'book-planner',template:'book-outline-v1',model:'qa-model',round:2,previewHash:'a'.repeat(64)},model:'qa-model'};
const response=(body)=>({ok:true,status:200,json:async()=>body});
function disk(){
 const scopes=new Map();
 return {scopes,open(name){const req={};const isNew=!scopes.has(name);if(isNew)scopes.set(name,new Map());const table=scopes.get(name);
  req.result={createObjectStore(){},close(){},transaction(){const tx={};tx.objectStore=()=>({getAll(){const r={};queueMicrotask(()=>{r.result=[...table.values()].map(x=>structuredClone(x));r.onsuccess?.()});return r},put({k,row}){queueMicrotask(()=>{table.set(k,{k,row:structuredClone(row)});tx.oncomplete?.()})},delete(k){queueMicrotask(()=>{table.delete(k);tx.oncomplete?.()})}});return tx}};
  queueMicrotask(()=>{if(isNew)req.onupgradeneeded?.();req.onsuccess?.()});return req}};
}
async function tab(indexedDB,account='A',opts={}){
 const handlers={},calls=[],toasts=[],state=opts.state||initialState(),store=new Map(Object.entries(opts.session||{}));
 const ss={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const root={innerHTML:'',addEventListener:(k,f)=>handlers[k]=f},document={querySelector:s=>s==='#root'?root:null,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>({setAttribute(){},remove(){}}),body:{append:e=>toasts.push(e.textContent)}},window={indexedDB,addEventListener(){}};
 const fetch=async(url,o={})=>{const body=o.body&&JSON.parse(o.body);calls.push({url,body});if(url.endsWith('/session'))return response({authenticated:true,userId:account});if(url.endsWith('/canon'))return response({version:0,state});if(url.endsWith('/plan-preview'))return response({previewHash:'pp',messages:[]});if(url.endsWith('/plan'))return response(base);if(url.endsWith('/auto-preview'))return response({previewHash:'p',messages:[],analysisTemplates:{}});if(url.endsWith('/auto-run')){const bytes=new TextEncoder().encode('event: complete\ndata: {"status":"REVIEW"}\n\n');let done=false;return {ok:true,body:{getReader:()=>({read:async()=>{if(done)return {done:true};done=true;return {done:false,value:bytes}}})}}}return response({model:'qa',models:[],writingModels:[]})};
 vm.runInNewContext(code,{document,window,fetch,sessionStorage:ss,crypto:webcrypto,confirm:()=>true,Date,console,setTimeout:()=>0,clearTimeout,TextEncoder,TextDecoder});await new Promise(setImmediate);
 return {root,calls,store,toasts,change:(id,value)=>handlers.change({target:{id,value,dataset:{}}}),input:(id,value)=>handlers.input({target:{id,value}}),click:(act)=>handlers.click({target:{closest:()=>({dataset:{act}})}})};
}
test('closing the whole tab drops sessionStorage; fresh tab with same account restores generated round 2, excludes private inputs, other account and project cannot see it, clear lasts',async()=>{
 const idb=disk();let first=await tab(idb);first.change('planning-mode','book');first.input('idea','作者构思');first.input('private-holdback','NOT-IN-PLAN-CACHE');await first.click('start-creation');
 const persisted=[...idb.scopes.get('novel-author-desk:A').values()].filter(x=>x.k.startsWith('portable-plan:'));assert.equal(persisted.length,1);assert.equal(persisted[0].row.plan.source.round,2);assert.doesNotMatch(JSON.stringify(persisted),/NOT-IN-PLAN-CACHE|作者构思|planPreviewInput/);first=null;
 const next=await tab(idb);assert.match(next.root.innerHTML,/返回的标题/);assert.match(next.root.innerHTML,/已恢复/);assert.equal(next.calls.some(c=>c.url.endsWith('/plan')),false);
 await next.click('plan-apply');await next.click('idea-preview');assert.deepEqual(next.calls.find(c=>c.url.endsWith('/auto-preview')).body.scenePlans,['第一章：FIRST-CARD','第二章：SECOND-CARD']);
 const other=await tab(idb,'B');assert.doesNotMatch(other.root.innerHTML,/返回的标题/);
 const p=await tab(idb,'A',{state:{...initialState(),projects:[{id:'p',name:'Other',scenes:[],facts:[]}]},session:{'novel-canvas-form:A':JSON.stringify({form:{runMode:'scene'},projectId:'p'})}});assert.doesNotMatch(p.root.innerHTML,/返回的标题/);
 await next.click('clear-plan');const empty=await tab(idb);assert.doesNotMatch(empty.root.innerHTML,/返回的标题/);
});
test('pasted/imported plans never claim planner identity or start a model call; only chapter notes are passed on adoption, clear and replacement are explicit',async()=>{
 const idb=disk(),h=await tab(idb);h.change('planning-mode','book');await h.click('open-plan-import');
 h.input('book-plan-import',JSON.stringify({...base,holdBack:'PRIVATE-EXTRA'}));await h.click('import-plan');
 assert.equal(h.calls.some(q=>q.url.endsWith('/plan')||q.url.endsWith('/auto-run')),false);assert.match(h.root.innerHTML,/作者导入稿/);assert.doesNotMatch(h.root.innerHTML,/第 2 版/);
 await h.click('export-plan');assert.match(h.root.innerHTML,/导出 JSON/);assert.doesNotMatch(h.root.innerHTML,/PRIVATE-EXTRA|a{64}/);
 await h.click('start-creation');const sent=h.calls.find(q=>q.url.endsWith('/auto-run')).body;assert.deepEqual(sent.scenePlans,['第一章：FIRST-CARD','第二章：SECOND-CARD']);assert.doesNotMatch(JSON.stringify(sent),/DO-NOT-SEND|幕后二|PRIVATE-EXTRA/);
 const copy=await tab(idb);assert.match(copy.root.innerHTML,/作者导入稿/);const stored=idb.scopes.get('novel-author-desk:A').get('portable-plan:new-draft').row.plan;assert.deepEqual(stored.source,{role:'author-import'});assert.equal(stored.model,undefined);
 await copy.click('open-plan-import');copy.input('book-plan-import','{"bookOutline":{}}');await copy.click('import-plan');assert.match(copy.root.innerHTML,/作者导入稿/);assert.match(copy.toasts.at(-1),/大纲 JSON/);
});
test('archive and revision treat import as author material; forged origin, model, preview hash, round and unknown fields are discarded',()=>{
 const src={...base.source,role:'author-import'};const c={type:'create_project_with_scene_drafts',projectId:'p',name:'新稿',scenes:[{sceneId:'s',title:'开篇',body:'候选'}],bookPlan:{bookOutline:base.bookOutline,source:src}};
 const project=applyCommand(initialState(),c).state.projects[0];assert.ok(project.records.every(r=>r.status==='plan'&&r.visibility==='author_only'&&r.source.role==='author-import'&&!r.source.model&&!r.source.previewHash));assert.equal(project.facts.length,0);
 const rev=preparePlanRevision({previousOutline:base.bookOutline,previousChapters:base.scenes,source:src,feedback:'调整收束'});assert.equal(rev.round,1);assert.equal(rev.previousModel,null);assert.match(rev.previousSource,/作者/);assert.doesNotMatch(JSON.stringify(rev),/qa-model|a{64}/);
});
