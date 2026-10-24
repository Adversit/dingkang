import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {api,createWorker} from '../server/worker.mjs';
function setup(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0000_married_pride.sql',import.meta.url),'utf8'));return {DB:{prepare:sql=>({bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)||null})})}};}
const state={schema:3,projects:[{id:'p',nodes:[{id:'n',x:0,y:0}],edges:[]}]};
const req=(user,method='GET',body,path='/api/workspace',origin='https://test.site')=>new Request('https://test.site'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test'}:{}),'Origin':origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('anonymous requests cannot read or write project data',async()=>{const env=setup();assert.equal((await api(req(null),env)).status,401);assert.equal((await api(req(null,'PUT',{data:state,revision:0}),env)).status,401);});
test('separate accounts cannot read or overwrite one another; persistence roundtrip',async()=>{const env=setup();assert.equal((await api(req('A','PUT',{data:state,revision:0}),env)).status,200);assert.deepEqual((await (await api(req('A'),env)).json()).data,state);assert.equal((await (await api(req('B'),env)).json()).data,null);await api(req('B','PUT',{data:{schema:3,projects:[]},revision:0}),env);assert.deepEqual((await (await api(req('A'),env)).json()).data,state);});
test('stale revisions and cross-origin writes are rejected',async()=>{const env=setup();await api(req('A','PUT',{data:state,revision:0}),env);assert.equal((await api(req('A','PUT',{data:state,revision:0}),env)).status,409);assert.equal((await api(req('A','PUT',{data:state,revision:1}),env)).status,200);assert.equal((await api(req('A','PUT',{data:state,revision:1}),env)).status,409);assert.equal((await api(req('A','PUT',{data:state,revision:2},'/api/workspace','https://other.site'),env)).status,403);});
test('invalid schemas and broken graph references cannot be saved',async()=>{const env=setup();for(const data of [{schema:99,projects:[]},{schema:3,projects:[{id:'p',nodes:[],edges:[{from:'a',to:'b'}]}]}])assert.equal((await api(req('A','PUT',{data,revision:0}),env)).status,400);});
test('workspace API rejects attribute injection in imported project data',async()=>{
  const env=setup();
  for(const data of [
    {...state,projects:[{...state.projects[0],id:'p" onmouseover="alert(1)'}]},
    {...state,projects:[{...state.projects[0],nodes:[{...state.projects[0].nodes[0],status:'draft" onmouseover="alert(1)'}]}]},
    {...state,projects:[{...state.projects[0],nodes:[{...state.projects[0].nodes[0],acceptance:[{id:'a" onclick="alert(1)',status:'passed'}]}]}]},
    {...state,projects:[{...state.projects[0],nodes:[{...state.projects[0].nodes[0],acceptance:[{id:'a',kind:'<img src=x onerror=alert(1)>'}]}]}]}
  ])assert.equal((await api(req('A','PUT',{data,revision:0}),env)).status,400);
});
test('page authentication gate and safe account bootstrap',async()=>{const env=setup(),worker=createWorker({'/index.html':{body:'<script src="core.js"></script>',type:'text/html'}});const anon=await worker.fetch(req(null,'GET',null,'/'),env);assert.match(await anon.text(),/signin-with-chatgpt/);await api(req('A','PUT',{revision:0,data:{...state,note:'</script><script>bad</script>'}}),env);const page=await worker.fetch(req('A','GET',null,'/'),env);assert.equal(page.headers.get('cache-control'),'no-store');const html=await page.text();assert.match(html,/ACCOUNT_BOOTSTRAP/);assert.ok(!html.includes('</script><script>bad'));assert.equal((await worker.fetch(req('A','GET',null,'/api/admin'),env)).status,404);});
