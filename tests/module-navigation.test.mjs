import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleNavigationAction} from '../lib/hub/module-navigation.ts';

const origin='https://workspace.example';
const frame={};
const message=type=>({origin,source:frame,data:{type,moduleId:'novel-studio'}});

test('the active novel frame can open workspace tools and return without arbitrary navigation',()=>{
  for(const action of ['hub:open-menu','hub:return'])assert.equal(moduleNavigationAction(message(action),frame,origin,'novel-studio'),action);
  for(const action of ['https://elsewhere.test','hub:delete','hub:open-app'])assert.equal(moduleNavigationAction(message(action),frame,origin,'novel-studio'),null);
});

test('other documents, origins, inactive apps and malformed messages cannot control the workspace',()=>{
  const valid=message('hub:return');
  for(const candidate of [
    {...valid,origin:'https://foreign.example'},
    {...valid,source:{}},
    {...valid,data:{type:'hub:return',moduleId:'other'}},
    {...valid,data:null},
    {...valid,data:'hub:return'},
    {...valid,data:['hub:return']},
  ])assert.equal(moduleNavigationAction(candidate,frame,origin,'novel-studio'),null);
  for(const active of [null,'game','novel-studio-old'])assert.equal(moduleNavigationAction(valid,frame,origin,active),null);
  assert.equal(moduleNavigationAction(valid,null,origin,'novel-studio'),null);
});
