import test from 'node:test';
import assert from 'node:assert/strict';
import {projectAsOf, parseMoment, TemporalError, applyTemporalCommand} from '../modules/novel-studio/temporal.mjs';
import {applyCommand} from '../modules/novel-studio/server/domain.mjs';
import {applyRetconCommand} from '../modules/novel-retcon/branch.mjs';

const source = (id='scene1') => ({sceneId:id,revisionId:'rev1',evidence:'原文证据'});
const event = (id,at,value,extra={}) => ({id,entityId:'key1',predicateId:'holder',layer:'world',op:'set',value,at,source:source(),...extra});
const empty = transitions => ({transitions,knowledge:[],speeches:[]});
const query = (input,asOf,extra={}) => projectAsOf(input,{asOf,perspective:'omniscient',sourceCurrent:()=>true,...extra});

test('explicit transfers project the correct single-value state at each story time',()=>{
 const input=empty([event('e1','1','阿岚'),event('e2','2','阿泽')]);
 assert.equal(query(input,'0').states[0].status,'UNKNOWN');
 assert.equal(query(input,'1').states[0].value,'阿岚');
 assert.equal(query(input,'2').states[0].value,'阿泽');
 assert.deepEqual(query(input,'3').states[0].eventIds,['e2']);
});
test('flashback uses story time rather than storage order or latest submitted event',()=>{
 const input=empty([event('e2','10','受伤'),event('e1','1','健康')]);
 assert.equal(query(input,'3').states[0].value,'健康');
});
test('conflicting transitions at the same instant are never silently ordered',()=>{
 const input=empty([event('e1','2','阿岚'),event('e2','2','阿泽')]);
 assert.equal(query(input,'2').states[0].status,'CONFLICT');
 assert.deepEqual(query(input,'2').states[0].eventIds,['e1','e2']);
});
test('unknown time or stale evidence blocks a conclusion at the affected instant',()=>{
 assert.equal(query(empty([event('e1','1','阿岚'),event('e2',null,'阿泽')]),'3').states[0].status,'UNKNOWN');
 const input=empty([event('e1','1','阿岚'),event('e2','2','阿泽')]);
 const resolver=(_,record)=>record.id!=='e2';
 assert.equal(query(input,'1',{sourceCurrent:resolver}).states[0].value,'阿岚');
 assert.equal(query(input,'3',{sourceCurrent:resolver}).states[0].status,'UNKNOWN');
});
test('a later explicit supported assignment can establish a new state after stale evidence',()=>{
 const input=empty([event('e1','1','阿岚'),event('e2','2','阿泽'),event('e3','3','守卫')]);
 assert.equal(query(input,'3',{sourceCurrent:(_,r)=>r.id!=='e2'}).states[0].value,'守卫');
});
test('independent entity IDs and belief subjects do not merge equal names or overwrite world truth',()=>{
 const input=empty([event('e1','1','活着',{entityId:'father1',predicateId:'life'}),event('e2','1','死亡',{entityId:'father1',predicateId:'life',layer:'belief',subjectId:'character1'}),event('e3','1','死亡',{entityId:'father2',predicateId:'life'})]);
 let all=query(input,'2').states;
 assert.equal(all.find(x=>x.entityId==='father1'&&x.layer==='world').value,'活着');
 assert.equal(all.find(x=>x.layer==='belief').value,'死亡');
 assert.equal(all.find(x=>x.entityId==='father2').value,'死亡');
});
test('limited perspective needs source-verified knowledge of exact state event',()=>{
 const input=empty([event('e1','1','阿岚'),event('e2','2','阿泽')]);
 input.knowledge.push({id:'k1',characterId:'mei',eventId:'e1',op:'knows',at:'1',source:source()});
 const limited={perspective:'limited',characterId:'mei'};
 assert.equal(query(input,'1',limited).states[0].value,'阿岚');
 assert.equal(query(input,'2',limited).states.length,0);
 input.knowledge.push({id:'k2',characterId:'mei',eventId:'e2',op:'knows',at:'3',source:source()});
 assert.equal(query(input,'3',limited).states[0].value,'阿泽');
 assert.equal(query(input,'3',{...limited,sourceCurrent:(_,r)=>r.id!=='k2'}).states.length,0);
});
test('speech is separate from world state and limited to explicit participants',()=>{
 const input=empty([]);input.speeches.push({id:'s1',speakerId:'alice',text:'我从来没去过仓库。',at:'2',audienceIds:['bob'],source:source()});
 assert.equal(query(input,'3').states.length,0);
 assert.equal(query(input,'3',{perspective:'limited',characterId:'bob'}).speeches.length,1);
 assert.equal(query(input,'3',{perspective:'limited',characterId:'charlie'}).speeches.length,0);
});
test('empty, invalid or unverified inputs cannot be called checked',()=>{
 assert.equal(parseMoment('早晨'),null);
 assert.throws(()=>projectAsOf(empty([]),{asOf:'2',perspective:'omniscient'}),TemporalError);
 assert.throws(()=>query(empty([event('e1','2','A',{entityId:'同名'})]),'3'),TemporalError);
 assert.throws(()=>query(empty([event('e1','2','A',{source:{sceneId:'s',revisionId:'r',evidence:''}})]),'3'),TemporalError);
 assert.throws(()=>query(empty([event('e1','2','A'),event('e1','3','B')]),'3'),TemporalError);
});
function archive(){return {schema:1,imports:[],projects:[{id:'p1',canonVersion:0,scenes:[{id:'scene1',title:'一',draft:'原文证据',revisions:[{id:'rev1',title:'一',body:'原文证据'}]}],proposals:[],facts:[],commits:[]}]}}
test('explicit structured event is validated against actual version and enters canon via domain CAS command',()=>{
 const input=archive(), command={type:'add_temporal_transition',projectId:'p1',...event('e1','1','阿岚')};
 const result=applyCommand(input,command,'2026-01-01T00:00:00Z');
 assert.equal(input.projects[0].temporal,undefined);
 assert.equal(result.state.projects[0].temporal.transitions[0].value,'阿岚');
 assert.equal(result.state.projects[0].canonVersion,1);
 assert.equal(result.receipt.eventId,'e1');
});
test('old version, invented evidence and cross-project knowledge cannot be committed',()=>{
 const input=archive(), command={type:'add_temporal_transition',projectId:'p1',...event('e1','1','阿岚')};
 assert.throws(()=>applyTemporalCommand(structuredClone(input),{...command,source:{...source(),evidence:'编造'}}),/来源/);
 assert.throws(()=>applyTemporalCommand(structuredClone(input),{...command,source:{...source(),revisionId:'obsolete'}}),/来源/);
 assert.throws(()=>applyTemporalCommand(structuredClone(input),{type:'add_temporal_knowledge',projectId:'p1',id:'k1',characterId:'A',eventId:'missing',op:'knows',at:'2',source:source()}),/世界状态事件/);
 assert.equal(input.projects[0].canonVersion,0);
});
test('knowledge cannot precede a known event and spoken content needs original text',()=>{
 const input=archive(), command={type:'add_temporal_transition',projectId:'p1',...event('e1','2','阿岚')};
 applyTemporalCommand(input,command);
 assert.throws(()=>applyTemporalCommand(input,{type:'add_temporal_knowledge',projectId:'p1',id:'k1',characterId:'A',eventId:'e1',op:'knows',at:'1',source:source()}),/不能早于/);
 assert.throws(()=>applyTemporalCommand(input,{type:'add_temporal_speech',projectId:'p1',id:'s1',speakerId:'A',text:'不存在的话',audienceIds:['B'],at:'2',source:source()}),/来源正文/);
 assert.equal(input.projects[0].temporal.knowledge.length,0);
});
test('merging a revised source preserves temporal history but excludes the unsupported old state',()=>{
 const input=archive(), project=input.projects[0];
 project.records=[];project.dependencies=[];
 applyTemporalCommand(input,{type:'add_temporal_transition',projectId:'p1',...event('e1','1','阿岚')});
 const run=c=>applyRetconCommand(input,{projectId:'p1',...c},'2026-01-01T00:00:00Z');
 run({type:'retcon_open',branchId:'branch1'});
 run({type:'retcon_change',branchId:'branch1',sceneId:'scene1',revisionId:'rev2',title:'一',body:'钥匙藏在井底。'});
 run({type:'retcon_merge',branchId:'branch1',expectedBranchVersion:1});
 const lookup=source=>{const s=project.scenes.find(x=>x.id===source.sceneId),r=s?.revisions.at(-1);return !!r&&r.id===source.revisionId&&s.draft===r.body&&r.body.includes(source.evidence)};
 const result=query(project.temporal,'2',{sourceCurrent:lookup});
 assert.equal(project.temporal.transitions.length,1);
 assert.equal(project.scenes[0].revisions[0].body,'原文证据');
 assert.equal(result.states[0].status,'UNKNOWN');
});
