import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('public/apps/novel-studio/app.js', 'utf8').replace('persist();render();\n})();', 'window.__test={validProject,importBackup,encodeState,splitText,beginTextImport,commitTextImport,getState:()=>db,navigateProjects:()=>{page="projects";render()}};persist();render();\n})();');
async function runtime(seed) {
  const values = new Map(seed ? [['story-archive-v1',JSON.stringify(seed)]] : []);
  let writesUntilFailure=null;
  const storage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(writesUntilFailure!==null&&--writesUntilFailure===0){writesUntilFailure=null;throw Error('模拟存储失败')}values.set(k,String(v))},removeItem:k=>values.delete(k)};
  const handlers={};const app={innerHTML:'',addEventListener:(name,handler)=>{handlers[name]=handler}};
  const document={getElementById:id=>id==='app'?app:null,querySelector:()=>null,createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}};
  const window={addEventListener(){},location:{href:'initial'}};
  const context={window,document,localStorage:storage,TextEncoder,TextDecoder,Date,Math,JSON,Set,Array,Object,Number,String,Error,Promise,Blob,URL,console,setTimeout:()=>1,clearTimeout(){},confirm:()=>false};
  vm.runInNewContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {api:window.__test,app,values,window,handlers,failAfter:n=>{writesUntilFailure=n}};
}
const sample=()=>({id:'p1',name:'作品',description:'',scenes:[{id:'s1',title:'场景',body:'原文',revisions:[{id:'r1',title:'场景',body:'原文',created:'2026-10-30T00:00:00.000Z'}]}],facts:[{id:'f1',sceneId:'s1',revisionId:'r1',kind:'人物',statement:'事实',evidence:'原文',status:'accepted'}],log:[]});
const file=projects=>({size:100,text:()=>Promise.resolve(JSON.stringify({schema:1,projects}))});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('backup accepts actual records and rejects injected IDs and invalid evidence references',async()=>{
 const {api}=await runtime();
 assert.equal(api.validProject(sample()),true);
 const injected=sample();injected.scenes[0].id='s1" onmouseover="alert(1)';assert.equal(api.validProject(injected),false);
 const missing=sample();missing.facts[0].revisionId='missing';assert.equal(api.validProject(missing),false);
 const forged=sample();forged.facts[0].evidence='未出现';assert.equal(api.validProject(forged),false);
 const duplicate=sample();duplicate.scenes.push({...duplicate.scenes[0]});assert.equal(api.validProject(duplicate),false);
});

test('previously stored untrusted IDs are escaped when rendering attributes',async()=>{
 const p=sample();p.id='p1" onmouseover="alert(1)';
 const {api,app}=await runtime({schema:1,current:p.id,projects:[p]});api.navigateProjects();
 assert.ok(app.innerHTML.includes('p1&amp;quot;')===false);
 assert.ok(app.innerHTML.includes('p1&quot; onmouseover=&quot;alert(1)'));
 assert.ok(!app.innerHTML.includes('data-id="p1" onmouseover='));
});

test('over-capacity backup is rejected before modifying the current state',async()=>{
 const {api}=await runtime();const before=JSON.stringify(api.getState());const p=sample();p.scenes[0].body='大'.repeat(700000);
 api.importBackup(file([p]));await tick();assert.equal(JSON.stringify(api.getState()),before);
});

test('valid import adds a distinct project; duplicate IDs leave state untouched',async()=>{
 const {api}=await runtime();api.importBackup(file([sample()]));await tick();assert.ok(api.getState().projects.some(p=>p.id==='p1'));
 const before=JSON.stringify(api.getState());api.importBackup(file([sample(),sample()]));await tick();assert.equal(JSON.stringify(api.getState()),before);
});


test('partial storage failure restores the prior saved values and does not add a project',async()=>{
 const {api,values,failAfter}=await runtime();const beforeState=JSON.stringify(api.getState()),beforeValues=JSON.stringify([...values].sort());
 const p=sample();p.scenes[0].body='x'.repeat(120000);failAfter(2);api.importBackup(file([p]));await tick();
 assert.equal(JSON.stringify(api.getState()),beforeState);assert.equal(JSON.stringify([...values].sort()),beforeValues);
});


test('heading split preserves all original text including CRLF and shows single-scene option',async()=>{
 const {api}=await runtime();const original='引子\r\n第一章 雨夜\r\n正文一。\r\n第二章 晨光\r\n正文二。';
 const scenes=api.splitText(original,'小说','headings');assert.equal(scenes.length,3);assert.equal(scenes.map(x=>x.body).join(''),original);
 assert.equal(api.splitText(original,'小说','single').length,1);
});

test('UTF-8 import previews without writing, and confirmation preserves original and adds split scenes',async()=>{
 const {api,app}=await runtime();const before=JSON.stringify(api.getState());const original='第一章 夜\r\n内容 A\r\n第二章 昼\r\n内容 B';const bytes=new TextEncoder().encode(original);
 await api.beginTextImport({name:'作品.md',size:bytes.length,arrayBuffer:async()=>bytes});
 assert.equal(JSON.stringify(api.getState()),before);assert.ok(app.innerHTML.includes('确认导入 2 个场景'));
 api.commitTextImport();const current=api.getState().projects.find(p=>p.id===api.getState().current);assert.equal(current.imports.at(-1).body,original);assert.equal(current.scenes.slice(-2).map(s=>s.body).join(''),original);for(const scene of current.scenes.slice(-2)){assert.equal(scene.source.importId,current.imports.at(-1).id);assert.equal(original.slice(scene.source.start,scene.source.end),scene.body)}
});

test('invalid UTF-8 rejects import without showing a confirmation or changing state',async()=>{
 const {api,app}=await runtime();const before=JSON.stringify(api.getState());await api.beginTextImport({name:'bad.txt',size:2,arrayBuffer:async()=>new Uint8Array([0xc3,0x28])});
 assert.equal(JSON.stringify(api.getState()),before);assert.ok(!app.innerHTML.includes('确认导入'));
});


test('opening the new workspace waits for storage flush and stops on sync failure',async()=>{
 const {handlers,window}=await runtime();let calls=0;window.HubStorage={flush:async()=>{calls++;throw Error('offline')},status:{state:'offline'}};const event={target:{closest:()=>({dataset:{action:'open-consistency'}})}};
 await handlers.click(event);assert.equal(calls,1);assert.equal(window.location.href,'initial');
 window.HubStorage.flush=async()=>{calls++};await handlers.click(event);assert.equal(calls,2);assert.equal(window.location.href,'/apps/novel-studio/consistency.html');
});
