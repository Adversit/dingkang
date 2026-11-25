import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(`
CREATE TABLE hub_states(owner_id TEXT NOT NULL,module_id TEXT NOT NULL,values_json TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(owner_id,module_id));
CREATE TABLE hub_state_versions(owner_id TEXT NOT NULL,module_id TEXT NOT NULL,revision INTEGER NOT NULL,values_json TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(owner_id,module_id,revision));
CREATE TABLE hub_files(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,module_id TEXT NOT NULL,object_key TEXT NOT NULL UNIQUE,name TEXT NOT NULL,mime_type TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE campus_sessions(id TEXT PRIMARY KEY,secret_hash TEXT NOT NULL,owner_id TEXT,nickname TEXT NOT NULL,appearance TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
`);

function statement(sql, args = []) {
  return {
    bind(...values) { return statement(sql, values); },
    async first() { return sqlite.prepare(sql).get(...args) || null; },
    async all() { return { results: sqlite.prepare(sql).all(...args), success: true, meta: { changes: 0 } }; },
    async run() { const result = sqlite.prepare(sql).run(...args); return { results: [], success: true, meta: { changes: Number(result.changes) } }; },
  };
}

globalThis.__gamesTestEnv = {
  DB: {
    prepare: statement,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const item of statements) results.push(await item.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  },
  BUCKET: { async put() {}, async get() { return null; }, async delete() {}, async head() { return null; } },
};

function moduleUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(
    ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText,
  ).toString('base64');
}

const serverSource = fs.readFileSync(path.join(root, 'lib/hub/server.ts'), 'utf8')
  .replace("import { env } from 'cloudflare:workers';", 'const env = globalThis.__gamesTestEnv;');
const serverUrl = moduleUrl(serverSource);

const catalogUrl = new URL('../lib/hub/catalog.ts', import.meta.url).href;
const themeUrl = new URL('../lib/hub/theme.ts', import.meta.url).href;
const campusProtocolUrl = new URL('../lib/campus/protocol.ts', import.meta.url).href;
const campusInteriorUrl = new URL('../public/apps/jlu-campus/interior-layout.js', import.meta.url).href;
const campusCollisionUrl = new URL('../lib/campus/collision-data.json', import.meta.url).href;
const campusServerSource = fs.readFileSync(path.join(root, 'lib/campus/server.ts'), 'utf8')
  .replace("import collisionData from './collision-data.json';", `import collisionData from ${JSON.stringify(campusCollisionUrl)} with { type: 'json' };`)
  .replace("import type { CampusId, CampusPlayer, CampusSnapshot, CampusRoom, CampusMessage } from './protocol';", `import type { CampusId, CampusPlayer, CampusSnapshot, CampusRoom, CampusMessage } from ${JSON.stringify(campusProtocolUrl)};`)
  .replace("from '../../public/apps/jlu-campus/interior-layout.js';", `from ${JSON.stringify(campusInteriorUrl)};`);
const campusServerUrl = moduleUrl(campusServerSource);

const gamesRoute = await import(moduleUrl(
  fs.readFileSync(path.join(root, 'app/api/games/route.ts'), 'utf8')
    .replaceAll("'@/lib/hub/catalog'", JSON.stringify(catalogUrl))
    .replaceAll("'@/lib/hub/theme'", JSON.stringify(themeUrl))
    .replaceAll("'@/lib/hub/server'", JSON.stringify(serverUrl)),
));

const gameStateRoute = await import(moduleUrl(
  fs.readFileSync(path.join(root, 'app/api/games/[gameId]/state/route.ts'), 'utf8')
    .replaceAll("'@/lib/hub/catalog'", JSON.stringify(catalogUrl))
    .replaceAll("'@/lib/hub/server'", JSON.stringify(serverUrl)),
));

const hubStateRoute = await import(moduleUrl(
  fs.readFileSync(path.join(root, 'app/api/hub/state/[moduleId]/route.ts'), 'utf8')
    .replaceAll("'@/lib/hub/server'", JSON.stringify(serverUrl)),
));

const campusAliasRoute = await import(moduleUrl(
  fs.readFileSync(path.join(root, 'app/api/games/jlu-campus/[...path]/route.ts'), 'utf8')
    .replace("import { env } from 'cloudflare:workers';", 'const env = globalThis.__gamesTestEnv;')
    .replaceAll("'@/lib/campus/server'", JSON.stringify(campusServerUrl)),
));

const origin = 'https://hub.test';
function makeReq(url, { user = 'alice', method = 'GET', body } = {}) {
  const headers = {
    ...(user ? { 'oai-authenticated-user-id': user, 'oai-authenticated-user-email': `${user}@test.invalid`, 'x-hub-user-id': user } : {}),
    ...(['POST', 'PUT', 'DELETE'].includes(method) ? { origin } : {}),
    ...(body ? { 'content-type': 'application/json' } : {}),
  };
  return new Request(origin + url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test('GET /api/games returns 8 registered games from catalog.ts', async () => {
  const res = await gamesRoute.GET();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.games.length, 8);
  const campus = data.games.find(g => g.id === 'jlu-campus');
  assert.equal(campus.capabilities.multiplayer, true);
  assert.equal(campus.capabilities.campusApiPrefix, '/api/games/jlu-campus');
  const sanguo = data.games.find(g => g.id === 'yunque-sanguo');
  assert.equal(sanguo.capabilities.stateEndpoint, '/api/games/yunque-sanguo/state');
});

test('GET/PUT /api/games/:gameId/state shares exact storage with /api/hub/state/:moduleId', async () => {
  const putRes = await gameStateRoute.PUT(
    makeReq('/api/games/yunque-sanguo/state', {
      method: 'PUT',
      body: { values: { 'yunque-sanguo-v2': '{"gold":500}' }, expectedRevision: 0 },
    }),
    { params: Promise.resolve({ gameId: 'yunque-sanguo' }) },
  );
  assert.equal(putRes.status, 200);
  const saved = await putRes.json();
  assert.equal(saved.revision, 1);

  // Read from legacy /api/hub/state/:moduleId for the same account
  const legacyGet = await hubStateRoute.GET(
    makeReq('/api/hub/state/yunque-sanguo'),
    { params: Promise.resolve({ moduleId: 'yunque-sanguo' }) },
  );
  assert.equal(legacyGet.status, 200);
  const legacyData = await legacyGet.json();
  assert.equal(legacyData.revision, 1);
  assert.equal(legacyData.values['yunque-sanguo-v2'], '{"gold":500}');

  // Account isolation: bob sees revision 0
  const bobGet = await gameStateRoute.GET(
    makeReq('/api/games/yunque-sanguo/state', { user: 'bob' }),
    { params: Promise.resolve({ gameId: 'yunque-sanguo' }) },
  );
  assert.equal((await bobGet.json()).revision, 0);

  // jlu-campus rejects /state
  const campusStateRes = await gameStateRoute.GET(
    makeReq('/api/games/jlu-campus/state'),
    { params: Promise.resolve({ gameId: 'jlu-campus' }) },
  );
  assert.equal(campusStateRes.status, 400);
});

test('/api/games/jlu-campus/health delegates to campus handler', async () => {
  const res = await campusAliasRoute.GET(makeReq('/api/games/jlu-campus/health', { user: null }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.httpSync, true);
});
