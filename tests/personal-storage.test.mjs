import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {Script} from 'node:vm';
import ts from 'typescript';
import householdWorker from '../modules/roommate-housekeeper/src/worker.mjs';
const generated=new URL('../.sites-runtime/personal-tests/',import.meta.url);mkdirSync(generated,{recursive:true});
for(const name of ['context','provider','service','module-db']){
 const source=readFileSync(new URL(`../modules/wandeng-evening/lib/${name}.ts`,import.meta.url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/from '\.\/(context|provider)'/g,"from './$1.mjs'");
 writeFileSync(new URL(name+'.mjs',generated),output);
}
const {moduleDb}=await import(new URL('module-db.mjs',generated));
const {handleState,handleAction}=await import(new URL('service.mjs',generated));
function database(sqlFile){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL(sqlFile,import.meta.url),'utf8'));
 class Statement{constructor(query){this.query=query;this.values=[];}bind(...values){this.values=values;return this;}async run(){const r=sqlite.prepare(this.query).run(...this.values);return{success:true,meta:{changes:Number(r.changes)}};}async first(){return sqlite.prepare(this.query).get(...this.values)||null;}async all(){return{success:true,results:sqlite.prepare(this.query).all(...this.values)}};}
 return{sqlite,prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
}
const request=(path,body)=>new Request('https://hub.test'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://hub.test'},body:JSON.stringify(body)});

test('evening migration keeps data owner scoped and uses namespaced physical tables',async()=>{
 const raw=database('../modules/wandeng-evening/migration.sql'),db=moduleDb(raw);
 const payload={action:'page.save',title:'迁移验证',content:'纯测试记录',date:'2026-10-23',sources:[]};
 assert.equal((await handleAction(request('/api/m/wandeng-evening/action',payload),null,db)).status,401);
 const saved=await handleAction(request('/api/m/wandeng-evening/action',payload),'test-alice',db);assert.equal(saved.status,200);
 const alice=await(await handleState(request('/api/m/wandeng-evening/state'),'test-alice',db,{})).json();
 const bob=await(await handleState(request('/api/m/wandeng-evening/state'),'test-bob',db,{})).json();
 assert.equal(alice.pages.length,1);assert.equal(bob.pages.length,0);
 assert.equal(raw.sqlite.prepare('SELECT count(*) AS n FROM wandeng_evening__pages').get().n,1);
 assert.equal(raw.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='pages'").get().n,0);
 const second=await(await handleState(request('/api/m/wandeng-evening/state'),'test-alice',db,{})).json();assert.equal(second.pages[0].content,'纯测试记录');
});

test('roommate storage uses authenticated account rather than a shared or browser cookie record',async()=>{
 const db=database('../modules/roommate-housekeeper/migration.sql');
 assert.equal((await householdWorker.fetch(request('/api/state'),{DB:db})).status,401);
 const a=await(await householdWorker.fetch(request('/api/state'),{DB:db,HUB_USER_ID:'test-alice'})).json();
 const b=await(await householdWorker.fetch(request('/api/state'),{DB:db,HUB_USER_ID:'test-bob'})).json();
 assert.equal(a.version,1);assert.equal(b.version,1);
 const reset=await householdWorker.fetch(request('/api/reset',{version:1,requestId:'reset-fixture'}),{DB:db,HUB_USER_ID:'test-alice'});assert.equal(reset.status,200);
 const a2=await(await householdWorker.fetch(request('/api/state'),{DB:db,HUB_USER_ID:'test-alice'})).json();
 const b2=await(await householdWorker.fetch(request('/api/state'),{DB:db,HUB_USER_ID:'test-bob'})).json();assert.equal(a2.version,2);assert.equal(b2.version,1);
 const conflict=await householdWorker.fetch(request('/api/reset',{version:1,requestId:'stale-fixture'}),{DB:db,HUB_USER_ID:'test-alice'});assert.equal(conflict.status,409);
 assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM roommate_housekeeper__demo_households').get().n,2);
});

test('roommate inline code waits for hydration and remains valid JavaScript',()=>{
 const html=readFileSync(new URL('../public/apps/roommate-housekeeper/index.html',import.meta.url),'utf8');
 assert.match(html,/await window\.HubStorage\.ready/);
 const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(blocks.length,1);new Script(blocks[0][1]);
 assert.match(html,/\/api\/m\/roommate-housekeeper\/state/);
});

test('learning chapter pages and code references stay in the unified module',()=>{
 const root=new URL('../public/apps/agent-architecture-journey/',import.meta.url);
 const html=readFileSync(new URL('index.html',root),'utf8');assert.match(html,/\/hub-storage\.js/);assert.match(html,/\/apps\/agent-architecture-journey\/stage\/01\//);
 const js=readFileSync(new URL('assets/notes.js',root),'utf8');new Script(js);assert.match(js,/await window\.HubStorage\.ready/);assert.match(js,/agent-reading-position/);assert.doesNotMatch(js,/fetch\('\/assets\//);
 const items=JSON.parse(readFileSync(new URL('assets/code-index.json',root),'utf8'));
 assert.ok(items.length>0);assert.ok(items.every(item=>item.route.startsWith('/apps/agent-architecture-journey/')));
});
