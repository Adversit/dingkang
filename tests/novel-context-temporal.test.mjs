import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContext} from '../modules/novel-ai/context.mjs';
const source={sceneId:'s1',revisionId:'r1',evidence:'钥匙被交接。'};
const event=(id,at,value,extra={})=>({id,at,value,entityId:'key1',predicateId:'holder',layer:'world',op:'set',subjectId:'',source,...extra});
const archive=transitions=>({version:1,state:{projects:[{id:'p1',canonVersion:1,scenes:[{id:'s1',title:'场景',draft:'钥匙被交接。',revisions:[{id:'r1',title:'场景',body:'钥匙被交接。'}]}],facts:[{id:'f1',layer:'world',statement:'旧事实：钥匙在 A 处',storyTime:'1',sceneId:'s1',revisionId:'r1',evidence:'钥匙被交接。'}],temporal:{transitions,knowledge:[],speeches:[]}}]}});
const input={projectId:'p1',sceneId:'s1',revisionId:'r1',instruction:'续写',storyMoment:'3',perspective:'omniscient',pov:'',factIds:['f1']};
test('context uses latest explicit state, never selected stale unstructured world fact',async()=>{
 const p=await compileContext(input,archive([event('e1','1','A'),event('e2','2','B')]),'model');
 assert.match(p.excluded[0].reason,/自由文本/);
 const user=JSON.parse(p.messages[1].content);
 assert.equal(user.reference.world.length,1);
 assert.match(user.reference.world[0].statement,/B$/);
 assert.ok(!JSON.stringify(user).includes('旧事实'));
 assert.deepEqual(p.temporalProjection.states[0].eventIds,['e2']);
 assert.equal(p.reviewInput.facts[0].id,'temporal_e2');
});
test('conflicting same-time states are visible to author but never included in AI context',async()=>{
 const p=await compileContext(input,archive([event('e1','2','A'),event('e2','2','B')]),'model');
 assert.equal(p.temporalProjection.states[0].status,'CONFLICT');
 assert.equal(JSON.parse(p.messages[1].content).reference.world.length,0);
 assert.equal(p.reviewInput.facts.length,0);
});
test('unknown or stale latest event does not resurrect older state',async()=>{
 const a=archive([event('e1','1','A'),event('e2','2','B',{source:{...source,revisionId:'stale'}})]);
 const p=await compileContext(input,a,'model');assert.equal(p.temporalProjection.states[0].status,'UNKNOWN');
 assert.equal(JSON.parse(p.messages[1].content).reference.world.length,0);
});
test('limited perspective excludes world truth without explicit verified knowledge of current transition',async()=>{
 const a=archive([event('e1','1','A'),event('e2','2','B')]);
 const selected={...input,perspective:'limited',pov:'hero'};
 assert.equal((await compileContext(selected,a,'model')).included.length,0);
 a.state.projects[0].temporal.knowledge.push({id:'k1',characterId:'hero',eventId:'e2',op:'knows',at:'2',source});
 const p=await compileContext(selected,a,'model');assert.match(p.included[0].statement,/B$/);
});
test('evidence passages stay visible to the author but never leak into model or review messages',async()=>{
 const secret='无关秘密：真正的宝藏在海底';
 const a=archive([event('e1','1','A',{source:{sceneId:'s2',revisionId:'r2',evidence:`钥匙交给 A。${secret}`}})]);
 a.state.projects[0].scenes.push({id:'s2',title:'旧场景',draft:`钥匙交给 A。${secret}`,revisions:[{id:'r2',title:'旧场景',body:`钥匙交给 A。${secret}`}]});
 a.state.projects[0].temporal.knowledge.push({id:'k1',characterId:'hero',eventId:'e1',op:'knows',at:'1',source:{sceneId:'s2',revisionId:'r2',evidence:'钥匙交给 A。'}});
 const p=await compileContext({...input,perspective:'limited',pov:'hero'},a,'model');
 assert.equal(p.included[0].source.evidence[0].evidence,`钥匙交给 A。${secret}`);
 assert.equal(JSON.stringify(p.messages).includes(secret),false);
 assert.equal(JSON.stringify(p.checkMessages).includes(secret),false);
 assert.equal(JSON.stringify(p.reviewInput).includes(secret),false);
});
test('ordinary selected fact sources are not injected into provider messages',async()=>{
 const a=archive([]),secret='尚未披露的秘密';
 a.state.projects[0].scenes.push({id:'s2',title:'旧场景',draft:`证据文本 ${secret}`,revisions:[{id:'r2',title:'旧场景',body:`证据文本 ${secret}`}]});
 a.state.projects[0].facts[0]={id:'f1',layer:'belief',subject:'hero',statement:'他认为钥匙是铜的',storyTime:'1',sceneId:'s2',revisionId:'r2',evidence:`证据文本 ${secret}`};
 const p=await compileContext({...input,perspective:'limited',pov:'hero'},a,'model');
 assert.ok(JSON.stringify(p.included).includes(secret));
 assert.equal(JSON.stringify(p.messages).includes(secret),false);
 assert.equal(JSON.stringify(p.checkMessages).includes(secret),false);
});
