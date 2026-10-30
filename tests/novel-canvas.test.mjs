import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

async function setup(){
  const code=await readFile(new URL('../public/apps/novel-studio/canvas.js',import.meta.url),'utf8');
  const handlers={},calls=[],store=new Map();let mode='ok';const root={innerHTML:'',addEventListener:(name,fn)=>handlers[name]=fn};
  let state={schema:1,projects:[{id:'p1',name:'作品 <script>x</script>',canonVersion:1,scenes:[{id:'s1',title:'第一幕',draft:'钥匙在手。',revisions:[{id:'r1',title:'第一幕',body:'钥匙在手。'}]}],facts:[]}]},version=2;
  const data=(value,status=200)=>({ok:status<400,status,json:async()=>value});
  const fetch=async(url,options={})=>{calls.push({url,options});if(url==='/api/hub/session')return data({authenticated:true,userId:'owner'});if(url.endsWith('/canon')&&!options.method)return data({state,version});if(url.endsWith('/context'))return data({status:'REVIEW',previewHash:'hash1',stateVersion:version,revisionId:'r1',model:'test',provider:'https://api.example.test/chat/completions',included:[],excluded:[],messages:[{role:'user',content:'实际输入'}],checkMessages:[{role:'user',content:'检查输入'}]});if(url.endsWith('/draft')){if(mode==='network')throw Error('offline');if(mode==='409')return data({error:'预览过期'},409);return data({status:'REVIEW',previewHash:'hash1',stateVersion:version,revisionId:'r1',model:'test',text:'候选正文'})}if(url.endsWith('/review'))return data({status:'REVIEW',previewHash:'hash1',stateVersion:version,revisionId:'r1',model:'test',issues:[{description:'疑似冲突',evidence:{quote:'钥匙',occurrences:1},factIds:[]}]});if(url.endsWith('/canon')){let req=JSON.parse(options.body);assert.equal(req.expectedVersion,version);state=structuredClone(state);state.projects[0].scenes[0].draft=req.command.body;version++;return data({state,version,receipt:{replayed:false}})}throw Error('unexpected '+url)};
  const document={querySelector:s=>s==='#root'?root:null,querySelectorAll:()=>[],createElement:()=>({setAttribute(){},remove(){}}),body:{append(){}}};
  const sandbox={document,window:{addEventListener(){}},fetch,crypto:webcrypto,sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},confirm:()=>true,Date,setTimeout:()=>0,console};runInNewContext(code,sandbox);await new Promise(setImmediate);
  const click=async act=>handlers.click({target:{closest:()=>({dataset:{act}})}});const input=(id,value)=>handlers.input({target:{id,value}});
  return {root,calls,click,input,state:()=>state,setMode:value=>mode=value};
}
test('画布仅在真实响应后显示候选；采用通过版本检查保存草稿',async()=>{let h=await setup();assert.match(h.root.innerHTML,/尚未调用/);assert.doesNotMatch(h.root.innerHTML,/<script>x<\/script>/);h.input('instruction','继续写');h.input('moment','3');await h.click('preview');assert.match(h.root.innerHTML,/实际输入/);await h.click('draft');assert.match(h.root.innerHTML,/候选正文/);assert.match(h.root.innerHTML,/待作者审阅/);await h.click('apply');assert.equal(h.state().projects[0].scenes[0].draft,'钥匙在手。\n\n候选正文');assert.match(h.root.innerHTML,/草稿已保存/)});
test('发起后网络断开标为结果未知，且不自动重试',async()=>{let h=await setup();h.input('instruction','继续写');h.input('moment','3');await h.click('preview');h.setMode('network');await h.click('draft');assert.match(h.root.innerHTML,/结果未知/);assert.match(h.root.innerHTML,/不会自动重试/);assert.equal(h.calls.filter(x=>x.url.endsWith('/draft')).length,1);assert.doesNotMatch(h.root.innerHTML,/已收到候选/)});
test('预览后修改输入不能调用旧预览；生成后 409 标示结果未知',async()=>{let h=await setup();h.input('instruction','继续写');h.input('moment','3');await h.click('preview');h.input('instruction','更改要求');await h.click('draft');assert.equal(h.calls.filter(x=>x.url.endsWith('/draft')).length,0);h.input('instruction','继续写');h.setMode('409');await h.click('draft');assert.match(h.root.innerHTML,/结果未知/);assert.match(h.root.innerHTML,/产生费用无法确认/)});
