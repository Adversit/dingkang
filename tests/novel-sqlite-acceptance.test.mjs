import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {executeCommand,readArchive} from '../modules/novel-studio/server/store.mjs';

// These are the same conditional SQL statements used by the D1 adapter,
// exercised against SQLite, not against a live Cloudflare D1 database.
function sqliteAdapter(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE novel_canon_states(owner_id TEXT PRIMARY KEY, state_json TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL)');
 const get=db.prepare('SELECT state_json, version, updated_at FROM novel_canon_states WHERE owner_id = ?');
 const insert=db.prepare('INSERT INTO novel_canon_states (owner_id, state_json, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(owner_id) DO NOTHING');
 const update=db.prepare('UPDATE novel_canon_states SET state_json = ?, version = version + 1, updated_at = ? WHERE owner_id = ? AND version = ?');
 return {async load(owner){return get.get(owner)??null},async compareAndSwap(owner,version,state,now){return (version===0?insert.run(owner,state,now):update.run(state,now,owner,version)).changes===1}};
}
const request=(id,expectedVersion,projectId)=>({commandId:id,expectedVersion,command:{type:'create_project',projectId,name:projectId}});
const when='2026-10-30T00:00:00.000Z';

test('SQLite initial insert and subsequent update reject stale writers and isolate users',async()=>{
 const db=sqliteAdapter();
 await executeCommand(db,'alice',request('a0',0,'p1'),when);
 await executeCommand(db,'bob',request('b0',0,'other'),when);
 await assert.rejects(executeCommand(db,'alice',request('a1',0,'stale'),when),{status:409});
 await executeCommand(db,'alice',request('a2',1,'p2'),when);
 const alice=await readArchive(db,'alice'),bob=await readArchive(db,'bob');
 assert.equal(alice.version,2);assert.deepEqual(alice.state.projects.map(p=>p.id),['p1','p2']);
 assert.equal(bob.version,1);assert.deepEqual(bob.state.projects.map(p=>p.id),['other']);
});

test('SQLite same-base parallel writes commit exactly one row update',async()=>{
 const db=sqliteAdapter();
 const result=await Promise.allSettled([
  executeCommand(db,'alice',request('ca',0,'pa'),when),
  executeCommand(db,'alice',request('cb',0,'pb'),when)
 ]);
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(result.find(x=>x.status==='rejected').reason.status,409);
 assert.equal((await readArchive(db,'alice')).version,1);
});
