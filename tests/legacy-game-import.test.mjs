import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {convertLegacyGameImport, detectLegacyGameImport, GAME_IMPORT_METADATA} from '../lib/hub/legacy-import.ts';
import {defaults} from '../public/apps/cloudrush-runner/data.js';
import {newGame, createCreature, restoreSave} from '../public/apps/starfall-creature-isles/game.mjs';
import {freshProfile, validateProfile} from '../public/apps/pocket-arcade-ten/rogue/data.mjs';
import {initialState} from '../public/apps/mistbound-letters/game.js';
import {normalizeSave} from '../public/apps/mistbound-letters/save-format.js';

const moonlitSource = readFileSync(new URL('../public/assets/moonlit-immortal-chronicle/game.js', import.meta.url), 'utf8');
const moonlit = () => JSON.parse(JSON.stringify(vm.runInNewContext('(' + moonlitSource.match(/const defaultState=\(\)=>\((\{[^\n]+\})\);/)[1] + ')')));
const starfall = () => {
  const state = newGame(1234), creature = createCreature(state, 23, 10);
  state.roster.push(creature); state.team.push(creature.uid); state.started = true;
  return restoreSave(state);
};
const yunque = () => ({version: 2, name: '云游少主', gold: 12, exp: 24, tickets: 2, stones: 3,
  roster: Object.fromEntries([0, 1, 2, 4, 13, 23].map(id => [id, {id, level: 1, stars: 1, ascend: 0, shards: 0}])),
  formation: [0, 1, 2, 4, 13, 23], cleared: {}, shardBank: {}, claimed: []});

test('actual native export shapes retain game payloads and target the correct key', () => {
  for (const [moduleId, raw, key] of [
    ['starfall-creature-isles', starfall(), 'starfall-creature-isles-v1'],
    ['pocket-arcade-ten', validateProfile(freshProfile()), 'pocket-ash-expedition-v1'],
    ['mistbound-letters', normalizeSave(initialState()), 'mistbound-letters-v1'],
  ]) {
    const converted = convertLegacyGameImport(JSON.stringify(raw));
    assert.equal(converted.moduleId, moduleId);
    assert.equal(converted.format, 'native-export');
    assert.deepEqual(JSON.parse(converted.values[key]), raw);
  }
});

test('verified browser raw states recognize runner, moonlit and all 24 yunque heroes', () => {
  for (const [moduleId, raw] of [['cloudrush-runner', defaults()], ['moonlit-immortal-chronicle', moonlit()], ['yunque-sanguo', yunque()]]) {
    const converted = convertLegacyGameImport(raw);
    assert.equal(converted.moduleId, moduleId);
    assert.equal(converted.format, 'raw-browser-save');
  }
});

test('standard hub backup preserves original string values without reconstructing partial state', () => {
  const input = {moduleId: 'pocket-arcade-ten', values: {'pocket-arcade-v1': '{"records":{"runner":42}}', 'ash-audio': '{"music":0.2}', custom: 'backup copy'}, revision: 17};
  const converted = convertLegacyGameImport(input);
  assert.deepEqual(converted.values, input.values);
  assert.equal(converted.format, 'hub-backup');
  assert.equal('revision' in converted, false);
  assert.equal(convertLegacyGameImport({moduleId: 'hub-preferences', values: {theme: 'dark'}}).moduleId, 'hub-preferences');
});

test('legacy cloud envelopes move game content without old account or revision', () => {
  for (const raw of [initialState(), moonlit()]) {
    const converted = convertLegacyGameImport({save: raw, revision: 29, userId: 'old-account', dirty: true});
    assert.equal(converted.format, 'legacy-cloud-envelope');
    assert.deepEqual(JSON.parse(Object.values(converted.values)[0]), raw);
    assert.equal(Object.keys(converted.values).length, 1);
    assert.ok(converted.warnings.length);
  }
});

test('old moonlit main-key envelope unwraps before primary validation', () => {
  const key = 'moonlit-immortal-chronicle-v1';
  const converted = convertLegacyGameImport({[key]: JSON.stringify({save: moonlit(), revision: 7})});
  assert.deepEqual(JSON.parse(converted.values[key]), moonlit());
});

test('old account cache ignores claimed-by metadata and canonicalizes one verified save', () => {
  const converted = convertLegacyGameImport({
    'mistbound-letters-v1:claimed-by': 'old-account',
    'mistbound-letters-cloud-v1:old-account': JSON.stringify({save: initialState(), revision: 3}),
  });
  assert.deepEqual(Object.keys(converted.values), ['mistbound-letters-v1']);
  assert.deepEqual(JSON.parse(converted.values['mistbound-letters-v1']), initialState());
});

test('multiple old account caches require selecting a specific old save', () => {
  assert.throws(() => convertLegacyGameImport({
    'moonlit-immortal-chronicle-v1:first': JSON.stringify({save: moonlit()}),
    'moonlit-immortal-chronicle-v1:second': JSON.stringify({save: {...moonlit(), year: 3}}),
  }), /多份旧账号/);
});

test('old sync-only metadata is not imported as an empty game', () => {
  assert.throws(() => convertLegacyGameImport({'mistbound-letters-v1:claimed-by': 'old-account'}), /没有可识别的游戏进度/);
});

test('multigame browser dump requires a module selection, and selection copies only owned keys', () => {
  const raw = {'cloudrush.save.v1': JSON.stringify(defaults()), 'starfall-creature-isles-v1': JSON.stringify(starfall())};
  assert.throws(() => convertLegacyGameImport(raw), /多个游戏/);
  const converted = convertLegacyGameImport(raw, 'cloudrush-runner');
  assert.deepEqual(Object.keys(converted.values), ['cloudrush.save.v1']);
});

test('partial preferences and named battle plan slots remain scoped without inventing progress', () => {
  assert.deepEqual({...convertLegacyGameImport({'yourwar-plan-2': '[]', 'yourwar-audio': '{"music":true}'}).values}, {'yourwar-plan-2': '[]', 'yourwar-audio': '{"music":true}'});
  assert.deepEqual({...convertLegacyGameImport({'pocket-arcade-v1': '{"records":{}}'}).values}, {'pocket-arcade-v1': '{"records":{}}'});
  assert.throws(() => convertLegacyGameImport([]), /匿名阵型数组/);
});

test('wrong target, malformed primary, unknown data and nonstring backup values are rejected', () => {
  assert.throws(() => convertLegacyGameImport({moduleId: 'cloudrush-runner', values: {}}, 'starfall-creature-isles'), /不一致/);
  assert.throws(() => convertLegacyGameImport({'cloudrush.save.v1': '{"version":1}'}), /损坏/);
  assert.throws(() => convertLegacyGameImport({moduleId: 'cloudrush-runner', values: {bad: 7}}), /字符串/);
  assert.equal(detectLegacyGameImport({arbitrary: true}), null);
  assert.equal(detectLegacyGameImport('{'), null);
});

test('bridge size limits and prototype keys are checked before import', () => {
  assert.throws(() => convertLegacyGameImport({moduleId: 'cloudrush-runner', values: {large: 'x'.repeat(512 * 1024 + 1)}}), /512 KiB/);
  assert.throws(() => convertLegacyGameImport(JSON.parse('{"moduleId":"cloudrush-runner","values":{"__proto__":"bad"}}')), /不支持的存档键/);
});

test('metadata names only the three games with verified original file export UI', () => {
  assert.deepEqual(GAME_IMPORT_METADATA.filter(item => item.nativeExport).map(item => item.moduleId), ['starfall-creature-isles', 'pocket-arcade-ten', 'mistbound-letters']);
});
