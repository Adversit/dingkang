import test from 'node:test';
import assert from 'node:assert/strict';
import {executeCommand,readArchive} from '../modules/novel-studio/server/store.mjs';

// Adapter simulates atomic compare-and-swap; this is a domain/store contract
// check, not a claim that the live D1 deployment has been exercised.
function memoryAdapter(){
  const rows=new Map();
  return {
    async load(owner){const row=rows.get(owner);return row?{...row}:null},
    async compareAndSwap(owner,expectedVersion,stateJSON,now){
      const current=rows.get(owner);if((current?.version??0)!==expectedVersion)return false;
      rows.set(owner,{version:expectedVersion+1,state_json:stateJSON,updated_at:now});return true;
    }
  };
}
const timestamp='2026-10-30T12:00:00.000Z';
const request=(id,version,command)=>({commandId:id,expectedVersion:version,command});
const project=(id,name)=>({type:'create_project',projectId:id,name,description:''});
const run=(adapter,owner,r)=>executeCommand(adapter,owner,r,timestamp);

test('retry after a successful commit returns the original receipt without applying twice',async()=>{
  const db=memoryAdapter(), req=request('c1',0,project('p1','作品一'));
  const first=await run(db,'alice',req), retry=await run(db,'alice',req);
  assert.equal(first.receipt.replayed,false);
  assert.equal(retry.receipt.replayed,true);
  assert.equal(retry.receipt.committedVersion,first.receipt.committedVersion);
  const state=await readArchive(db,'alice');
  assert.equal(state.version,1);assert.equal(state.state.projects.length,1);
});

test('reusing a command ID for a different request is rejected without mutation',async()=>{
  const db=memoryAdapter(), req=request('c1',0,project('p1','作品一'));
  await run(db,'alice',req);
  await assert.rejects(run(db,'alice',request('c1',1,project('p2','作品二'))),{status:409});
  const state=await readArchive(db,'alice');
  assert.equal(state.version,1);assert.deepEqual(state.state.projects.map(p=>p.id),['p1']);
});

test('two different concurrent writes on the same base produce one winner and one conflict',async()=>{
  const db=memoryAdapter();
  const outcomes=await Promise.allSettled([
    run(db,'alice',request('ca',0,project('pa','作品甲'))),
    run(db,'alice',request('cb',0,project('pb','作品乙')))
  ]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  const rejected=outcomes.find(r=>r.status==='rejected');assert.equal(rejected.reason.status,409);
  const state=await readArchive(db,'alice');assert.equal(state.version,1);assert.equal(state.state.projects.length,1);
});

test('identical concurrent commands settle once and replay the original commit',async()=>{
  const db=memoryAdapter(),req=request('c1',0,project('p1','作品'));
  const result=await Promise.all([run(db,'alice',req),run(db,'alice',req)]);
  assert.deepEqual(result.map(x=>x.receipt.replayed).sort(),[false,true]);
  assert.equal((await readArchive(db,'alice')).version,1);
});

test('storage rows and command IDs are scoped to the authenticated owner',async()=>{
  const db=memoryAdapter();
  await run(db,'alice',request('same',0,project('p1','甲的作品')));
  await run(db,'bob',request('same',0,project('p2','乙的作品')));
  assert.deepEqual((await readArchive(db,'alice')).state.projects.map(p=>p.id),['p1']);
  assert.deepEqual((await readArchive(db,'bob')).state.projects.map(p=>p.id),['p2']);
});

test('valid command identifiers that collide with prototype names work and replay safely',async()=>{
  for(const id of ['constructor','toString','__proto__']){
    const db=memoryAdapter(),req=request(id,0,project('p1','作品'));
    const first=await run(db,'alice',req),retry=await run(db,'alice',req);
    assert.equal(first.receipt.replayed,false,`first ${id} should apply`);
    assert.equal(retry.receipt.replayed,true,`retry ${id} should replay`);
    assert.equal((await readArchive(db,'alice')).version,1);
  }
});

test('editing a committed source marks its fact stale without rewriting its original evidence',async()=>{
 const db=memoryAdapter();let version=0;
 const command=async(id,c)=>{const r=await run(db,'alice',request(id,version,c));version=r.version;return r};
 await command('c1',project('p1','作品'));
 await command('c2',{type:'create_scene',projectId:'p1',sceneId:'s1',title:'交接'});
 await command('c3',{type:'save_draft',projectId:'p1',sceneId:'s1',title:'交接',body:'阿宁把玉佩交给小舟。'});
 await command('c4',{type:'save_revision',projectId:'p1',sceneId:'s1',revisionId:'r1'});
 await command('c5',{type:'propose_fact',projectId:'p1',sceneId:'s1',revisionId:'r1',proposalId:'q1',statement:'小舟持有玉佩',evidence:'阿宁把玉佩交给小舟。',kind:'物件',layer:'world',storyTime:'',subject:'小舟'});
 let committed=await command('c6',{type:'commit_fact',projectId:'p1',proposalId:'q1',factId:'f1'});
 assert.equal(committed.state.projects[0].facts[0].sourceStatus,'current');
 await command('c7',{type:'save_draft',projectId:'p1',sceneId:'s1',title:'交接',body:'阿宁把玉佩留在家中。'});
 let result=await readArchive(db,'alice'),fact=result.state.projects[0].facts[0];
 assert.equal(fact.sourceStatus,'stale');assert.equal(fact.revisionId,'r1');assert.equal(fact.evidence,'阿宁把玉佩交给小舟。');
});

test('oversized archive is rejected before the storage adapter can write it',async()=>{
 const db=memoryAdapter();let version=0;
 const command=async(id,c)=>{const r=await run(db,'alice',request(id,version,c));version=r.version;return r};
 await command('project',project('p','作品'));
 for(let n=0;n<3;n++){
   await command('new'+n,{type:'create_scene',projectId:'p',sceneId:'s'+n,title:'场景'});
   await command('text'+n,{type:'save_draft',projectId:'p',sceneId:'s'+n,title:'场景',body:'a'.repeat(450000)});
 }
 await command('new3',{type:'create_scene',projectId:'p',sceneId:'s3',title:'场景'});
 const before=await readArchive(db,'alice');
 await assert.rejects(command('text3',{type:'save_draft',projectId:'p',sceneId:'s3',title:'场景',body:'a'.repeat(450000)}),{status:413});
 const after=await readArchive(db,'alice');assert.equal(after.version,before.version);assert.equal(after.state.projects[0].scenes[3].draft,'');
});

async function dependencyFixture(db){
 let version=0;const command=async(id,c)=>{let r=await run(db,'alice',request(id,version,c));version=r.version;return r};
 await command('p',project('p','作品'));
 for(const [s,title,body,r] of [['s3','第三场','阿宁把玉佩交给小舟。','r3'],['s6','第六场','小舟用玉佩开门。','r6']]){
   await command('create_'+s,{type:'create_scene',projectId:'p',sceneId:s,title});
   await command('draft_'+s,{type:'save_draft',projectId:'p',sceneId:s,title,body});
   await command('rev_'+s,{type:'save_revision',projectId:'p',sceneId:s,revisionId:r});
 }
 return {command,dependency:{type:'create_dependency',projectId:'p',dependencyId:'dep1',sourceSceneId:'s3',sourceRevisionId:'r3',sourceEvidence:'阿宁把玉佩交给小舟。',targetSceneId:'s6',targetRevisionId:'r6',targetEvidence:'小舟用玉佩开门。',reason:'后文开门依赖交接'}};
}

test('source edits surface an explicit downstream impact and keep earlier evidence',async()=>{
 const db=memoryAdapter(),{command,dependency}=await dependencyFixture(db);
 let r=await command('dep',dependency);let d=r.state.projects[0].dependencies[0];
 assert.equal(d.sourceStatus,'current');assert.equal(d.targetStatus,'current');assert.equal(d.impacted,false);
 await command('edit',{type:'save_draft',projectId:'p',sceneId:'s3',title:'第三场',body:'阿宁把玉佩留在家中。'});
 d=(await readArchive(db,'alice')).state.projects[0].dependencies[0];
 assert.equal(d.sourceStatus,'stale');assert.equal(d.targetStatus,'current');assert.equal(d.impacted,true);assert.equal(d.sourceEvidence,'阿宁把玉佩交给小舟。');
});

test('changing a dependent scene makes that edge require review',async()=>{
 const db=memoryAdapter(),{command,dependency}=await dependencyFixture(db);await command('dep',dependency);
 await command('edit',{type:'save_draft',projectId:'p',sceneId:'s6',title:'第六场',body:'小舟从窗户爬入。'});
 const d=(await readArchive(db,'alice')).state.projects[0].dependencies[0];
 assert.equal(d.targetStatus,'stale');assert.equal(d.impacted,true);
});

test('dependency rejects invented evidence and cross-project scene IDs',async()=>{
 const db=memoryAdapter(),{command,dependency}=await dependencyFixture(db);
 await command('p2',project('other','另一部作品'));
 await command('s2',{type:'create_scene',projectId:'other',sceneId:'foreign',title:'其他'});
 await command('d2',{type:'save_draft',projectId:'other',sceneId:'foreign',title:'其他',body:'小舟用玉佩开门。'});
 await command('r2',{type:'save_revision',projectId:'other',sceneId:'foreign',revisionId:'foreignR'});
 const before=await readArchive(db,'alice');
 await assert.rejects(command('fake',{...dependency,sourceEvidence:'没有出现过的句子'}));
 await assert.rejects(command('cross',{...dependency,targetSceneId:'foreign',targetRevisionId:'foreignR'}));
 const after=await readArchive(db,'alice');assert.deepEqual(after,before);
});

test('retiring a dependency keeps an auditable historical record',async()=>{
 const db=memoryAdapter(),{command,dependency}=await dependencyFixture(db);await command('dep',dependency);
 await command('retire',{type:'retire_dependency',projectId:'p',dependencyId:'dep1'});
 const d=(await readArchive(db,'alice')).state.projects[0].dependencies[0];
 assert.ok(d.retiredAt);assert.equal(d.sourceSceneId,'s3');assert.equal(d.targetSceneId,'s6');
});
