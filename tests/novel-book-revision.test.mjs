import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePlanRevision as prepare } from '../modules/novel-orchestration/plan-revision.mjs';
const outline={title:'示例书名',premise:'初版命题',rules:['世界规则甲'],volumes:[{title:'卷一',turn:'甲',reveal:'乙'},{title:'卷二',turn:'丙',reveal:'丁'}],convergence:'汇合',ending:'旧版收束'};
const previous={previousOutline:outline,previousChapters:[{title:'第一章',goal:'本章观察'}],source:{role:'book-planner',template:'book-outline-v1',round:1,model:'example-model',previewHash:'a'.repeat(64)},feedback:'沿用上一稿世界规则，重做第二卷的因果。'};
test('second planning round keeps a bounded prior answer and a distinct new instruction, dropping undeclared private fields',()=>{
  assert.equal(prepare(undefined),null);
  const revised=prepare({...previous,holdBack:'PRIVATE',previousOutline:{...outline,holdBack:'PRIVATE'},previousChapters:[{...previous.previousChapters[0],holdBack:'PRIVATE'}]});
  assert.deepEqual(revised,{round:2,feedback:previous.feedback,previousOutline:outline,previousChapters:previous.previousChapters,previousModel:'example-model'});
  assert.ok(!JSON.stringify(revised).includes('PRIVATE'));
});
test('invalid or oversized prior responses cannot start a revision',()=>{
  for(const changed of [{source:{...previous.source,role:'writer'}},{source:{...previous.source,round:-1}},{source:{...previous.source,template:'stale'}},{source:{...previous.source,previewHash:'bad'}},{feedback:' '},{previousOutline:{...outline,volumes:[]}},{previousChapters:[{title:'章',goal:'甲'.repeat(1500)}]}])
    assert.throws(()=>prepare({...previous,...changed}));
  const vol={title:'卷',turn:'心'.repeat(1200),reveal:'道'.repeat(900)};
  assert.throws(()=>prepare({...previous,previousOutline:{...outline,volumes:Array(8).fill(vol)}}),/过长/);
});
