import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContext} from '../modules/novel-ai/context.mjs';

const doc={version:10,state:{projects:[{id:'book',canonVersion:2,scenes:[
 {id:'flashback',title:'倒叙',draft:'程遥左手接住茶碗。',revisions:[{id:'r2',title:'倒叙',body:'程遥左手接住茶碗。'}]},
 {id:'later',title:'受伤',draft:'程遥第十天伤了左手。',revisions:[{id:'r10',title:'受伤',body:'程遥第十天伤了左手。'}]}
],facts:[{id:'injury',sceneId:'later',revisionId:'r10',evidence:'程遥第十天伤了左手。',statement:'程遥左手受伤',subject:'程遥',storyTime:'10',layer:'world',canonVersion:1}] }]}};
const request={projectId:'book',sceneId:'flashback',revisionId:'r2',instruction:'续写',storyMoment:'2',perspective:'omniscient',pov:'',factIds:['injury']};

test('a flashback to story day 2 does not send the day 10 injury',async()=>{
 const preview=await compileContext(request,doc,'test');
 assert.equal(preview.included.length,0);assert.match(preview.excluded[0].reason,/晚于/);
 const payload=JSON.parse(preview.messages[1].content);assert.deepEqual(payload.reference.world,[]);
});

test('an arbitrary current flag cannot make a modified source fact enter the model input',async()=>{
 const changed=structuredClone(doc);const p=changed.state.projects[0];p.scenes[1].draft='程遥的左手没有受伤。';p.facts[0].sourceStatus='current';
 const preview=await compileContext({...request,storyMoment:'20'},changed,'test');
 assert.equal(preview.included.length,0);assert.match(preview.excluded[0].reason,/变化/);
 const input=JSON.parse(preview.messages[1].content);assert.deepEqual(input.reference.world,[]);
});

test('facts belonging to another project cannot be selected by ID',async()=>{
 const changed=structuredClone(doc);changed.state.projects.push({id:'other',canonVersion:1,scenes:[],facts:[{id:'secret',statement:'另一本书的秘密'}]});
 const preview=await compileContext({...request,factIds:['secret']},changed,'test');
 assert.equal(preview.included.length,0);assert.match(preview.excluded[0].reason,/不属于当前作品/);
 assert.equal(preview.messages[1].content.includes('另一本书的秘密'),false);
});
