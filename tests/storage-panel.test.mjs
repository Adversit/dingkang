import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {findModuleStorage, flushHubModule, hubStorageMode, cancelHubModuleLeave, storageErrorMessage, isSignedOutStorageFailure} from '../lib/hub/storage-panel.ts';

const origin = 'https://example.test';
function frame(bridge, frames = [], location = {origin}) { return {HubStorage: bridge, frames, location, document: {}}; }
function bridge(moduleId = 'starfall-creature-isles') {
  return {moduleId, ready: Promise.resolve(), status: {state: 'saved'}, flush: async () => {}};
}

test('errors crossing an iframe retain their actionable message', () => {
  const foreign = vm.runInNewContext("new Error('网络暂不可用，请重试')");
  assert.equal(foreign instanceof Error, false);
  assert.equal(storageErrorMessage(foreign), '网络暂不可用，请重试');
  assert.equal(storageErrorMessage(new Error('保存失败')), '保存失败');
  for (const invalid of [null, undefined, {}, {message: 42}, {message: '  '}]) {
    assert.equal(storageErrorMessage(invalid, '稍后重试'), '稍后重试');
  }
});

test('only untouched signed-out initialization becomes a login prompt', () => {
  const foreign = vm.runInNewContext("Object.assign(new Error('Sign in to load your saved data.'), {name: 'SecurityError'})");
  const guest = {...bridge(), userId: null, canLeaveWithoutSaving: true};
  assert.equal(isSignedOutStorageFailure(foreign, guest), true);
  // A hydrated account, queued local state, and an ordinary outage retain error handling.
  assert.equal(isSignedOutStorageFailure(foreign, {...guest, userId: 'alice'}), false);
  assert.equal(isSignedOutStorageFailure(foreign, {...guest, canLeaveWithoutSaving: false}), false);
  assert.equal(isSignedOutStorageFailure(new TypeError('offline'), guest), false);
  assert.equal(isSignedOutStorageFailure(foreign), false);
});

test('nested same-origin modules are found without adopting another module or cross-origin iframe', () => {
  const correct = bridge('moonlit-immortal-chronicle');
  const inner = frame(correct), root = frame(bridge('wrong-module'), [frame(correct, [], {origin: 'https://elsewhere.test'}), inner]);
  assert.equal(findModuleStorage(root, correct.moduleId, origin).window, inner);
  assert.equal(findModuleStorage(root, 'starfall-creature-isles', origin), null);
  const inaccessible = {get location() { throw new Error('SecurityError'); }};
  assert.equal(findModuleStorage(inaccessible, correct.moduleId, origin), null);
});

test('leaving a pending module waits for the real flush before resolving', async () => {
  const state = bridge(); state.status = {state: 'pending'};
  let release, flushed = false;
  state.flush = async () => { await new Promise(resolve => {release = resolve;}); state.status = {state: 'saved'}; };
  const closing = flushHubModule(frame(state), state.moduleId, origin).then(() => {flushed = true;});
  await new Promise(setImmediate);
  assert.equal(flushed, false);
  release(); await closing;
  assert.equal(flushed, true);
});

test('navigation while readiness is pending cannot flush an obsolete document and permit leaving', async () => {
  const old = bridge(); let release, calls = 0;
  old.ready = new Promise(resolve => {release = resolve;}); old.flush = async () => {calls++;};
  const root = frame(old), leaving = flushHubModule(root, old.moduleId, origin);
  const replacement = bridge(); replacement.status = {state: 'pending'}; root.HubStorage = replacement;
  release();
  await assert.rejects(leaving, /页面已变化/);
  assert.equal(calls, 0); assert.equal(replacement.status.state, 'pending');
});

test('a rejected obsolete document cannot grant an empty-state exit to its replacement', async () => {
  const old = bridge(); let reject;
  old.ready = new Promise((_, fail) => {reject = fail;}); old.canLeaveWithoutSaving = true;
  const root = frame(old), leaving = flushHubModule(root, old.moduleId, origin);
  const replacement = bridge(); replacement.status = {state: 'pending'};
  root.HubStorage = replacement; reject(new Error('initialization failed'));
  await assert.rejects(leaving, /页面已变化/);
  assert.equal(replacement.status.state, 'pending');
});

test('Moonlit inner navigation during flush keeps the replacement document open and untouched', async () => {
  const old = bridge('moonlit-immortal-chronicle'); old.status = {state: 'pending'}; let release;
  old.flush = async () => {await new Promise(resolve => {release = resolve;});old.status = {state: 'saved'};};
  const inner = frame(old), root = frame(undefined, [inner]);
  const leaving = flushHubModule(root, old.moduleId, origin);
  await new Promise(setImmediate);
  const replacement = bridge(old.moduleId); replacement.status = {state: 'pending'}; let replacementCalls = 0;
  replacement.flush = async () => {replacementCalls++;}; inner.HubStorage = replacement;
  release();
  await assert.rejects(leaving, /页面已变化/);
  assert.equal(replacementCalls, 0); assert.equal(replacement.status.state, 'pending');
});

test('conflict or failed save stops the leave flow without choosing a copy or resetting data', async () => {
  const state = bridge(); let calls = 0;
  state.status = {state: 'conflict'}; state.flush = async () => {calls++;};
  await assert.rejects(flushHubModule(frame(state), state.moduleId, origin), /先选择/);
  assert.equal(calls, 0);
  state.status = {state: 'offline'}; state.flush = async () => {throw new Error('offline');};
  await assert.rejects(flushHubModule(frame(state), state.moduleId, origin), /offline/);
  assert.equal(state.status.state, 'offline');
});

test('native business modules never report a bridge flush as proof their records were saved', async () => {
  for (const id of ['zhiliu-radar', 'zhizheng-research', 'evopm-workbench', 'ai-dev-collaboration-workbench', 'roommate-housekeeper', 'unknown-new-app']) {
    assert.equal(hubStorageMode(id), 'native');
    await flushHubModule(null, id, origin);
  }
  assert.equal(hubStorageMode('starfall-creature-isles'), 'bridge');
  await assert.rejects(flushHubModule(null, 'starfall-creature-isles', origin), /尚未连接/);
});

test('novel settings and current workspace can leave without the legacy archive bridge', async () => {
  for (const path of ['/apps/novel-studio/canvas.html','/apps/novel-studio/consistency.html','/apps/novel-studio/model-settings.html','/apps/novel-studio/model-settings']) {
    const root=frame(undefined,[],{origin,pathname:path});
    let checked=0;root.HubBeforeLeave=()=>{checked++;return true;};
    assert.equal(hubStorageMode('novel-studio',root),'native');
    await flushHubModule(root,'novel-studio',origin);
    assert.equal(checked,1);
    root.HubBeforeLeave=()=>false;
    await assert.rejects(flushHubModule(root,'novel-studio',origin),{name:'AbortError'});
  }
});

test('the original novel document still flushes its own archive and rejects conflicts', async () => {
  const storage=bridge('novel-studio'),root=frame(storage,[],{origin,pathname:'/apps/novel-studio/index.html'});
  let flushed=0;storage.flush=async()=>{flushed++;};
  assert.equal(hubStorageMode('novel-studio',root),'bridge');
  await flushHubModule(root,'novel-studio',origin);assert.equal(flushed,1);
  storage.status={state:'conflict'};
  await assert.rejects(flushHubModule(root,'novel-studio',origin),/先选择/);
  assert.equal(flushed,1);
  for(const pathname of ['/apps/novel-studio/','/apps/novel-studio','/apps/novel-studio/index'])assert.equal(hubStorageMode('novel-studio',frame(storage,[],{origin,pathname})),'bridge','canonical index URL retains archive protection');
});

test('native draft guard is awaited once and cancellation preserves the open application', async () => {
  const root = frame(); let release, calls = 0, left = false;
  root.HubBeforeLeave = async () => { calls++; return new Promise(resolve => {release = resolve;}); };
  const leaving = flushHubModule(root, 'zhizheng-research', origin).then(() => {left = true;});
  await new Promise(setImmediate);
  assert.equal(left, false); assert.equal(calls, 1);
  release(false);
  await assert.rejects(leaving, {name: 'AbortError'});
  assert.equal(left, false); assert.equal(calls, 1);
  root.HubBeforeLeave = () => true;
  await flushHubModule(root, 'zhizheng-research', origin);
});

test('a failing or obsolete native draft guard cannot authorize navigation', async () => {
  const root = frame();
  root.HubBeforeLeave = async () => {throw new Error('保存尚未完成');};
  await assert.rejects(flushHubModule(root, 'zhiliu-radar', origin), /保存尚未完成/);
  let release;
  root.HubBeforeLeave = () => new Promise(resolve => {release = resolve;});
  const leaving = flushHubModule(root, 'zhiliu-radar', origin);
  root.document = {}; release(true);
  await assert.rejects(leaving, /页面已变化/);
});

test('a foreign frame cannot invoke a native draft guard or block hub navigation', async () => {
  const root = frame(undefined, [], {origin: 'https://foreign.test'});
  root.HubBeforeLeave = () => {throw new Error('must not call');};
  await flushHubModule(root, 'zhiliu-radar', origin);
});

test('cancelled navigation revokes native unload permission only in an accessible same-origin frame', async () => {
  const root = frame(); let permitted = false, cancellations = 0;
  root.HubBeforeLeave = () => {permitted = true; return true;};
  root.HubCancelLeave = function () {assert.equal(this, root); permitted = false; cancellations++;};
  await flushHubModule(root, 'zhizheng-research', origin);
  assert.equal(permitted, true);
  // The hub's subsequent preference save fails, so it keeps the module open.
  cancelHubModuleLeave(root, origin);
  assert.equal(permitted, false); assert.equal(cancellations, 1);
  root.location = {origin: 'https://foreign.test'};
  cancelHubModuleLeave(root, origin);
  assert.equal(cancellations, 1);
  assert.doesNotThrow(() => cancelHubModuleLeave({get location() {throw new Error('SecurityError');}}, origin));
  assert.doesNotThrow(() => cancelHubModuleLeave(null, origin));
});

test('cancellation cleanup cannot mask the original navigation failure', () => {
  const root = frame(); root.HubCancelLeave = () => {throw new Error('stale cleanup');};
  assert.doesNotThrow(() => cancelHubModuleLeave(root, origin));
});
