import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(`
CREATE TABLE hub_states(owner_id TEXT NOT NULL,module_id TEXT NOT NULL,values_json TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(owner_id,module_id));
CREATE TABLE hub_state_versions(owner_id TEXT NOT NULL,module_id TEXT NOT NULL,revision INTEGER NOT NULL,values_json TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(owner_id,module_id,revision));
CREATE TABLE hub_files(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,module_id TEXT NOT NULL,object_key TEXT NOT NULL UNIQUE,name TEXT NOT NULL,mime_type TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL);
`);
function statement(sql, args = []) {
  return {
    bind(...values) { return statement(sql, values); },
    async first() { return sqlite.prepare(sql).get(...args) || null; },
    async all() { return { results: sqlite.prepare(sql).all(...args), success: true, meta: { changes: 0 } }; },
    async run() { const result = sqlite.prepare(sql).run(...args); return { results: [], success: true, meta: { changes: Number(result.changes) } }; },
  };
}
const objects = new Map();
const fakeBucket = {
  async put(key, data) { objects.set(key, new Uint8Array(await data.arrayBuffer())); },
  async get(key) { const bytes = objects.get(key); return bytes ? { body: new Blob([bytes]).stream() } : null; },
  async delete(key) { objects.delete(key); },
  async head(key) { return objects.has(key) ? { size: objects.get(key).length } : null; },
};
globalThis.__hubTestEnv = { DB: {
  prepare: statement,
  async batch(statements) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const item of statements) results.push(await item.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
}, BUCKET: fakeBucket };
function moduleUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64');
}
const serverSource = fs.readFileSync(path.join(root, 'lib/hub/server.ts'), 'utf8').replace("import { env } from 'cloudflare:workers';", 'const env = globalThis.__hubTestEnv;');
const serverUrl = moduleUrl(serverSource);
const server = await import(serverUrl);
async function route(relative) {
  return import(moduleUrl(fs.readFileSync(path.join(root, 'app/api/hub', relative, 'route.ts'), 'utf8').replaceAll("'@/lib/hub/server'", JSON.stringify(serverUrl))));
}
const session = await route('session'), state = await route('state/[moduleId]'), files = await route('files'), file = await route('files/[id]'), imports = await route('import'), exports = await route('export'), health = await route('health');
const origin = 'https://hub.test';
const activeModule = 'yunque-sanguo';
const context = { params: Promise.resolve({ moduleId: activeModule }) };
function req(url = '/api/hub/state/yunque-sanguo', { user = 'alice', method = 'GET', body, headers = {}, form } = {}) {
  const requestHeaders = { ...(user ? { 'oai-authenticated-user-id': user, 'oai-authenticated-user-email': user + '@test.invalid', 'x-hub-user-id': user } : {}), ...(['POST', 'PUT', 'DELETE'].includes(method) ? { origin } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers };
  return new Request(origin + url, { method, headers: requestHeaders, ...(body ? { body: JSON.stringify(body) } : form ? { body: form } : {}) });
}
async function json(response, expected = 200) { assert.equal(response.status, expected); return response.json(); }

test('platform session, account switch and mutation boundaries', async () => {
  assert.equal((await json(await session.GET(req('/api/hub/session', { user: null })))).authenticated, false);
  assert.equal((await json(await session.GET(req('/api/hub/session')))).userId, 'alice');
  await json(await session.GET(req('/api/hub/session', { headers: { 'x-hub-user-id': 'bob' } })), 401);
  await json(await state.GET(req(undefined, { user: null }), context), 401);
  await json(await state.PUT(req(undefined, { method: 'PUT', body: { values: {}, expectedRevision: 0 }, headers: { origin: 'https://other.test' } }), context), 403);
});

test('state CAS is atomic, rejects stale writes and isolates users/modules', async () => {
  assert.deepEqual(await json(await state.GET(req(), context)), { values: {}, revision: 0, updatedAt: null });
  const first = await json(await state.PUT(req(undefined, { method: 'PUT', body: { values: { game: 'first' }, expectedRevision: 0 } }), context));
  assert.equal(first.revision, 1);
  const second = await json(await state.PUT(req(undefined, { method: 'PUT', body: { values: { game: 'second' }, expectedRevision: 1 } }), context));
  assert.equal(second.revision, 2);
  const conflict = await json(await state.PUT(req(undefined, { method: 'PUT', body: { values: { game: 'stale' }, expectedRevision: 1 } }), context), 409);
  assert.deepEqual(conflict.current.values, { game: 'second' });
  assert.equal((await json(await state.GET(req(undefined, { user: 'bob' }), context))).revision, 0);
  assert.equal((await server.readState('alice', 'mistbound-letters')).revision, 0);
  await json(await state.GET(req(), { params: Promise.resolve({ moduleId: 'unknown' }) }), 404);
});

test('20 prior revisions remain readable without mutating the current state', async () => {
  for (let revision = 2; revision < 26; revision++) await server.writeState('alice', activeModule, { expectedRevision: revision, values: { game: 'version-' + (revision + 1) } });
  const history = await json(await state.GET(req('/api/hub/state/yunque-sanguo?history=1'), context));
  assert.equal(history.revision, 26); assert.equal(history.history.length, 20);
  assert.equal(history.history[0].revision, 25); assert.equal(history.history.at(-1).revision, 6);
  const old = await json(await state.GET(req('/api/hub/state/yunque-sanguo?revision=25'), context));
  assert.equal(old.values.game, 'version-25'); assert.equal((await server.readState('alice', activeModule)).revision, 26);
  await json(await state.GET(req('/api/hub/state/yunque-sanguo?revision=1'), context), 404);
});

test('input limits reject invalid keys, non-string values and oversized uploads', async () => {
  await json(await state.PUT(req(undefined, { method: 'PUT', body: { expectedRevision: 26, values: { number: 42 } } }), context), 400);
  await json(await state.PUT(req(undefined, { method: 'PUT', body: { expectedRevision: 26, values: { large: 'a'.repeat(512 * 1024 + 1) } } }), context), 413);
  await json(await state.PUT(req(undefined, { method: 'PUT', body: { expectedRevision: -1, values: {} } }), context), 400);
  await json(await files.POST(req('/api/hub/files', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=test', 'content-length': String(27 * 1024 * 1024) } })), 413);
  assert.equal((await server.readState('alice', activeModule)).revision, 26);
});

test('import uses CAS and export contains only this user unified states', async () => {
  await server.writeState('bob', activeModule, { expectedRevision: 0, values: { private: 'bob-only' } });
  const body = { moduleId: activeModule, expectedRevision: 26, values: { game: 'imported' } };
  assert.equal((await json(await imports.POST(req('/api/hub/import', { method: 'POST', body })))).revision, 27);
  await json(await imports.POST(req('/api/hub/import', { method: 'POST', body })), 409);
  const backup = await json(await exports.GET(req('/api/hub/export')));
  assert.equal(backup.format, 'dingkang-hub-state-backup'); assert.equal(backup.version, 1);
  assert.equal(backup.modules.length, 1); assert.equal(backup.modules[0].values.game, 'imported');
  assert.ok(!JSON.stringify(backup).includes('bob-only'));
});

test('files are private, downloaded as attachments and deleted only by owner', async () => {
  const form = new FormData(); form.set('moduleId', activeModule); form.set('file', new File(['<svg onload="alert(1)"/>'], 'example.svg', { type: 'image/svg+xml' }));
  const result = await json(await files.POST(req('/api/hub/files', { method: 'POST', form })), 201);
  const fileContext = { params: Promise.resolve({ id: result.file.id }) };
  assert.equal(result.file.name, 'example.svg'); assert.equal(result.file.mimeType, 'image/svg+xml'); assert.equal(result.file.object_key, undefined);
  assert.ok([...objects.keys()][0].startsWith('hub/alice/yunque-sanguo/'));
  assert.equal((await json(await files.GET(req('/api/hub/files')))).files.length, 1);
  assert.equal((await json(await files.GET(req('/api/hub/files', { user: 'bob' })))).files.length, 0);
  await json(await file.GET(req('/api/hub/files/' + result.file.id, { user: 'bob' }), fileContext), 404);
  const response = await file.GET(req('/api/hub/files/' + result.file.id), fileContext);
  assert.equal(response.headers.get('content-type'), 'application/octet-stream');
  assert.ok(response.headers.get('content-disposition').startsWith('attachment;'));
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('content-security-policy'), 'sandbox');
  assert.match(await response.text(), /svg/);
  await json(await file.DELETE(req('/api/hub/files/' + result.file.id, { method: 'DELETE', user: 'bob' }), fileContext), 404);
  await json(await file.DELETE(req('/api/hub/files/' + result.file.id, { method: 'DELETE' }), fileContext));
  assert.equal(objects.size, 0);
  await json(await file.GET(req('/api/hub/files/' + result.file.id), fileContext), 404);
});

test('health reads both storage services and requires platform authentication', async () => {
  await json(await health.GET(req('/api/hub/health', { user: null })), 401);
  assert.deepEqual(await json(await health.GET(req('/api/hub/health'))), { ok: true, database: 'ready', storage: 'ready' });
  const original = fakeBucket.head; fakeBucket.head = async () => { throw new Error('unavailable'); };
  assert.equal((await json(await health.GET(req('/api/hub/health')), 503)).storage, 'unavailable'); fakeBucket.head = original;
});
