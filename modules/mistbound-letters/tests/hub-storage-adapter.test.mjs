import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudSave, LEGACY_KEY} from '../../../public/apps/mistbound-letters/cloud-save.js';
import {initialState} from '../../../public/apps/mistbound-letters/game.js';

function setup(values = {}) {
  const data = new Map(Object.entries(values));
  const storage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value))};
  let applied;
  let flushed = 0;
  let selected;
  let remote = initialState();
  const events = new EventTarget();
  const bridge = {
    ready: Promise.resolve(), status: {state: 'saved', revision: 1},
    flush: async () => {flushed += 1;},
    resolveConflict: async choice => {
      selected = choice;
      if (choice === 'cloud') storage.setItem(LEGACY_KEY, JSON.stringify(remote));
      bridge.status = {state: 'saved', revision: 2};
    },
  };
  globalThis.window = {
    HubStorage: bridge,
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args),
  };
  const cloud = new CloudSave({storage, apply: value => {applied = value;}});
  return {cloud, data, bridge, applied: () => applied, flushed: () => flushed, selected: () => selected, remote: value => {remote = value;}};
}

test('restores an existing canonical save before permitting play', async () => {
  const previous = {...initialState(), day: 9};
  const context = setup({[LEGACY_KEY]: JSON.stringify(previous)});
  await context.cloud.connect();
  assert.equal(context.cloud.canPlay, true);
  assert.equal(context.applied().day, 9);
  assert.deepEqual(context.cloud.record.save, previous);
  context.cloud.dispose();
});

test('keeps writes in the unified key and delegates flush to the shared bridge', async () => {
  const context = setup();
  await context.cloud.connect();
  const next = {...initialState(), day: 3};
  assert.equal(context.cloud.save(next), true);
  assert.equal(JSON.parse(context.data.get(LEGACY_KEY)).day, 3);
  await context.cloud.flush();
  assert.equal(context.flushed(), 1);
  context.cloud.dispose();
});

test('cloud conflict resolution backs up local progress then refreshes live game state', async () => {
  const context = setup({[LEGACY_KEY]: JSON.stringify({...initialState(), day: 4})});
  await context.cloud.connect();
  context.remote({...initialState(), day: 12});
  context.cloud.updateStatus({state: 'conflict', revision: 1});
  await context.cloud.resolve('remote');
  assert.equal(context.selected(), 'cloud');
  assert.equal(context.applied().day, 12);
  assert.equal(JSON.parse(context.data.get('mistbound-letters-backups-v1'))[0].save.day, 4);
  context.cloud.dispose();
});

test('a malformed imported save is retained and blocks default-state overwrites', async () => {
  const invalid = '{malformed';
  const context = setup({[LEGACY_KEY]: invalid});
  await context.cloud.connect();
  assert.equal(context.cloud.canPlay, false);
  assert.equal(context.cloud.save(initialState()), false);
  assert.equal(context.data.get(LEGACY_KEY), invalid);
  context.cloud.dispose();
});

test('offline gameplay remains locally persistent', async () => {
  const context = setup();
  context.bridge.status = {state: 'offline', revision: 1};
  await context.cloud.connect();
  assert.equal(context.cloud.save({...initialState(), day: 5}), true);
  assert.equal(JSON.parse(context.data.get(LEGACY_KEY)).day, 5);
  assert.match(context.cloud.status, /离线/);
  context.cloud.dispose();
});
