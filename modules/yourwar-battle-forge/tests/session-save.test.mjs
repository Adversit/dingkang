import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TYPES, STAGES, validPlacement } from '../../../public/apps/yourwar-battle-forge/battle.mjs';
import {
  SESSION_KEY,
  normalizeSession,
  persistSession,
  readSession,
} from '../../../public/apps/yourwar-battle-forge/session-save.mjs';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values,
    writes,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { writes.push([key, value]); values.set(key, value); },
  };
}

function session(overrides = {}) {
  return {
    version: 1,
    mode: 'challenge',
    stage: 0,
    team: 0,
    selected: 'archer',
    seed: 617,
    placements: [
      { type: 'guardian', team: 0, x: -4.5, z: -2.25 },
      { type: 'archer', team: 0, x: -10, z: 2.5 },
      { type: 'swordsman', team: 1, x: 5, z: 0 },
    ],
    ...overrides,
  };
}

// A spaced grid stays within legal deployment coordinates, even at 80 units.
function army(count, team, type = 'swordsman') {
  const spacing = Math.max(1.5, TYPES[type].radius * 2);
  return Array.from({ length: count }, (_, i) => ({
    type,
    team,
    x: (team === 0 ? -1 : 1) * (1.7 + (i % 8) * spacing),
    z: -8 + Math.floor(i / 8) * spacing,
  }));
}

test('a custom editable formation survives a storage round trip at every stage index', () => {
  for (let stage = 0; stage < STAGES.length; stage += 1) {
    const expected = session({ stage, seed: 100 + stage });
    const storage = memoryStorage({ unrelated: 'keep' });
    assert.equal(persistSession(expected, storage), true, `stage ${stage}`);
    assert.deepEqual(readSession(storage), expected, `stage ${stage}`);
    assert.equal(storage.values.get('unrelated'), 'keep');
    assert.deepEqual(storage.writes.map(([key]) => key), [SESSION_KEY]);
  }
});

test('all nine real initial armies round trip, including existing close giant formations', () => {
  // Exercise the actual pure generator used by setStage without loading WebGL or DOM code.
  const gameSource = readFileSync(new URL('../../../public/apps/yourwar-battle-forge/game.mjs', import.meta.url), 'utf8');
  const generatorSource = gameSource.match(/function normalizeFormation\([\s\S]*?(?=\nfunction setStage\()/)?.[0];
  assert.ok(generatorSource, 'the game must expose its initial formation generator for this regression');
  const generate = runInNewContext(`(${generatorSource})`, { TYPES }, { timeout: 1000 });
  assert.equal(STAGES.length, 9);
  for (let stage = 0; stage < STAGES.length; stage += 1) {
    const { starter, enemy, budget } = STAGES[stage];
    const placements = [
      ...generate(starter, 0, budget),
      ...generate(enemy, 1),
    ].map(unit => ({ ...unit }));
    const redArmy = placements.filter(unit => unit.team === 1);
    for (const [type, count] of enemy) {
      assert.equal(redArmy.filter(unit => unit.type === type).length, count, `stage ${stage}, enemy ${type}`);
    }
    if ([3, 5, 8].includes(stage)) {
      const giants = redArmy.filter(unit => unit.type === 'giant');
      assert.ok(giants.length >= 2);
      assert.equal(validPlacement(giants[1], [giants[0]]).ok, false,
        'the original close giant arrangement must remain in the compatibility fixture');
    }
    const expected = session({ stage, placements });
    const storage = memoryStorage();
    assert.equal(persistSession(expected, storage), true, `stage ${stage} initial armies save`);
    assert.deepEqual(readSession(storage), expected, `stage ${stage} initial armies restore`);
  }
});

test('sandbox preserves selected side, selected unit, and both armies above challenge budget', () => {
  const expected = session({
    mode: 'sandbox', stage: STAGES.length - 1, team: 1, selected: 'giant',
    placements: [...army(8, 0, 'giant'), ...army(8, 1, 'giant')],
  });
  const storage = memoryStorage();
  assert.equal(persistSession(expected, storage), true);
  assert.deepEqual(readSession(storage), expected);
});

test('saves only deployment data and copies units without renderer or live battle objects', () => {
  const expected = session();
  const battle = {};
  battle.self = battle;
  const state = {
    ...expected, version: undefined, phase: 'battle', battle,
    placements: expected.placements.map(unit => ({ ...unit, renderer: battle, hp: 2 })),
  };
  const storage = memoryStorage();
  assert.equal(persistSession(state, storage), true);
  const restored = readSession(storage);
  assert.deepEqual(restored, expected);
  state.placements[0].x = -12;
  assert.equal(restored.placements[0].x, -4.5);
  assert.deepEqual(readSession(storage), expected);
});

test('normalization copies placement objects and keeps challenge control on the blue side', () => {
  const source = session({ team: 1 });
  const normalized = normalizeSession(source);
  assert.equal(normalized.team, 0);
  assert.notEqual(normalized.placements, source.placements);
  assert.notEqual(normalized.placements[0], source.placements[0]);
  source.placements[0].z = 8;
  assert.equal(normalized.placements[0].z, -2.25);
});

test('a challenge can spend its exact budget but cannot exceed it', () => {
  // Stage 0: 9 swordsmen + 2 guardians = 1,000 coins.
  const placements = [...army(9, 0),
    { type: 'guardian', team: 0, x: -14, z: 0 },
    { type: 'guardian', team: 0, x: -14, z: 2 },
    ...army(1, 1),
  ];
  assert.equal(9 * TYPES.swordsman.cost + 2 * TYPES.guardian.cost, STAGES[0].budget);
  const valid = session({ placements });
  assert.ok(normalizeSession(valid));
  const storage = memoryStorage();
  assert.equal(persistSession(valid, storage), true);
  const before = storage.getItem(SESSION_KEY);
  const invalid = session({ placements: [...placements, { type: 'archer', team: 0, x: -10, z: 7 }] });
  assert.equal(normalizeSession(invalid), null);
  assert.equal(persistSession(invalid, storage), false);
  assert.equal(storage.getItem(SESSION_KEY), before, 'invalid save preserves last good record');
  assert.equal(storage.writes.length, 1, 'invalid save never writes');
});

test('invalid session metadata and invalid army containers are rejected', () => {
  for (const patch of [
    { version: 0 }, { version: 2 }, { mode: 'campaign' },
    { stage: -1 }, { stage: STAGES.length }, { stage: 0.5 }, { stage: '1' },
    { team: -1 }, { team: 2 }, { team: '0' },
    { selected: 'dragon' }, { selected: '__proto__' }, { selected: 'constructor' },
    { placements: null }, { placements: {} },
  ]) assert.equal(normalizeSession(session(patch)), null, JSON.stringify(patch));
  for (const value of [null, undefined, false, [], 'save']) {
    assert.equal(normalizeSession(value), null);
  }
});

test('non-finite, non-numeric, and out-of-arena unit coordinates are rejected', () => {
  for (const [axis, badValues] of [
    ['x', [NaN, Infinity, -Infinity, '4', null, undefined, 15.01, -15.01]],
    ['z', [NaN, Infinity, -Infinity, '4', null, undefined, 9.01, -9.01]],
  ]) {
    for (const value of badValues) {
      const candidate = session();
      candidate.placements[0][axis] = value;
      assert.equal(normalizeSession(candidate), null, `${axis}=${String(value)}`);
      assert.equal(persistSession(candidate, memoryStorage()), false);
    }
  }
});

test('wrong-half and neutral-zone deployments are rejected', () => {
  const valid = session().placements;
  for (const placements of [
    [{ ...valid[0], x: 4 }, valid[2]],
    [valid[0], { ...valid[2], x: -4 }],
    [{ ...valid[0], x: 0 }, valid[2]],
  ]) {
    const candidate = session({ placements });
    const storage = memoryStorage();
    assert.equal(normalizeSession(candidate), null);
    assert.equal(persistSession(candidate, storage), false);
    assert.equal(storage.writes.length, 0);
  }
});

test('unknown unit types, prototype names, bad teams, and missing unit records are rejected', () => {
  for (const unit of [
    null, undefined, {},
    { type: 'dragon', team: 0, x: -4, z: 0 },
    { type: '__proto__', team: 0, x: -4, z: 0 },
    { type: 'constructor', team: 0, x: -4, z: 0 },
    { type: 'toString', team: 0, x: -4, z: 0 },
    { type: 'swordsman', team: 2, x: -4, z: 0 },
    { type: 'swordsman', team: '0', x: -4, z: 0 },
  ]) assert.equal(normalizeSession(session({ placements: [unit] })), null);
});

test('sandbox allows 80 units per side and rejects overflowing either side', () => {
  const full = session({ mode: 'sandbox', placements: [...army(80, 0), ...army(80, 1)] });
  assert.equal(normalizeSession(full).placements.length, 160);
  for (const placements of [army(81, 0), army(81, 1), [...army(80, 0), ...army(81, 1)]]) {
    assert.equal(normalizeSession(session({ mode: 'sandbox', placements })), null);
  }
});

test('empty editable formations remain restorable', () => {
  const expected = session({ placements: [] });
  const storage = memoryStorage();
  assert.equal(persistSession(expected, storage), true);
  assert.deepEqual(readSession(storage), expected);
});

test('invalid random seeds fall back to a deterministic default', () => {
  for (const seed of [undefined, null, NaN, Infinity, '9', 4.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(normalizeSession(session({ seed })).seed, 42);
  }
  assert.equal(normalizeSession(session({ seed: 0 })).seed, 0);
});

test('missing, malformed, and incompatible stored data return null without writes', () => {
  for (const raw of [null, '', '{broken', 'null', '[]', 'false', JSON.stringify(session({ version: 2 })),
    JSON.stringify(session({ placements: [{ type: 'unknown', team: 0, x: -4, z: 0 }] }))]) {
    const storage = memoryStorage(raw === null ? {} : { [SESSION_KEY]: raw });
    assert.equal(readSession(storage), null);
    assert.equal(storage.writes.length, 0);
  }
});

test('read failures are recoverable and do not overwrite an existing record', () => {
  const storage = memoryStorage({ [SESSION_KEY]: JSON.stringify(session()) });
  storage.getItem = () => { throw new Error('Storage blocked'); };
  assert.equal(readSession(storage), null);
  assert.equal(storage.writes.length, 0);
  assert.equal(readSession(null), null);
});

test('quota or write failures return false and preserve the prior save', () => {
  const original = JSON.stringify(session());
  const storage = memoryStorage({ [SESSION_KEY]: original });
  storage.setItem = () => { throw new DOMException('No space', 'QuotaExceededError'); };
  assert.equal(persistSession(session({ stage: 1 }), storage), false);
  assert.equal(storage.values.get(SESSION_KEY), original);
  assert.equal(persistSession(session(), null), false);
});
