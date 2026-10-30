import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {flushHubModule} from '../lib/hub/storage-panel.ts';

const source = fs.readFileSync(new URL('../public/hub-storage.js', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const cacheKey = (user, module) => `hub.storage.v1:${encodeURIComponent(user)}:${encodeURIComponent(module)}`;
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => plain(body) });

function server() {
  return { user: 'alice', authenticated: true, records: new Map(), requests: [], puts: 0, failGet: false, failPut: false, failSession: false, beforePut: null, gateGet: null };
}
function record(s, module = 'aipm-studio-dk', user = s.user) {
  const key = `${user}/${module}`;
  if (!s.records.has(key)) s.records.set(key, { values: {}, revision: 0, updatedAt: null });
  return s.records.get(key);
}
function environment(s = server(), { module = 'aipm-studio-dk', raw = new Map(), rejectWrite = () => false } = {}) {
  class FakeStorage {
    constructor(map = new Map()) { Object.defineProperty(this, '_map', { value: map }); }
    getItem(key) { key = String(key); return this._map.has(key) ? this._map.get(key) : null; }
    setItem(key, value) { if (rejectWrite(String(key))) throw new Error('Storage quota exceeded'); this._map.set(String(key), String(value)); }
    removeItem(key) { this._map.delete(String(key)); }
    clear() { this._map.clear(); }
    key(index) { return [...this._map.keys()][Number(index) >>> 0] ?? null; }
    get length() { return this._map.size; }
  }
  const events = [], reloads = [], listeners = new Map(), timers = new Map();
  let timerId = 0;
  const document = {currentScript: {getAttribute: name => name === 'data-module' ? module : null}};
  const window = {
    localStorage: new FakeStorage(raw), sessionStorage: new FakeStorage(),
    document, frames: [], location: {origin: 'https://example.test', reload: () => { reloads.push(true); }},
    dispatchEvent(event) { events.push(event); return true; },
    addEventListener(name, fn) { listeners.set(name, fn); }
  };
  const fetch = async (url, options = {}) => {
    s.requests.push({ url, options });
    if (url === '/api/hub/session') {
      if (s.failSession) throw new TypeError('offline');
      return response(200, { authenticated: s.authenticated, userId: s.user, displayName: s.user });
    }
    assert.equal(url, `/api/hub/state/${module}`);
    if (options.method === 'PUT') {
      // Model the browser Fetch keepalive budget, not the larger server limit.
      if (options.keepalive && Buffer.byteLength(options.body, 'utf8') > 64 * 1024) throw new TypeError('keepalive body exceeds browser quota');
      s.puts += 1;
      if (s.beforePut) await s.beforePut();
    } else if (s.gateGet) await s.gateGet;
    if (options.headers['X-Hub-User-Id'] !== s.user || !s.authenticated) return response(401, { error: 'identity_changed' });
    const item = record(s, module);
    if (options.method === 'PUT') {
      if (s.failPut) throw new TypeError('offline');
      const body = JSON.parse(options.body);
      if (body.expectedRevision !== item.revision) return response(409, item);
      item.values = body.values;
      item.revision += 1;
      item.updatedAt = `t${item.revision}`;
      return response(200, item);
    }
    if (s.failGet) throw new TypeError('offline');
    return response(200, item);
  };
  const context = vm.createContext({
    window, document,
    Storage: FakeStorage, fetch, TextEncoder,
    CustomEvent: class { constructor(type, { detail }) { this.type = type; this.detail = detail; } },
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(source, context);
  return { window, bridge: window.HubStorage, local: window.localStorage, session: window.sessionStorage, raw, events, reloads, listeners, timers, context };
}
function cache(raw, user, module, values, revision, pending = false) {
  raw.set(cacheKey(user, module), JSON.stringify({ version: 1, userId: user, moduleId: module, initialized: true, values, revision, updatedAt: `t${revision}`, pending }));
}

test('cloud restoration happens before ready, with reads and writes blocked during hydration', async () => {
  const s = server();
  let release;
  s.gateGet = new Promise(resolve => { release = resolve; });
  record(s).values = { 'aipm-studio.v1': 'cloud-records' };
  record(s).revision = 4;
  const e = environment(s);
  assert.equal(e.bridge.status.state, 'loading');
  assert.throws(() => e.local.getItem('aipm-studio.v1'), { name: 'InvalidStateError' });
  assert.throws(() => e.local.setItem('aipm-studio.v1', 'default'), { name: 'InvalidStateError' });
  release();
  await e.bridge.ready;
  assert.equal(e.local.getItem('aipm-studio.v1'), 'cloud-records');
  assert.equal(e.bridge.status.revision, 4);
  assert.equal(s.puts, 0);
});

test('legacy keys stay logical while every localStorage operation is module scoped', async () => {
  const raw = new Map([['root-preference', 'keep'], ['aipm-studio.v1', 'unclaimed-legacy']]);
  cache(raw, 'bob', 'aipm-studio-dk', { secret: 'bob' }, 1);
  cache(raw, 'alice', 'another-game', { secret: 'other-game' }, 2);
  const e = environment(server(), { raw });
  await e.bridge.ready;
  assert.equal(e.local.length, 0);
  assert.equal(e.local.getItem('aipm-studio.v1'), null);
  e.local.setItem('aipm-studio.v1', 'mine');
  e.local.setItem('', 42);
  assert.equal(e.local.length, 2);
  assert.equal(e.local.key(1), '');
  assert.equal(e.local.getItem(''), '42');
  assert.equal(e.local.key(4), null);
  e.local.removeItem('');
  assert.equal(e.local.length, 1);
  e.local.clear();
  assert.equal(e.local.length, 0);
  assert.equal(raw.get('root-preference'), 'keep');
  assert.equal(raw.get('aipm-studio.v1'), 'unclaimed-legacy');
  assert.equal(JSON.parse(raw.get(cacheKey('bob', 'aipm-studio-dk'))).values.secret, 'bob');
  assert.equal(JSON.parse(raw.get(cacheKey('alice', 'another-game'))).values.secret, 'other-game');
  e.session.setItem('untouched', 'yes');
  assert.equal(e.session.getItem('untouched'), 'yes');
  assert.equal(e.session.length, 1);
  e.session.clear();
  assert.equal(e.session.length, 0);
});

test('flush uses server revision CAS and publishes pending then saved', async () => {
  const s = server(), e = environment(s);
  await e.bridge.ready;
  e.local.setItem('save', 'v1');
  assert.equal(e.bridge.status.state, 'pending');
  await e.bridge.flush();
  assert.deepEqual(record(s), { values: { save: 'v1' }, revision: 1, updatedAt: 't1' });
  assert.equal(e.bridge.status.state, 'saved');
  assert.equal(JSON.parse(e.raw.get(cacheKey('alice', 'aipm-studio-dk'))).pending, false);
  assert.ok(e.events.some(event => event.type === 'hub-storage-status' && event.detail.state === 'saved'));
  const put = s.requests.find(item => item.options.method === 'PUT');
  assert.equal(put.options.headers['X-Hub-User-Id'], 'alice');
  assert.equal(JSON.parse(put.options.body).expectedRevision, 0);
});

test('same-value writes and removing missing keys do not create cloud writes', async () => {
  const s = server(); record(s).values = { save: 'v1' };
  const e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'v1'); e.local.removeItem('missing');
  await e.bridge.flush();
  assert.equal(s.puts, 0);
});

test('large UTF-8 saves use the normal request path and survive an offline retry', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  const saved = '校园笔记'.repeat(18000);
  assert.ok(Buffer.byteLength(saved, 'utf8') > 64 * 1024);
  e.local.setItem('notes', saved); s.failPut = true;
  await assert.rejects(e.bridge.flush(), /offline/);
  assert.ok(JSON.parse(e.raw.get(cacheKey('alice', 'aipm-studio-dk'))).values.notes === saved);
  s.failPut = false; await e.bridge.flush();
  assert.ok(record(s).values.notes === saved);
  assert.equal(e.bridge.status.state, 'saved');
  assert.ok(s.requests.filter(item => item.options.method === 'PUT').every(item => !item.options.keepalive));
});

test('pagehide uses keepalive only for a body that fits the browser byte budget', async () => {
  for (const [value, keepalive] of [['small', true], ['汉'.repeat(24000), false]]) {
    const s = server(), e = environment(s); await e.bridge.ready;
    e.local.setItem('save', value);
    e.listeners.get('pagehide')();
    await new Promise(setImmediate);
    assert.ok(record(s).values.save === value);
    assert.equal(s.requests.find(item => item.options.method === 'PUT').options.keepalive, keepalive);
    assert.equal(e.bridge.status.state, 'saved');
  }
});

test('a failed initial cloud restore cannot upload an empty or default object', async () => {
  const s = server(); s.failGet = true;
  const e = environment(s);
  await assert.rejects(e.bridge.ready, /offline/);
  assert.throws(() => e.local.setItem('save', 'default'), { name: 'InvalidStateError' });
  await assert.rejects(e.bridge.flush());
  assert.equal(s.puts, 0);
  assert.equal(e.raw.size, 0);
});

test('a guest or empty initialization failure can return to the hub without saving defaults', async () => {
  for (const mode of ['guest', 'session-offline', 'state-offline']) {
    const s = server();
    if (mode === 'guest') s.authenticated = false;
    if (mode === 'session-offline') s.failSession = true;
    if (mode === 'state-offline') s.failGet = true;
    const e = environment(s);
    assert.equal(e.bridge.canLeaveWithoutSaving, false, 'loading alone is not proof of a failed empty initialization');
    await assert.rejects(e.bridge.ready);
    assert.equal(e.bridge.canLeaveWithoutSaving, true);
    assert.throws(() => e.local.setItem('save', 'defaults'), {name: 'InvalidStateError'});
    await flushHubModule(e.window, 'aipm-studio-dk', 'https://example.test');
    assert.equal(s.puts, 0); assert.equal(e.raw.size, 0);
  }
});

test('hydrated state, queued edits, conflicts and expired accounts cannot use the empty-failure exit', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  assert.equal(e.bridge.canLeaveWithoutSaving, false);
  e.local.setItem('save', 'keep-local'); s.failPut = true;
  await assert.rejects(flushHubModule(e.window, 'aipm-studio-dk', 'https://example.test'), /offline/);
  assert.equal(e.bridge.canLeaveWithoutSaving, false);
  s.failPut = false; record(s).values = {save: 'remote'}; record(s).revision = 1;
  await assert.rejects(flushHubModule(e.window, 'aipm-studio-dk', 'https://example.test'), {name: 'ConflictError'});
  assert.equal(e.bridge.canLeaveWithoutSaving, false);
  await e.bridge.resolveConflict('local');
  e.local.setItem('save', 'new-local'); s.authenticated = false;
  await assert.rejects(flushHubModule(e.window, 'aipm-studio-dk', 'https://example.test'), {name: 'SecurityError'});
  assert.equal(e.bridge.canLeaveWithoutSaving, false);
  assert.equal(JSON.parse(e.raw.get(cacheKey('alice', 'aipm-studio-dk'))).values.save, 'new-local');
});

test('a pending account cache cannot be treated as an empty initialization after access fails', async () => {
  const s = server(), raw = new Map();
  cache(raw, 'alice', 'aipm-studio-dk', {save: 'pending-device-copy'}, 3, true);
  let release; s.gateGet = new Promise(resolve => {release = resolve;});
  const e = environment(s, {raw});
  await new Promise(setImmediate);
  s.authenticated = false; release();
  await assert.rejects(e.bridge.ready, {name: 'SecurityError'});
  assert.equal(e.bridge.canLeaveWithoutSaving, false);
  await assert.rejects(flushHubModule(e.window, 'aipm-studio-dk', 'https://example.test'), {name: 'SecurityError'});
  assert.equal(JSON.parse(raw.get(cacheKey('alice', 'aipm-studio-dk'))).values.save, 'pending-device-copy');
  assert.equal(s.puts, 0);
});

test('an account restored from an offline cache must still reconnect or save before leaving', async () => {
  const s = server(), raw = new Map(); s.failGet = true;
  cache(raw, 'alice', 'aipm-studio-dk', {save: 'loaded-cache'}, 3, false);
  const e = environment(s, {raw}); await e.bridge.ready;
  assert.equal(e.local.getItem('save'), 'loaded-cache');
  assert.equal(e.bridge.canLeaveWithoutSaving, false);
  await assert.rejects(flushHubModule(e.window, 'aipm-studio-dk', 'https://example.test'), /尚未同步/);
  assert.equal(e.local.getItem('save'), 'loaded-cache');
});

test('an offline authenticated account can use only its initialized cache and queue edits', async () => {
  const s = server(), raw = new Map(); s.failGet = true;
  cache(raw, 'alice', 'aipm-studio-dk', { save: 'cached' }, 3);
  const e = environment(s, { raw }); await e.bridge.ready;
  assert.equal(e.local.getItem('save'), 'cached');
  assert.equal(e.bridge.status.state, 'offline');
  e.local.setItem('save', 'edited-offline'); s.failPut = true;
  await assert.rejects(e.bridge.flush(), /offline/);
  assert.equal(JSON.parse(raw.get(cacheKey('alice', 'aipm-studio-dk'))).pending, true);
  assert.equal(e.bridge.status.state, 'offline');
  s.failPut = false; s.failGet = false;
  record(s).revision = 3;
  await e.bridge.flush();
  assert.equal(record(s).values.save, 'edited-offline');
});

test('another account never adopts existing local data or an unscoped legacy key', async () => {
  const s = server(), raw = new Map([['save', 'legacy-personal-data']]);
  cache(raw, 'alice', 'aipm-studio-dk', { save: 'alice-private' }, 1, true);
  s.user = 'bob';
  const e = environment(s, { raw }); await e.bridge.ready;
  assert.equal(e.local.getItem('save'), null);
  assert.equal(e.bridge.userId, 'bob');
  assert.equal(s.puts, 0);
  assert.equal(JSON.parse(raw.get(cacheKey('alice', 'aipm-studio-dk'))).values.save, 'alice-private');
});

test('session failure does not use any cached account automatically', async () => {
  const s = server(), raw = new Map(); s.failSession = true;
  cache(raw, 'alice', 'aipm-studio-dk', { save: 'private' }, 1);
  const e = environment(s, { raw }); await assert.rejects(e.bridge.ready, /offline/);
  assert.equal(e.bridge.userId, null);
  assert.throws(() => e.local.getItem('save'), { name: 'InvalidStateError' });
  assert.equal(s.puts, 0);
});

test('changing accounts after initialization blocks pending writes before PUT', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'alice-data'); s.user = 'bob';
  await assert.rejects(e.bridge.flush(), { name: 'SecurityError' });
  assert.equal(s.puts, 0);
  assert.equal(e.bridge.status.state, 'error');
  assert.throws(() => e.local.getItem('save'), { name: 'SecurityError' });
});

test('identity header blocks account switches between session check and state PUT', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'alice-data');
  s.beforePut = async () => { s.user = 'bob'; };
  await assert.rejects(e.bridge.flush(), { name: 'SecurityError' });
  assert.deepEqual(record(s, 'aipm-studio-dk', 'bob').values, {});
});

test('CAS conflicts never overwrite cloud, and cloud resolution adopts the current server', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'local');
  record(s).values = { save: 'remote' }; record(s).revision = 1;
  await assert.rejects(e.bridge.flush(), { name: 'ConflictError' });
  assert.equal(e.bridge.status.state, 'conflict');
  assert.equal(record(s).values.save, 'remote');
  assert.equal(e.local.getItem('save'), 'local');
  await assert.rejects(e.bridge.flush(), { name: 'ConflictError' });
  assert.equal(s.puts, 1);
  record(s).values.save = 'remote-newer'; record(s).revision = 2;
  await e.bridge.resolveConflict('cloud');
  assert.equal(e.local.getItem('save'), 'remote-newer');
  assert.equal(e.bridge.status.revision, 2);
  assert.equal(e.bridge.status.state, 'saved');
});

test('explicit local conflict resolution retries against the known remote revision', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'local');
  record(s).values = { save: 'remote' }; record(s).revision = 1;
  await assert.rejects(e.bridge.flush(), { name: 'ConflictError' });
  await e.bridge.resolveConflict('local');
  assert.equal(record(s).values.save, 'local');
  assert.equal(record(s).revision, 2);
});

test('queued cache restores against its base revision, but divergent cloud requires review', async () => {
  const s = server(), raw = new Map();
  cache(raw, 'alice', 'aipm-studio-dk', { save: 'queued' }, 2, true);
  record(s).values = { save: 'remote-new' }; record(s).revision = 3;
  const e = environment(s, { raw }); await e.bridge.ready;
  assert.equal(e.bridge.status.state, 'conflict');
  assert.equal(e.local.getItem('save'), 'queued');
  assert.equal(s.puts, 0);
});

test('queued changes matching cloud after a lost response reconcile without rewriting', async () => {
  const s = server(), raw = new Map();
  cache(raw, 'alice', 'aipm-studio-dk', { save: 'already-written' }, 2, true);
  record(s).values = { save: 'already-written' }; record(s).revision = 3;
  const e = environment(s, { raw }); await e.bridge.ready;
  assert.equal(e.bridge.status.state, 'saved');
  assert.equal(e.bridge.status.revision, 3);
  assert.equal(s.puts, 0);
});

test('edits made during a cloud write remain pending and save with the next revision', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'first');
  let release;
  const entered = new Promise(resolve => {
    s.beforePut = async () => { resolve(); await new Promise(r => { release = r; }); };
  });
  const first = e.bridge.flush(); await entered;
  e.local.setItem('save', 'second');
  s.beforePut = null; release();
  await first;
  assert.equal(e.bridge.status.state, 'saved');
  assert.equal(e.local.getItem('save'), 'second');
  assert.equal(record(s).values.save, 'second');
  assert.equal(record(s).revision, 2);
});

test('import/export retain valid legacy string keys and reject values the server cannot accept', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  const imported = {toString: 'legacy', save: 'json-string'};
  for (const input of [JSON.parse('{"__proto__":"legacy"}'), {'': 'empty'}, {constructor: 'invalid'}, {['k'.repeat(201)]: 'long'}]) {
    await assert.rejects(e.bridge.importData(input), /存档键/);
  }
  await assert.rejects(e.bridge.importData({save: '汉'.repeat(180000)}), /512 KiB/);
  await assert.rejects(e.bridge.importData(Object.fromEntries(Array.from({length:201},(_,i)=>['key'+i,'save']))), /200/);
  assert.deepEqual(plain(e.bridge.exportData().values), {});
  assert.equal(s.puts, 0);
  await e.bridge.importData(imported);
  const exported = plain(e.bridge.exportData());
  assert.deepEqual(exported.values, imported);
  assert.equal(exported.moduleId, 'aipm-studio-dk');
  assert.equal(exported.revision, 1);
  exported.values.save = 'outside-mutation';
  assert.equal(e.local.getItem('save'), 'json-string');
  await assert.rejects(e.bridge.importData({ bad: 42 }), /string/);
});

test('running module autosaves cannot replace an import while it is saving or reloading', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'old-running-game'); await e.bridge.flush();
  let release;
  const entered = new Promise(resolve => {
    s.beforePut = async () => { resolve(); await new Promise(r => {release = r;}); };
  });
  const imported = e.bridge.importData({save: 'imported-game'}); await entered;
  assert.throws(() => e.local.setItem('save', 'old-running-game'), {name: 'InvalidStateError'});
  assert.throws(() => e.local.removeItem('save'), {name: 'InvalidStateError'});
  assert.throws(() => e.local.clear(), {name: 'InvalidStateError'});
  await assert.rejects(e.bridge.importData({save: 'racing-import'}), {name: 'InvalidStateError'});
  s.beforePut = null; release(); await imported;
  assert.equal(record(s).values.save, 'imported-game');
  assert.equal(e.reloads.length, 1);
  assert.throws(() => e.local.setItem('save', 'old-unload-handler'), {name: 'InvalidStateError'});
  const reloaded = environment(s, {raw: e.raw}); await reloaded.bridge.ready;
  assert.equal(reloaded.local.getItem('save'), 'imported-game');
  reloaded.local.setItem('save', 'new-game-progress'); await reloaded.bridge.flush();
  assert.equal(record(s).values.save, 'new-game-progress');
});

test('an unresolved cloud conflict prevents import from replacing the local recovery candidate', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'pending-local'); record(s).values = {save: 'new-cloud'}; record(s).revision = 1;
  await assert.rejects(e.bridge.flush(), {name: 'ConflictError'});
  await assert.rejects(e.bridge.importData({save: 'imported'}), {name: 'ConflictError'});
  assert.equal(e.local.getItem('save'), 'pending-local');
  assert.equal(record(s).values.save, 'new-cloud');
});


test('cloud conflict resolution and successful import reload only the module after saving', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  assert.equal(e.reloads.length, 0);
  e.local.setItem('save', 'local');
  record(s).values = { save: 'remote' }; record(s).revision = 1;
  await assert.rejects(e.bridge.flush(), { name: 'ConflictError' });
  await e.bridge.resolveConflict('cloud');
  assert.equal(e.reloads.length, 1);
  assert.ok(e.events.some(event => event.type === 'hub-storage-reload' && event.detail.reason === 'cloud'));
  await e.bridge.importData({ save: 'imported' });
  assert.equal(record(s).values.save, 'imported');
  assert.equal(e.reloads.length, 2);
  assert.ok(e.events.some(event => event.type === 'hub-storage-reload' && event.detail.reason === 'import'));
});

test('local conflict resolution and failed imports do not reload the running module', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'local');
  record(s).values = { save: 'remote' }; record(s).revision = 1;
  await assert.rejects(e.bridge.flush(), { name: 'ConflictError' });
  await e.bridge.resolveConflict('local');
  assert.equal(e.reloads.length, 0);
  s.failPut = true;
  await assert.rejects(e.bridge.importData({ save: 'not-synced' }), /offline/);
  assert.equal(e.reloads.length, 0);
  e.local.setItem('save', 'continued-after-failed-import');
  s.failPut = false; await e.bridge.flush();
  assert.equal(record(s).values.save, 'continued-after-failed-import');
});


test('import waits for earlier autosaves and its own snapshot before requesting a reload', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'first');
  let release;
  const entered = new Promise(resolve => {
    s.beforePut = async () => { resolve(); await new Promise(r => { release = r; }); };
  });
  const first = e.bridge.flush(); await entered;
  const imported = e.bridge.importData({ save: 'imported' });
  assert.equal(e.reloads.length, 0);
  s.beforePut = null; release();
  await Promise.all([first, imported]);
  assert.equal(record(s).values.save, 'imported');
  assert.equal(record(s).revision, 2);
  assert.equal(e.reloads.length, 1);
});

test('choosing cloud preserves pending values and game backups outside the replaced map across reloads', async () => {
  const s = server(), raw = new Map();
  const e = environment(s, {raw, module: 'mistbound-letters'}); await e.bridge.ready;
  e.local.setItem('mistbound-letters-v1', 'local-journey');
  e.local.setItem('mistbound-letters-backups-v1', 'older-game-backups');
  record(s, 'mistbound-letters').values = {'mistbound-letters-v1': 'cloud-journey'};
  record(s, 'mistbound-letters').revision = 2;
  await assert.rejects(e.bridge.flush(), {name: 'ConflictError'});
  await e.bridge.resolveConflict('cloud');
  assert.equal(e.local.getItem('mistbound-letters-v1'), 'cloud-journey');
  assert.equal(e.local.getItem('mistbound-letters-backups-v1'), null);
  const expected = {moduleId: 'mistbound-letters', values: {'mistbound-letters-v1': 'local-journey', 'mistbound-letters-backups-v1': 'older-game-backups'}, revision: 0};
  assert.deepEqual(plain(e.bridge.exportRecoveryData()), expected);
  assert.equal(e.local.length, 1, 'the recovery snapshot is not a logical game key');
  const reloaded = environment(s, {raw, module: 'mistbound-letters'}); await reloaded.bridge.ready;
  assert.deepEqual(plain(reloaded.bridge.exportRecoveryData()), expected);
  reloaded.local.clear(); await reloaded.bridge.flush();
  assert.deepEqual(plain(reloaded.bridge.exportRecoveryData()), expected, 'game clear cannot erase recovery');
  await reloaded.bridge.importData(reloaded.bridge.exportRecoveryData().values);
  assert.deepEqual(record(s, 'mistbound-letters').values, expected.values, 'recovery uses the standard import flow');
});

test('recovery copies are isolated by account and module and returned as independent objects', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'alice-local'); record(s).values = {save: 'remote'}; record(s).revision = 1;
  await assert.rejects(e.bridge.flush(), {name: 'ConflictError'});
  await e.bridge.resolveConflict('cloud');
  e.bridge.exportRecoveryData().values.save = 'mutated';
  assert.equal(e.bridge.exportRecoveryData().values.save, 'alice-local');
  const otherModule = environment(s, {raw: e.raw, module: 'another-game'}); await otherModule.bridge.ready;
  assert.equal(otherModule.bridge.exportRecoveryData(), null);
  s.user = 'bob';
  const otherUser = environment(s, {raw: e.raw}); await otherUser.bridge.ready;
  assert.equal(otherUser.bridge.exportRecoveryData(), null);
});

test('a failed recovery write keeps the local conflict intact and never reloads or adopts cloud', async () => {
  const s = server(), e = environment(s, {rejectWrite: key => key.endsWith(':recovery')}); await e.bridge.ready;
  e.local.setItem('save', 'irreplaceable-local');
  record(s).values = {save: 'remote'}; record(s).revision = 3;
  await assert.rejects(e.bridge.flush(), {name: 'ConflictError'});
  await assert.rejects(e.bridge.resolveConflict('cloud'), {name: 'RecoveryBackupError'});
  assert.equal(e.local.getItem('save'), 'irreplaceable-local');
  assert.equal(e.bridge.status.state, 'conflict');
  assert.equal(e.bridge.status.revision, 0);
  assert.equal(e.reloads.length, 0);
  assert.equal(JSON.parse(e.raw.get(cacheKey('alice', 'aipm-studio-dk'))).values.save, 'irreplaceable-local');
  assert.equal(JSON.parse(e.raw.get(cacheKey('alice', 'aipm-studio-dk'))).pending, true);
  assert.equal(record(s).values.save, 'remote');
});

test('concurrent cloud choices cannot replace the recovery copy with cloud data', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  e.local.setItem('save', 'local'); record(s).values = {save: 'remote'}; record(s).revision = 1;
  await assert.rejects(e.bridge.flush(), {name: 'ConflictError'});
  let release; s.gateGet = new Promise(resolve => { release = resolve; });
  const first = e.bridge.resolveConflict('cloud'), second = e.bridge.resolveConflict('cloud');
  await new Promise(setImmediate);
  e.local.setItem('save', 'latest-local-during-fetch');
  release(); await Promise.all([first, second]);
  assert.equal(e.bridge.exportRecoveryData().values.save, 'latest-local-during-fetch');
  assert.equal(e.reloads.length, 1);
  assert.equal(e.local.getItem('save'), 'remote');
});

test('later conflicts retain the most recent discarded local snapshot', async () => {
  const s = server(), e = environment(s); await e.bridge.ready;
  for (const [local, remote, revision] of [['first-local', 'first-cloud', 1], ['second-local', 'second-cloud', 2]]) {
    e.local.setItem('save', local); record(s).values = {save: remote}; record(s).revision = revision;
    await assert.rejects(e.bridge.flush(), {name: 'ConflictError'});
    await e.bridge.resolveConflict('cloud');
    assert.equal(e.bridge.exportRecoveryData().values.save, local);
  }
  assert.equal([...e.raw.keys()].filter(key => key.endsWith(':recovery')).length, 1);
});

test('course and review keys hydrate together, preserve other notes and stay isolated after an account switch', async () => {
  const module = 'agent-architecture-journey', s = server(), raw = new Map();
  const course = JSON.stringify({version: 1, progress: {'week-1': true}, notes: {'week-1': '已完成阅读'}});
  const review = JSON.stringify({version: 1, reviewed: ['agent-tools']});
  const initial = {'cs146s.learning-lab.v1': course, 'agent-learning-review-v1': review, 'agent-reading-position': 'chapter-3'};
  Object.assign(record(s, module), {values: initial, revision: 5, updatedAt: 't5'});
  let release; s.gateGet = new Promise(resolve => {release = resolve;});
  const e = environment(s, {module, raw});
  assert.throws(() => e.local.getItem('cs146s.learning-lab.v1'), {name: 'InvalidStateError'});
  assert.throws(() => e.local.setItem('agent-learning-review-v1', '{}'), {name: 'InvalidStateError'});
  release(); await e.bridge.ready;
  assert.equal(e.local.getItem('cs146s.learning-lab.v1'), course);
  assert.equal(e.local.getItem('agent-learning-review-v1'), review);
  assert.equal(s.puts, 0, 'hydration must not replace restored progress with defaults');
  const revised = JSON.stringify({version: 1, reviewed: ['agent-tools', 'agent-memory']});
  e.local.setItem('agent-learning-review-v1', revised); await e.bridge.flush();
  assert.deepEqual(record(s, module).values, {...initial, 'agent-learning-review-v1': revised});
  assert.deepEqual(plain(e.bridge.exportData().values), record(s, module).values);
  s.user = 'bob';
  const bob = environment(s, {module, raw}); await bob.bridge.ready;
  assert.equal(bob.local.getItem('cs146s.learning-lab.v1'), null);
  assert.equal(bob.local.getItem('agent-learning-review-v1'), null);
  bob.local.setItem('cs146s.learning-lab.v1', '{"version":1,"progress":{}}'); await bob.bridge.flush();
  assert.equal(record(s, module, 'alice').values['cs146s.learning-lab.v1'], course);
  assert.equal(record(s, module, 'alice').values['agent-learning-review-v1'], revised);
  assert.notEqual(record(s, module, 'bob').values['cs146s.learning-lab.v1'], course);
});
