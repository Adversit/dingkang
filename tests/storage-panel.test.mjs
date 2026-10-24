import test from 'node:test';
import assert from 'node:assert/strict';
import {findModuleStorage, flushHubModule, hubStorageMode} from '../lib/hub/storage-panel.ts';

const origin = 'https://example.test';
function frame(bridge, frames = [], location = {origin}) { return {HubStorage: bridge, frames, location, document: {}}; }
function bridge(moduleId = 'starfall-creature-isles') {
  return {moduleId, ready: Promise.resolve(), status: {state: 'saved'}, flush: async () => {}};
}

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
