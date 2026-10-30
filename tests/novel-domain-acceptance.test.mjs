import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, applyCommand} from '../modules/novel-studio/server/domain.mjs';

// The tests exercise author-visible commands. They do not claim to evaluate
// natural-language contradiction detection or literary quality.
const at = '2026-10-30T12:00:00.000Z';
const exec = (state, command) => applyCommand(state, command, at).state;
const create = () => {
  let s = initialState();
  s = exec(s, {type:'create_project',projectId:'p1',name:'测试作品',description:''});
  s = exec(s, {type:'create_scene',projectId:'p1',sceneId:'s1',title:'雨夜'});
  s = exec(s, {type:'save_draft',projectId:'p1',sceneId:'s1',title:'雨夜',body:'阿宁把铜钥匙交给小舟。'});
  return exec(s, {type:'save_revision',projectId:'p1',sceneId:'s1',revisionId:'r1'});
};
const proposal = (overrides={}) => ({
  type:'propose_fact',projectId:'p1',sceneId:'s1',revisionId:'r1',proposalId:'q1',
  statement:'小舟持有铜钥匙',evidence:'阿宁把铜钥匙交给小舟。',kind:'物件',layer:'world',storyTime:'第2天',subject:'小舟',...overrides
});
const commit = (overrides={}) => ({type:'commit_fact',projectId:'p1',proposalId:'q1',factId:'f1',...overrides});

test('saving a revision preserves its source and proposing is separate from committing',()=>{
  const before=create(), snapshot=structuredClone(before);
  const pending=exec(before,proposal());
  assert.deepEqual(before,snapshot,'applying a command must not mutate the original state');
  assert.equal(pending.projects[0].canonVersion,before.projects[0].canonVersion,'a proposal is not a canon commit');
  const accepted=exec(pending,commit());
  assert.equal(accepted.projects[0].canonVersion,before.projects[0].canonVersion+1);
});

test('empty or fabricated evidence cannot become a proposal',()=>{
  const before=create(), snapshot=structuredClone(before);
  assert.throws(()=>exec(before,proposal({evidence:''})));
  assert.throws(()=>exec(before,proposal({evidence:'小舟把钥匙扔进海里。'})));
  assert.deepEqual(before,snapshot,'failed evidence validation cannot change stored state');
});

test('editing a draft after proposing prevents confirmation of the older source',()=>{
  let s=exec(create(),proposal());
  s=exec(s,{type:'save_draft',projectId:'p1',sceneId:'s1',title:'雨夜',body:'阿宁将铜钥匙留在家里。'});
  const snapshot=structuredClone(s);
  assert.throws(()=>exec(s,commit()));
  assert.deepEqual(s,snapshot,'a stale proposal must not alter the canon or draft');
});

test('saving a newer revision prevents committing an earlier proposal',()=>{
  let s=exec(create(),proposal());
  s=exec(s,{type:'save_draft',projectId:'p1',sceneId:'s1',title:'雨夜',body:'阿宁将铜钥匙留在家里。'});
  s=exec(s,{type:'save_revision',projectId:'p1',sceneId:'s1',revisionId:'r2'});
  const snapshot=structuredClone(s);
  assert.throws(()=>exec(s,commit()));
  assert.deepEqual(s,snapshot);
});

test('two proposals from the same canon base cannot both be committed without revalidation',()=>{
  let s=exec(create(),proposal());
  s=exec(s,proposal({proposalId:'q2',statement:'阿宁曾经持有铜钥匙',subject:'阿宁'}));
  s=exec(s,commit());
  const snapshot=structuredClone(s);
  assert.throws(()=>exec(s,commit({proposalId:'q2',factId:'f2'})));
  assert.deepEqual(s,snapshot,'a second stale proposal cannot overwrite a committed fact');
});

test('imported legacy facts stay outside canon until reviewed',()=>{
  const imported=exec(initialState(),{type:'import_legacy',importId:'legacy1',projects:[{
    id:'old-p',name:'旧作品',description:'',
    scenes:[{id:'old-s',title:'旧场景',body:'小舟拿着钥匙。',revisions:[{id:'old-r',title:'旧场景',body:'小舟拿着钥匙。',created:'2026-10-01T00:00:00Z'}]}],
    facts:[{id:'old-f',sceneId:'old-s',revisionId:'old-r',statement:'小舟持有钥匙',evidence:'小舟拿着钥匙。',kind:'物件',status:'accepted'}]
  }]});
  const p=imported.projects[0];assert.equal(p.scenes[0].draft,'小舟拿着钥匙。');
  assert.equal(p.scenes[0].revisions[0].body,'小舟拿着钥匙。');
  assert.equal(p.facts.length,0);assert.equal(p.canonVersion,0);assert.equal(p.legacyFacts.length,1);
});

test('invalid imported fact references reject the whole import without modifying current state',()=>{
  const before=create(),snapshot=structuredClone(before);
  assert.throws(()=>exec(before,{type:'import_legacy',importId:'bad',projects:[{name:'旧稿',scenes:[],facts:[{sceneId:'missing',revisionId:'missing',statement:'失效事实',evidence:'无原文'}]}]}));
  assert.deepEqual(before,snapshot);
});

test('a proposal cannot reference a revision belonging to a different project',()=>{
  let s=create();
  s=exec(s,{type:'create_project',projectId:'p2',name:'另一部作品'});
  s=exec(s,{type:'create_scene',projectId:'p2',sceneId:'s2',title:'另一场景'});
  s=exec(s,{type:'save_draft',projectId:'p2',sceneId:'s2',title:'另一场景',body:'阿宁把铜钥匙交给小舟。'});
  s=exec(s,{type:'save_revision',projectId:'p2',sceneId:'s2',revisionId:'r2'});
  const snapshot=structuredClone(s);
  assert.throws(()=>exec(s,proposal({revisionId:'r2'})));
  assert.deepEqual(s,snapshot);
});

test('planning and character records retain revision history without becoming canon',()=>{
 let s=create();
 const record={type:'save_record',projectId:'p1',recordId:'outline1',category:'outline',title:'计划',content:'阿宁计划交出钥匙',subject:'阿宁',storyTime:'第3天',status:'plan'};
 s=exec(s,record);const previous=structuredClone(s);
 s=exec(s,{...record,content:'阿宁决定留下钥匙'});
 const p=s.projects[0],r=p.records.find(x=>x.id==='outline1');
 assert.equal(r.content,'阿宁决定留下钥匙');assert.equal(r.history[0].content,'阿宁计划交出钥匙');
 assert.equal(p.canonVersion,0);assert.equal(p.facts.length,0);assert.deepEqual(previous.projects[0].records[0].history,[]);
});

test('an existing record cannot silently change its category',()=>{
 let s=exec(create(),{type:'save_record',projectId:'p1',recordId:'doc1',category:'character',title:'阿宁',content:'医学生',status:'open'});
 let snapshot=structuredClone(s);
 assert.throws(()=>exec(s,{type:'save_record',projectId:'p1',recordId:'doc1',category:'world',title:'改成规则',content:'世界规则',status:'open'}),{status:409});
 assert.deepEqual(s,snapshot);
});
