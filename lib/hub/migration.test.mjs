import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const toUrl=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const manifestUrl=toUrl(fs.readFileSync(path.join(root,'lib/hub/migration-manifest.ts'),'utf8'));
const {MIGRATION_TABLES}=await import(manifestUrl);
const migrationUrl=toUrl(fs.readFileSync(path.join(root,'lib/hub/migration.ts'),'utf8').replace("'./migration-manifest'",JSON.stringify(manifestUrl)));
const {handleMigrationRequest,importTokenMatches,MAX_MIGRATION_BYTES}=await import(migrationUrl);
const sourceSql=[];
for(const name of fs.readdirSync(path.join(root,'modules'))){const mod=path.join(root,'modules',name);if(!fs.existsSync(path.join(mod,'db/schema.ts')))continue;const dir=path.join(mod,'migrations');if(fs.existsSync(dir))for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')).sort())sourceSql.push(fs.readFileSync(path.join(dir,file),'utf8'));else sourceSql.push(fs.readFileSync(path.join(mod,'migration.sql'),'utf8'));}
function setup(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const sql of sourceSql)sqlite.exec(sql);
 let statements=0,batches=0;
 function statement(sql,args=[]){return {sql,args,bind(...values){return statement(sql,values);},async all(){statements++;return {success:true,results:sqlite.prepare(sql).all(...args),meta:{changes:0}};},async first(){statements++;return sqlite.prepare(sql).get(...args)||null;},async run(){if(/^SELECT/i.test(sql))return this.all();statements++;const out=sqlite.prepare(sql).run(...args);return {success:true,results:[],meta:{changes:Number(out.changes)}};}};}
 const db={prepare:statement,async batch(items){batches++;sqlite.exec('BEGIN');try{const out=[];for(const item of items)out.push(await item.run());sqlite.exec('COMMIT');return out;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 return {sqlite,get statements(){return statements;},get batches(){return batches;},env:{DB:db,HUB_MIGRATION_IMPORT_TOKEN:crypto.randomUUID()+crypto.randomUUID()}};
}
const table='evopm_workbench__workspaces';
const row=(owner='owner',state='private-state',revision=1)=>({owner_id:owner,state_json:state,revision,updated_at:'2026-10-23'});
const payload=(rows,target=table)=>({sourceProjectId:MIGRATION_TABLES[target].sourceProjectId,table:target,rows});
const req=(s,body,options={})=>new Request('https://hub.test/api/hub/admin-import',{method:options.method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json',...(options.authorized===false?{}:{'X-Migration-Token':s.env.HUB_MIGRATION_IMPORT_TOKEN}),...options.headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
async function call(s,body,expected=200,options={}){const response=await handleMigrationRequest(req(s,body,options),s.env);assert.equal(response.status,expected);assert.equal(response.headers.get('cache-control'),'private, no-store');return response.json();}

test('manifest exactly matches all 33 module business tables, columns and compound primary keys',()=>{
 const s=setup();try{assert.equal(Object.keys(MIGRATION_TABLES).length,33);for(const [name,definition] of Object.entries(MIGRATION_TABLES)){assert.ok(!name.startsWith('hub_'));const columns=s.sqlite.prepare(`PRAGMA table_info("${name}")`).all();assert.deepEqual(definition.columns.map(c=>c.name),columns.map(c=>c.name));assert.deepEqual(definition.primaryKey,columns.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name));}}finally{s.sqlite.close();}
});

test('token is mandatory and login/admin headers cannot bypass it; disabled on removal',async()=>{
 const s=setup();try{await call(s,payload([row()]),401,{authorized:false,headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}});await call(s,undefined,401,{headers:{'X-Migration-Token':'x'.repeat(64)}});const original=s.env.HUB_MIGRATION_IMPORT_TOKEN;s.env.HUB_MIGRATION_IMPORT_TOKEN='short';await call(s,payload([row()]),401);delete s.env.HUB_MIGRATION_IMPORT_TOKEN;await call(s,undefined,401,{authorized:false,headers:{'X-Migration-Token':original}});assert.equal(s.statements,0);}finally{s.sqlite.close();}
});

test('insert and idempotent retry preserve rows and emit metadata only',async()=>{
 const s=setup();try{const first=await call(s,payload([row()]));assert.equal(first.inserted,1);assert.equal(first.skipped,0);assert.ok(!JSON.stringify(first).includes('private-state'));const retry=await call(s,payload([row(),row()]));assert.equal(retry.inserted,0);assert.equal(retry.skipped,2);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,1);assert.equal(s.sqlite.prepare(`SELECT state_json FROM ${table}`).get().state_json,'private-state');}finally{s.sqlite.close();}
});

test('existing PK conflict rejects the complete request before any new rows are inserted',async()=>{
 const s=setup();try{await call(s,payload([row()]));await call(s,payload([row('new','new-state'),row('owner','different')]),409);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,1);assert.equal(s.sqlite.prepare(`SELECT state_json FROM ${table}`).get().state_json,'private-state');}finally{s.sqlite.close();}
});

test('compound primary keys support independent rows and reject conflicting duplicate rows',async()=>{
 const s=setup();const target='evopm_workbench__action_receipts';const one={owner_id:'A',request_id:'one',request_hash:'hash',revision:1,result_json:'{}',created_at:'now'};
 try{assert.equal((await call(s,payload([one,{...one,owner_id:'B'},{...one,request_id:'two'}],target))).inserted,3);assert.equal((await call(s,payload([{...one}],target))).skipped,1);await call(s,payload([one,{...one,result_json:'changed'}],target),409);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${target}`).get().n,3);}finally{s.sqlite.close();}
});

test('table/column injection, source mismatch, owner-mapping action and hub tables are rejected',async()=>{
 const s=setup();try{
 for(const bad of [{...payload([]),table:'workspaces; DROP TABLE hub_states;--'},{...payload([]),table:'hub_states'},{...payload([row()]),sourceProjectId:'wrong-source'},{...payload([row()]),action:'map-owner',fromOwner:'other',toOwner:'owner'},{...payload([row()]),rows:[{...row(),'extra);DROP TABLE x;--':'x'}]},{...payload([row()]),rows:[{owner_id:'missing-columns'}]}])await call(s,bad,400);
 assert.equal(s.statements,0);
 const malicious='x\'); DROP TABLE '+table+'; --';await call(s,payload([row('safe-owner',malicious)]));assert.equal(s.sqlite.prepare(`SELECT state_json FROM ${table}`).get().state_json,malicious);
 }finally{s.sqlite.close();}
});

test('null/type/row count/UTF-8 payload limits are enforced',async()=>{
 const s=setup();try{await call(s,payload([{...row(),revision:'1'}]),400);await call(s,payload([{...row(),owner_id:null}]),400);await call(s,payload(Array.from({length:101},(_,i)=>row(String(i)))),413);await call(s,payload([row('large','汉'.repeat(MAX_MIGRATION_BYTES/3))]),413);await call(s,payload([row()]),413,{headers:{'Content-Length':String(MAX_MIGRATION_BYTES+1)}});await call(s,'{invalid',400);await call(s,payload([row()]),415,{headers:{'Content-Type':'text/plain'}});assert.equal(s.statements,0);}finally{s.sqlite.close();}
});

test('secondary unique constraint rolls back all statements in a multi-statement insert batch',async()=>{
 const s=setup();const target='zhiliu_radar__sources';try{const definition=MIGRATION_TABLES[target];const rows=Array.from({length:20},(_,i)=>Object.fromEntries(definition.columns.map(c=>[c.name,c.name==='id'?'src-'+i:c.name==='url'?'https://example.test/'+(i===19?0:i):c.type==='integer'?1:c.notNull?'value':null])));await call(s,payload(rows,target),409);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${target}`).get().n,0);}finally{s.sqlite.close();}
});

test('concurrent insertion produces a conflict and never overwrites the winning row',async()=>{
 const s=setup();try{const original=s.env.DB.batch;let once=true;s.env.DB.batch=async items=>{if(items[0].sql.startsWith('INSERT')&&once){once=false;s.sqlite.prepare(`INSERT INTO ${table}(owner_id,state_json,revision,updated_at) VALUES(?,?,?,?)`).run('raced','winner',9,'now');}return original(items);};await call(s,payload([row('raced','loser'),row('other','must-rollback')]),409);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,1);assert.equal(s.sqlite.prepare(`SELECT state_json FROM ${table}`).get().state_json,'winner');}finally{s.sqlite.close();}
});

test('GET returns only allowlisted counts and POST permits no other methods',async()=>{
 const s=setup();try{await call(s,payload([row()]));const counts=await call(s);assert.equal(counts.tables.length,33);assert.equal(counts.tables.find(t=>t.table===table).count,1);assert.ok(!JSON.stringify(counts).includes('private-state'));for(const method of ['PUT','PATCH','DELETE','HEAD','OPTIONS'])await call(s,undefined,405,{method});}finally{s.sqlite.close();}
});

test('GET counts all tables using one bounded batch when compound SELECTs are unavailable',async()=>{
 const s=setup();try{
  await call(s,payload([row()]));const before=s.batches,prepare=s.env.DB.prepare,batch=s.env.DB.batch;
  s.env.DB.prepare=sql=>{if(/UNION/i.test(sql))throw new Error('D1_ERROR: compound SELECT unavailable');return prepare(sql);};
  s.env.DB.batch=items=>{assert.equal(items.length,33);assert.ok(items.every(item=>/^SELECT COUNT\(\*\) AS row_count FROM "[a-z_]+"$/.test(item.sql)));return batch(items);};
  const counts=await call(s);assert.equal(s.batches-before,1);assert.deepEqual(new Set(counts.tables.map(item=>item.table)),new Set(Object.keys(MIGRATION_TABLES)));assert.equal(counts.tables.find(item=>item.table===table).count,1);
 }finally{s.sqlite.close();}
});

test('count query failures have a safe fixed diagnostic and never log provider data',async()=>{
 const s=setup(),original=console.error,logs=[];console.error=(...values)=>logs.push(values);
 try{
  s.env.DB.batch=async()=>{throw new Error('D1_ERROR: too many terms in compound SELECT; PRIVATE_SENTINEL token=SECRET_SENTINEL');};
  const result=await call(s,undefined,503);assert.equal(result.error,'migration_count_failed');assert.deepEqual(logs,[['[hub-migration]',{stage:'count',cause:'query_limit',statementCount:33}]]);
  assert.ok(!JSON.stringify([result,logs]).includes('PRIVATE_SENTINEL'));assert.ok(!JSON.stringify([result,logs]).includes('SECRET_SENTINEL'));
 }finally{console.error=original;s.sqlite.close();}
});

test('incomplete count batch results are rejected rather than reported as a complete migration',async()=>{
 const s=setup(),original=console.error,logs=[];console.error=(...values)=>logs.push(values);
 try{s.env.DB.batch=async()=>[{success:true,results:[{row_count:0}]}];const result=await call(s,undefined,503);assert.equal(result.error,'migration_count_failed');assert.equal(logs[0][1].cause,'invalid_count_result');}
 finally{console.error=original;s.sqlite.close();}
});

test('count result rows and numeric values must be complete and JSON-safe',async()=>{
 const s=setup(),original=console.error;console.error=()=>{};
 try{
  for(const invalid of [undefined,[],[{row_count:-1}],[{row_count:1n}],[{row_count:'1'}]]){
   s.env.DB.batch=async()=>Array.from({length:33},()=>({success:true,results:invalid}));
   assert.equal((await call(s,undefined,503)).error,'migration_count_failed');
  }
 }finally{console.error=original;s.sqlite.close();}
});

test('100-row imports remain within D1 per-statement parameter limits',async()=>{
 const s=setup();try{const original=s.env.DB.prepare;s.env.DB.prepare=sql=>{assert.ok((sql.match(/\?/g)||[]).length<=100);if(sql.startsWith('SELECT')){assert.match(sql,/ IN \(/);assert.doesNotMatch(sql,/ OR /);}return original(sql);};const result=await call(s,payload(Array.from({length:100},(_,i)=>row('owner-'+i))));assert.equal(result.inserted,100);assert.equal((await call(s,payload(Array.from({length:100},(_,i)=>row('owner-'+i))))).skipped,100);}finally{s.sqlite.close();}
});

test('native constant-time branch compares only 32-byte hashes; portable branch rejects changes',async()=>{
 const prior=Object.getOwnPropertyDescriptor(crypto.subtle,'timingSafeEqual');let calls=0;const token=crypto.randomUUID()+crypto.randomUUID();
 try{Object.defineProperty(crypto.subtle,'timingSafeEqual',{configurable:true,value:function(a,b){assert.equal(this,crypto.subtle);calls++;assert.equal(a.byteLength,32);assert.equal(b.byteLength,32);return timingSafeEqual(new Uint8Array(a),new Uint8Array(b));}});assert.equal(await importTokenMatches(token,token),true);assert.equal(await importTokenMatches(token+'extra',token),false);assert.equal(calls,2);Object.defineProperty(crypto.subtle,'timingSafeEqual',{configurable:true,value:undefined});assert.equal(await importTokenMatches(token,token),true);assert.equal(await importTokenMatches('z'+token.slice(1),token),false);}finally{if(prior)Object.defineProperty(crypto.subtle,'timingSafeEqual',prior);else delete crypto.subtle.timingSafeEqual;}
});

const aiTable='ai_dev_collaboration_workbench__workspaces';
const emptyAI=()=>({user_id:'verified-hub-owner',data:JSON.stringify({projects:[],preferences:{theme:'light'}}),revision:1,updated_at:'empty-created'});
const sourceAI=()=>({...emptyAI(),data:JSON.stringify({projects:[{id:'old-project',name:'PRIVATE_PROJECT'}]}),revision:5,updated_at:'source-updated'});
const restorePayload=(expected=emptyAI(),incoming=sourceAI())=>({...payload([incoming],aiTable),replaceEmptyWorkspace:{expectedExistingRow:expected}});
const backupId=expected=>'migration-backup:'+expected.user_id+':'+createHash('sha256').update(JSON.stringify([expected.user_id,expected.data,expected.revision,expected.updated_at])).digest('hex');

test('empty AI workspace restore atomically archives exact default, advances revision and is idempotent',async()=>{
 const s=setup(),expected=emptyAI(),incoming=sourceAI();try{
  await call(s,payload([expected],aiTable));const result=await call(s,restorePayload());assert.equal(result.replaced,1);assert.equal(result.backupCreated,1);assert.equal(result.sourceRevision,5);assert.equal(result.installedRevision,6);assert.ok(!JSON.stringify(result).includes('PRIVATE_PROJECT'));
  const live=s.sqlite.prepare(`SELECT * FROM ${aiTable} WHERE user_id=?`).get(expected.user_id),backup=s.sqlite.prepare(`SELECT * FROM ${aiTable} WHERE user_id=?`).get(backupId(expected));
  assert.deepEqual({...live},{...incoming,revision:6});assert.deepEqual({...backup},{...expected,user_id:backupId(expected)});
  const retry=await call(s,restorePayload());assert.equal(retry.skipped,1);assert.equal(retry.replaced,0);assert.equal(retry.backupCreated,0);
  const stale=s.sqlite.prepare(`UPDATE ${aiTable} SET data=?,revision=revision+1 WHERE user_id=? AND revision=1`).run(expected.data,expected.user_id);assert.equal(stale.changes,0);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${aiTable}`).get().n,2);
 }finally{s.sqlite.close();}
});

test('workspace restore rejects other tables, multi-row requests, nonempty defaults and unverified row shapes',async()=>{
 const s=setup();try{
  const base=restorePayload();const bad=[{...payload([row()]),replaceEmptyWorkspace:base.replaceEmptyWorkspace},{...base,rows:[sourceAI(),sourceAI()]},{...base,replaceEmptyWorkspace:{expectedExistingRow:{...emptyAI(),data:'{"projects":[{}]}'}}},{...base,replaceEmptyWorkspace:{expectedExistingRow:{...emptyAI(),revision:2}}},{...base,replaceEmptyWorkspace:{expectedExistingRow:{...emptyAI(),extra:'not-allowed'}}},{...base,rows:[emptyAI()]},{...base,rows:[{...sourceAI(),user_id:'different-owner'}]},{...base,replaceEmptyWorkspace:{expectedExistingRow:emptyAI(),force:true}}];
  for(const item of bad)await call(s,item,400);assert.equal(s.statements,0);
 }finally{s.sqlite.close();}
});

test('workspace restore CAS refuses every live-row column change and creates no backup',async()=>{
 for(const column of ['user_id','data','revision','updated_at']){
  const s=setup(),expected=emptyAI();try{
   await call(s,payload([expected],aiTable));const batch=s.env.DB.batch;let race=true;
   s.env.DB.batch=async items=>{if(race&&items[0].sql.startsWith('INSERT')&&items.length===2){race=false;s.sqlite.prepare(`UPDATE ${aiTable} SET "${column}"=? WHERE user_id=?`).run(column==='revision'?2:'raced-value',expected.user_id);}return batch(items);};
   await call(s,restorePayload(),409);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${aiTable}`).get().n,1);assert.equal(s.sqlite.prepare(`SELECT * FROM ${aiTable}`).get()[column],column==='revision'?2:'raced-value');
  }finally{s.sqlite.close();}
 }
});

test('workspace restore refuses a conflicting backup without overwriting either record',async()=>{
 const s=setup(),expected=emptyAI(),collision={...emptyAI(),user_id:backupId(emptyAI()),data:'{"projects":[{"id":"keep"}]}'};try{
  await call(s,payload([expected,collision],aiTable));await call(s,restorePayload(),409);assert.equal(s.sqlite.prepare(`SELECT data FROM ${aiTable} WHERE user_id=?`).get(expected.user_id).data,expected.data);assert.equal(s.sqlite.prepare(`SELECT data FROM ${aiTable} WHERE user_id=?`).get(collision.user_id).data,collision.data);
 }finally{s.sqlite.close();}
});

test('workspace restore rolls back its backup if the guarded update fails',async()=>{
 const s=setup(),original=console.error;console.error=()=>{};
 try{
  await call(s,payload([emptyAI()],aiTable));const batch=s.env.DB.batch;
  s.env.DB.batch=async items=>{if(items.length===2&&items[1].sql.startsWith('UPDATE'))items[1]={...items[1],run:async()=>{throw new Error('D1_ERROR: forced update failure PRIVATE_SENTINEL');}};return batch(items);};
  await call(s,restorePayload(),503);assert.equal(s.sqlite.prepare(`SELECT COUNT(*) n FROM ${aiTable}`).get().n,1);assert.deepEqual({...s.sqlite.prepare(`SELECT * FROM ${aiTable}`).get()},emptyAI());
 }finally{console.error=original;s.sqlite.close();}
});
