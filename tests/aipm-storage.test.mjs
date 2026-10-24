import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {STAGES,METHOD_CARDS,createProject,createDemoProject} from '../public/apps/aipm-studio-dk/content.js';
import {validFlow,toMarkdown} from '../public/apps/aipm-studio-dk/validation-model.js';

const source=readFileSync(new URL('../public/apps/aipm-studio-dk/app.js',import.meta.url),'utf8').replace(/^import .+;\n/gm,'');
function harness(){
  let resolveReady,reads=0,loaded=false;
  const restored=createProject('已恢复的项目','从统一存档读取');
  const values={'aipm-studio.v1':JSON.stringify({version:1,projects:[restored],activeId:restored.id})};
  const labels=[{textContent:''},{textContent:''}],app={innerHTML:''},listeners=new Map();
  const bridge={status:{state:'loading'},ready:new Promise(resolve=>{resolveReady=resolve;})};
  const emit=state=>{bridge.status={state};for(const fn of listeners.get('hub-storage-status')||[])fn({detail:{moduleId:'aipm-studio-dk',state}});};
  const localStorage={getItem:key=>{reads++;assert.ok(loaded,'application read before bridge hydration');return values[key]||null;},setItem:(key,value)=>{values[key]=value;emit('pending');}};
  const document={querySelector:selector=>selector==='#app'?app:null,querySelectorAll:selector=>selector==='[data-storage-status]'?labels:[],addEventListener(){},title:''};
  const window={HubStorage:bridge,addEventListener:(type,fn)=>listeners.set(type,[...(listeners.get(type)||[]),fn])};
  const done=vm.runInNewContext(`(async()=>{${source}\nreturn {save,storageLabel,readState:()=>state};})()`,{
    STAGES,METHOD_CARDS,createProject,createDemoProject,validFlow,toMarkdown,
    validationHref:()=> '#/validation',validationView:()=>'',bindValidationUI(){},
    window,document,localStorage,location:{hash:'#/home'},scrollTo(){},setTimeout,clearTimeout,URL,
  });
  return {done,labels,app,emit,reads:()=>reads,restore:()=>{loaded=true;bridge.status={state:'saved'};resolveReady();}};
}

test('AI PM Studio waits for restored account state before its first retained-key read',async()=>{
  const app=harness();
  assert.equal(app.reads(),0);
  app.restore();const api=await app.done;
  assert.equal(app.reads(),1);
  assert.equal(api.readState().projects[0].title,'已恢复的项目');
  assert.match(app.app.innerHTML,/已同步到私人空间/);
});

test('AI PM Studio labels follow confirmed bridge states and never confirm a queued write',async()=>{
  const app=harness();app.restore();const api=await app.done;
  assert.equal(api.save(),true);
  assert.equal(api.storageLabel(),'正在保存到私人空间');
  for(const [state,label] of [['offline','离线，等待同步'],['conflict','存档冲突，待处理'],['error','保存不可用，请重新加载'],['saved','已同步到私人空间']]){
    app.emit(state);
    assert.equal(api.storageLabel(),label);
    assert.ok(app.labels.every(item=>item.textContent===label));
  }
});
