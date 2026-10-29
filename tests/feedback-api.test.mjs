import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://feedback.test';
const owner = { id: 'site-owner', email: 'owner@example.invalid' };
const visitor = { id: 'another-user', email: 'visitor@example.invalid' };
function moduleUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText).toString('base64');
}
const catalogUrl = moduleUrl(fs.readFileSync(path.join(root, 'lib/hub/catalog.ts'), 'utf8'));
const server = await import(moduleUrl(fs.readFileSync(path.join(root, 'lib/feedback/server.ts'), 'utf8')
  .replaceAll("'../hub/catalog'", JSON.stringify(catalogUrl))));
// Exercise the published migration, not a hand-maintained test-only schema.
const feedbackMigration = fs.readdirSync(path.join(root, 'drizzle')).filter(file => file.endsWith('.sql')).sort()
  .map(file => fs.readFileSync(path.join(root, 'drizzle', file), 'utf8'))
  .find(sql => /CREATE TABLE [`"]hub_feedback[`"]/.test(sql));
assert.ok(feedbackMigration, 'A real feedback migration must exist before tests run.');

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(feedbackMigration);
  t.after(() => sqlite.close());
  function statement(sql, values = []) {
    return {
      bind(...args) { return statement(sql, args); },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async all() { return { success: true, results: sqlite.prepare(sql).all(...values), meta: { changes: 0 } }; },
      execute() { const result = sqlite.prepare(sql).run(...values); return { success: true, results: [], meta: { changes: Number(result.changes) } }; },
      async run() { return this.execute(); },
    };
  }
  const env = {
    DB: {
      prepare: statement,
      async batch(statements) {
        sqlite.exec('BEGIN');
        try { const result = statements.map(item => item.execute()); sqlite.exec('COMMIT'); return result; }
        catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      },
    },
    FEEDBACK_OWNER_EMAIL: owner.email,
    FEEDBACK_RATE_SALT: 'feedback-tests-only-rate-salt-32-bytes-minimum',
  };
  return {
    sqlite, env,
    call(request) { return server.handleFeedbackRequest(request, env); },
    count(table = 'hub_feedback') { return sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count; },
  };
}
function req(url = '/api/hub/feedback', { user = null, method = 'GET', body, raw, headers = {} } = {}) {
  return new Request(origin + url, {
    method,
    headers: {
      ...(user ? { 'oai-authenticated-user-id': user.id, 'oai-authenticated-user-email': user.email } : {}),
      ...(['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? { origin } : {}),
      ...(body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : {}),
      'cf-connecting-ip': '192.0.2.10', ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : raw !== undefined ? { body: raw } : {}),
  });
}
function input(overrides = {}) {
  return {
    requestId: crypto.randomUUID(), moduleId: 'hub', category: 'bug', title: '保存后记录没有更新',
    content: '在手机打开工作台，修改一条记录并保存，刷新后仍显示旧内容。',
    expected: '刷新后看到刚刚保存的内容。', contact: 'reporter@example.invalid',
    pagePath: '/?app=evopm-workbench&private_token=not-retained', ...overrides,
  };
}
async function json(response, expected = 200) {
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  assert.match(response.headers.get('cache-control'), /no-store/);
  return data;
}
async function submit(f, overrides = {}, options = {}) {
  return json(await f.call(req(undefined, { method: 'POST', body: input(overrides), ...options })), 201);
}

test('anonymous feedback persists original evidence, starts pending review and returns only a receipt', async t => {
  const f = fixture(t), received = await submit(f);
  assert.equal(received.id, received.receipt);
  assert.equal(received.duplicate, false);
  assert.equal(received.status, 'received');
  assert.deepEqual(Object.keys(received).sort(), ['duplicate', 'id', 'receipt', 'status']);
  assert.equal(f.count(), 1);
  const row = f.sqlite.prepare('SELECT * FROM hub_feedback').get();
  assert.equal(row.status, 'pending_review');
  assert.equal(row.version, 1);
  assert.equal(row.reporter_id, null);
  assert.equal(row.page_path, '/');
  assert.equal(row.contact, 'reporter@example.invalid');
  assert.equal(row.reviewed_by, null);
  assert.equal(f.count('hub_feedback_reviews'), 0);
  for (const path of ['/api/hub/feedback', '/api/hub/feedback/' + received.id]) {
    const denied = await json(await f.call(req(path)), 405);
    assert.equal(JSON.stringify(denied).includes(row.contact), false);
    assert.equal(JSON.stringify(denied).includes(row.content), false);
  }
});

test('public submit rejects caller-supplied approval and ownership fields', async t => {
  const f = fixture(t);
  for (const extra of [{ status: 'approved' }, { userId: owner.id }, { reporterId: owner.id }, { reviewedBy: owner.id }]) {
    await json(await f.call(req(undefined, { method: 'POST', body: input(extra) })), 400);
  }
  assert.equal(f.count(), 0);
});

test('idempotent sequential and concurrent retries create one record and consume one quota unit', async t => {
  const f = fixture(t), payload = input();
  const results = await Promise.all(Array.from({ length: 5 }, () => f.call(req(undefined, { method: 'POST', body: payload }))));
  const entries = [];
  for (const response of results) entries.push(await json(response, response.status === 201 ? 201 : 200));
  assert.equal(entries.filter(item => !item.duplicate).length, 1);
  assert.equal(new Set(entries.map(item => item.id)).size, 1);
  const repeated = await json(await f.call(req(undefined, { method: 'POST', body: payload })));
  assert.equal(repeated.id, entries[0].id);
  assert.equal(repeated.duplicate, true);
  assert.equal(f.count(), 1);
  assert.deepEqual(f.sqlite.prepare('SELECT count FROM hub_feedback_limits ORDER BY key').all().map(row => row.count), [1, 1]);
  await json(await f.call(req(undefined, { method: 'POST', body: { ...payload, content: '不同的内容' } })), 409);
  assert.equal(f.count(), 1);
});

test('validation rejects invalid origins, modules, malformed content and oversized bodies before writes', async t => {
  const f = fixture(t);
  await json(await f.call(req(undefined, { method: 'POST', body: input(), headers: { origin: 'https://untrusted.invalid' } })), 403);
  await json(await f.call(req(undefined, { method: 'POST', body: input(), headers: { origin: '' } })), 403);
  await json(await f.call(req(undefined, { method: 'POST', body: input(), headers: { 'content-type': 'text/plain' } })), 415);
  for (const invalid of [
    { moduleId: 'nonexistent-module' }, { category: 'execute-code' }, { title: '' }, { content: ' ' },
    { requestId: 'too-short' }, { title: 'a'.repeat(121) }, { content: 'a'.repeat(4001) },
    { contact: 'a'.repeat(181) }, { pagePath: '//external.invalid/path' }, { pagePath: '/\\external.invalid' },
  ]) await json(await f.call(req(undefined, { method: 'POST', body: input(invalid) })), 400);
  await json(await f.call(req(undefined, { method: 'POST', raw: '{invalid' })), 400);
  await json(await f.call(req(undefined, { method: 'POST', raw: JSON.stringify({ value: 'x'.repeat(33 * 1024) }) })), 413);
  await json(await f.call(req(undefined, { method: 'POST', body: input(), headers: { 'content-length': '999999' } })), 413);
  assert.equal(f.count(), 0);
});

test('only the configured owner identity may read evidence, contacts or approved development candidates', async t => {
  const f = fixture(t);
  await submit(f);
  for (const path of ['/api/hub/feedback/review', '/api/hub/feedback/review/approved']) {
    await json(await f.call(req(path)), 401);
    await json(await f.call(req(path, { user: visitor })), 403);
    await json(await f.call(req(path, { headers: { 'x-hub-user-id': owner.id, 'x-owner-email': owner.email } })), 401);
  }
  const listed = await json(await f.call(req('/api/hub/feedback/review', { user: owner })));
  assert.equal(listed.feedback.length, 1);
  assert.equal(listed.feedback[0].contact, 'reporter@example.invalid');
  assert.equal(listed.feedback[0].analysis, null);
  assert.equal('request_id' in listed.feedback[0], false);
  assert.equal('request_hash' in listed.feedback[0], false);
  f.env.FEEDBACK_OWNER_EMAIL = '';
  await json(await f.call(req('/api/hub/feedback/review', { user: owner })), 403);
});

test('session distinguishes an ordinary visitor from owner without changing permission', async t => {
  const f = fixture(t);
  const anonymous = await json(await f.call(req('/api/hub/feedback/session')));
  assert.equal(anonymous.authenticated, false);
  assert.equal(anonymous.isOwner, false);
  const ordinary = await json(await f.call(req('/api/hub/feedback/session', { user: visitor })));
  assert.equal(ordinary.authenticated, true);
  assert.equal(ordinary.isOwner, false);
  const owning = await json(await f.call(req('/api/hub/feedback/session', { user: { ...owner, email: owner.email.toUpperCase() } })));
  assert.equal(owning.isOwner, true);
});

test('review requires owner, same-origin, note and current version, writes audit and never starts development', async t => {
  const f = fixture(t), received = await submit(f);
  const decision = { id: received.id, expectedVersion: 1, decision: 'approved', note: '已复现并确认范围，只修复保存后的数据刷新。' };
  await json(await f.call(req('/api/hub/feedback/review', { method: 'POST', body: decision })), 401);
  await json(await f.call(req('/api/hub/feedback/review', { user: visitor, method: 'POST', body: decision })), 403);
  await json(await f.call(req('/api/hub/feedback/review', { user: owner, method: 'POST', body: decision, headers: { origin: 'https://untrusted.invalid' } })), 403);
  for (const invalid of [{ note: '' }, { expectedVersion: 0 }, { decision: 'developing' }, { actor: owner.id }]) {
    await json(await f.call(req('/api/hub/feedback/review', { user: owner, method: 'POST', body: { ...decision, ...invalid } })), 400);
  }
  assert.equal(f.count('hub_feedback_reviews'), 0);
  const approved = await json(await f.call(req('/api/hub/feedback/review', { user: owner, method: 'POST', body: decision })));
  assert.equal(approved.developmentStarted, false);
  assert.equal(approved.feedback.status, 'approved');
  assert.equal(approved.feedback.version, 2);
  assert.equal(approved.feedback.reviewed_by, owner.id);
  await json(await f.call(req('/api/hub/feedback/review', { user: owner, method: 'POST', body: { ...decision, decision: 'rejected' } })), 409);
  assert.equal(f.count('hub_feedback_reviews'), 1);
  const audit = f.sqlite.prepare('SELECT * FROM hub_feedback_reviews').get();
  assert.equal(audit.decision, 'approved');
  assert.equal(audit.actor_id, owner.id);
  assert.equal(audit.note, decision.note);
  assert.equal(audit.version, 2);
  const withdrawn = await json(await f.call(req('/api/hub/feedback/review', { user: owner, method: 'POST', body: { ...decision, expectedVersion: 2, decision: 'needs_evidence', note: '需要补充移动端复现视频。' } })));
  assert.equal(withdrawn.feedback.status, 'needs_evidence');
  assert.equal(withdrawn.feedback.version, 3);
  assert.equal(f.count('hub_feedback_reviews'), 2);
});

test('approved export excludes pending, rejected and withdrawn records', async t => {
  const f = fixture(t), ids = [];
  for (let i = 0; i < 4; i++) ids.push((await submit(f, { title: `问题 ${i}` })).id);
  for (const [index, decision] of ['approved', 'rejected', 'needs_evidence'].entries()) {
    await json(await f.call(req('/api/hub/feedback/review', { user: owner, method: 'POST', body: { id: ids[index], expectedVersion: 1, decision, note: '人工审阅记录。' } })));
  }
  const exported = await json(await f.call(req('/api/hub/feedback/review/approved?status=all', { user: owner })));
  assert.deepEqual(exported.feedback.map(item => item.id), [ids[0]]);
  assert.equal(exported.feedback[0].status, 'approved');
});

test('hourly limits report 429 without a false receipt or dropped successful write', async t => {
  const f = fixture(t);
  const first = input();
  await json(await f.call(req(undefined, { method: 'POST', body: first })), 201);
  for (let i = 1; i < 8; i++) await submit(f);
  const limitedResponse = await f.call(req(undefined, { method: 'POST', body: input() }));
  assert.equal(limitedResponse.headers.get('retry-after'), '3600');
  const limited = await json(limitedResponse, 429);
  assert.equal('receipt' in limited, false);
  assert.equal(f.count(), 8);
  assert.equal((await json(await f.call(req(undefined, { method: 'POST', body: first })))).duplicate, true);
  assert.equal(f.count(), 8);
  await submit(f, {}, { headers: { 'cf-connecting-ip': '192.0.2.11' } });
  assert.equal(f.count(), 9);
});

test('global limit blocks a new submitter and unavailable configuration fails closed', async t => {
  const f = fixture(t), now = new Date().toISOString();
  f.sqlite.prepare('INSERT INTO hub_feedback_limits(key,count,expires_at) VALUES(?,?,?)').run(`day:${now.slice(0, 10)}`, 2000, '2099-01-01T00:00:00.000Z');
  await json(await f.call(req(undefined, { method: 'POST', body: input() })), 429);
  assert.equal(f.count(), 0);
  f.env.FEEDBACK_RATE_SALT = '';
  await json(await f.call(req(undefined, { method: 'POST', body: input() })), 503);
  assert.equal(f.count(), 0);
});
