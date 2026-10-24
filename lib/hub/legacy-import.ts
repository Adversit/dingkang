/** Pure, browser-safe import adapters grounded in the original game's stored/exported JSON. */
export type LegacyGameImport = {
  moduleId: string;
  values: Record<string, string>;
  format: 'hub-backup' | 'native-export' | 'raw-browser-save' | 'legacy-cloud-envelope' | 'legacy-storage-map';
  warnings: string[];
};

export type GameImportMetadata = {
  moduleId: string;
  title: string;
  keys: readonly string[];
  nativeExport: boolean;
  notes: string;
};

export const GAME_IMPORT_METADATA: readonly GameImportMetadata[] = [
  {moduleId: 'cloudrush-runner', title: '逐风奇旅', keys: ['cloudrush.save.v1'], nativeExport: false, notes: '原页面没有文件导出按钮；支持从原浏览器备份取得的 cloudrush.save.v1 原始 JSON。'},
  {moduleId: 'starfall-creature-isles', title: '星屿同行', keys: ['starfall-creature-isles-v1', 'starfall-creature-isles-v1-preferences', 'starfall-creature-isles-v1-backup'], nativeExport: true, notes: '支持原页面「导出旅途存档」生成的 starfall-journey.json（v1/v2）。该文件不包含声音等独立偏好。'},
  {moduleId: 'pocket-arcade-ten', title: '口袋游乐场', keys: ['pocket-arcade-v1', 'pocket-ash-expedition-v1', 'ash-audio', 'pocket-puzzle-WaterSort', 'pocket-puzzle-Parking', 'pocket-puzzle-Arrows'], nativeExport: true, notes: '原生文件导出仅覆盖「灰烬远征」；其他小游戏纪录须使用原浏览器键值备份。不会把灰烬远征误当作整个游乐场的完整备份。'},
  {moduleId: 'yourwar-battle-forge', title: 'YourWar · 你的战争', keys: ['yourwar-plan-1', 'yourwar-plan-2', 'yourwar-plan-3', 'yourwar-audio', 'yourwar-session-v1'], nativeExport: false, notes: '旧版保存3份阵型及声音配置，没有原生文件导出。阵型数组必须附带原键名，无法从匿名数组判断所属存档槽。'},
  {moduleId: 'mistbound-letters', title: '雾海来信', keys: ['mistbound-letters-v1', 'mistbound-letters-backups-v1'], nativeExport: true, notes: '支持「导出旅途」的原始状态，以及旧云存档导出的 {save,...} 包装；账号标识及旧云版本不会带入新账号。'},
  {moduleId: 'moonlit-immortal-chronicle', title: '月下问仙录', keys: ['moonlit-immortal-chronicle-v1'], nativeExport: false, notes: '原页面没有文件导出按钮；支持原浏览器/旧云备份的原始状态及 {save,...} 包装。'},
  {moduleId: 'yunque-sanguo', title: '云阙三国', keys: ['yunque-sanguo-v2'], nativeExport: false, notes: '原页面没有文件导出按钮；支持从原浏览器备份取得的 yunque-sanguo-v2 原始 JSON。'},
];

type Row = Record<string, unknown>;
const object = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
const number = (value: unknown, min = 0, max = 1e12): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const list = (value: unknown, max = 1000): value is unknown[] => Array.isArray(value) && value.length <= max;
const text = (value: unknown, max = 1000): value is string => typeof value === 'string' && value.length <= max;
const meta = (moduleId: string) => GAME_IMPORT_METADATA.find(item => item.moduleId === moduleId);

function assertSize(values: Record<string, string>) {
  const encoder = new TextEncoder();
  const entries = Object.entries(values);
  if (entries.length > 200 || encoder.encode(JSON.stringify(values)).length > 2 * 1024 * 1024) throw new Error('这份模块备份超过 2 MiB，不能直接导入。');
  for (const [key, value] of entries) {
    if (!key || key.length > 160 || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('备份含不支持的存档键。');
    if (encoder.encode(value).length > 512 * 1024) throw new Error('单份存档超过 512 KiB，请保留原文件后联系维护者。');
  }
}

const primaryKeys: Record<string, string> = {
  'cloudrush-runner': 'cloudrush.save.v1',
  'starfall-creature-isles': 'starfall-creature-isles-v1',
  'pocket-arcade-ten': 'pocket-ash-expedition-v1',
  'yourwar-battle-forge': 'yourwar-session-v1',
  'mistbound-letters': 'mistbound-letters-v1',
  'moonlit-immortal-chronicle': 'moonlit-immortal-chronicle-v1',
  'yunque-sanguo': 'yunque-sanguo-v2',
};

function validRaw(moduleId: string, value: unknown): value is Row {
  if (!object(value)) return false;
  if (moduleId === 'cloudrush-runner') {
    return value.version === 1 && object(value.selection) && object(value.levels) && object(value.settings) &&
      ['coins', 'best', 'bestDistance', 'runs', 'totalCoins'].every(key => number(value[key])) &&
      ['sun', 'mist', 'star'].includes(String(value.selection.hero)) && ['fox', 'griffin', 'tiger'].includes(String(value.selection.mount)) &&
      ['momo', 'whale', 'owl'].includes(String(value.selection.pet));
  }
  if (moduleId === 'starfall-creature-isles') {
    if (![1, 2].includes(Number(value.version)) || !integer(value.seed, 1, 4294967295) || !integer(value.nextId, 1, 100000000) ||
        !list(value.roster, 100) || !list(value.team, 6) || !object(value.bag) || !object(value.stats) || !text(value.region, 40)) return false;
    const creatures = value.roster;
    if (!creatures.every(creature => object(creature) && integer(creature.uid, 1, 100000000) && integer(creature.species, 0, 23) &&
        integer(creature.level, 1, 25) && text(creature.nature, 40) && object(creature.pp))) return false;
    const ids = creatures.map(creature => (creature as Row).uid);
    return new Set(ids).size === ids.length && new Set(value.team).size === value.team.length && value.team.every(id => ids.includes(id)) &&
      (!value.started || value.team.length > 0);
  }
  if (moduleId === 'pocket-arcade-ten') {
    return value.version === 1 && number(value.crystals, 0, 1e9) && object(value.stats) && object(value.talents) && object(value.equipped) &&
      list(value.gear, 300) && list(value.records, 20) && list(value.claimed, 100) && text(value.selected, 40) &&
      value.gear.every(gear => object(gear) && text(gear.id, 100) && ['core', 'coat', 'charm', 'boots'].includes(String(gear.slot)) &&
        integer(gear.rarity, 0, 3) && object(gear.stats));
  }
  if (moduleId === 'yourwar-battle-forge') {
    return value.version === 1 && ['challenge', 'sandbox'].includes(String(value.mode)) && integer(value.stage, 0, 8) &&
      list(value.placements, 160) && [0, 1].includes(Number(value.team)) && text(value.selected, 40) &&
      value.placements.every(unit => object(unit) && text(unit.type, 40) && [0, 1].includes(Number(unit.team)) && number(unit.x, -16, 16) && number(unit.z, -10, 10));
  }
  if (moduleId === 'mistbound-letters') {
    return value.version === 1 && integer(value.day, 1) && integer(value.turn) && integer(value.explorations) && integer(value.kindness) &&
      text(value.location, 40) && object(value.resources) && ['shell', 'wood', 'star'].every(key => integer((value.resources as Row)[key])) &&
      object(value.progress) && object(value.upgrades) && list(value.letters, 4) && list(value.completed, 5) && list(value.relics, 100) &&
      list(value.endings, 2) && list(value.log, 100) && typeof value.infinite === 'boolean';
  }
  if (moduleId === 'moonlit-immortal-chronicle') {
    return text(value.name, 24) && integer(value.realm, 0, 7) && integer(value.year, 1) && integer(value.season, 0, 3) &&
      number(value.xp) && number(value.stone) && number(value.herb) && number(value.pill) && number(value.heart) &&
      list(value.flags, 100) && list(value.seen, 100) && list(value.log, 50) &&
      (value.disciples === undefined || list(value.disciples, 30));
  }
  if (moduleId === 'yunque-sanguo') {
    if (value.version !== 2 || !text(value.name, 100) || !object(value.roster) || !list(value.formation, 6) || value.formation.length !== 6 ||
        !object(value.cleared) || !object(value.shardBank) || !list(value.claimed) ||
        !['gold', 'exp', 'tickets', 'stones'].every(key => number(value[key]))) return false;
    return new Set(value.formation).size === 6 && value.formation.every(id => integer(id, 0, 23) && object((value.roster as Row)[String(id)]));
  }
  return false;
}

function ownsKey(moduleId: string, key: string) {
  if (meta(moduleId)?.keys.includes(key)) return true;
  if (moduleId === 'starfall-creature-isles') return key.startsWith('starfall-creature-isles-v1-');
  if (moduleId === 'pocket-arcade-ten') return /^pocket-puzzle-(WaterSort|Parking|Arrows)$/.test(key);
  if (moduleId === 'mistbound-letters') return key === 'mistbound-letters-v1:claimed-by' || key.startsWith('mistbound-letters-cloud-v1:') || key.startsWith('mistbound-cloud-pending:');
  if (moduleId === 'moonlit-immortal-chronicle') return key.startsWith('moonlit-immortal-chronicle-v1:');
  return false;
}

function parseStored(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { throw new Error('旧存档键中的内容不是有效 JSON，请保留原文件。'); }
}

function conversion(moduleId: string, values: Record<string, string>, format: LegacyGameImport['format'], warnings: string[] = []): LegacyGameImport {
  assertSize(values);
  return {moduleId, values, format, warnings};
}

/** Detect a supported single-game file. Does not write storage or make requests. */
export function detectLegacyGameImport(input: unknown): LegacyGameImport | null {
  try { return convertLegacyGameImport(input); } catch { return null; }
}

/** A chosen module disambiguates a browser key/value dump; it never bypasses format validation. */
export function convertLegacyGameImport(input: unknown, selectedModuleId?: string): LegacyGameImport {
  let value = input;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { throw new Error('文件不是有效的 JSON。'); }
  }
  if (!object(value)) throw new Error('不能识别这份备份。匿名阵型数组缺少游戏及存档槽信息，请使用包含原存档键名的备份。');
  if (selectedModuleId && !meta(selectedModuleId)) throw new Error('所选模块不是支持导入的游戏。');

  if (typeof value.moduleId === 'string' && object(value.values)) {
    // Keep the established bridge envelope usable for every module. The caller
    // validates its module catalog; old untagged formats below are games only.
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.moduleId)) throw new Error('备份中的模块标识无效。');
    if (selectedModuleId && selectedModuleId !== value.moduleId) throw new Error('所选游戏与备份中的游戏不一致。');
    if (!Object.values(value.values).every(item => typeof item === 'string')) throw new Error('统一平台备份的 values 必须保留原始字符串。');
    return conversion(value.moduleId, {...value.values} as Record<string, string>, 'hub-backup');
  }

  let raw = value;
  let envelope = false;
  if (object(value.save)) { raw = value.save; envelope = true; }
  const candidates = GAME_IMPORT_METADATA.filter(item => (!selectedModuleId || item.moduleId === selectedModuleId) && validRaw(item.moduleId, raw));
  if (candidates.length === 1) {
    const item = candidates[0];
    return conversion(item.moduleId, {[primaryKeys[item.moduleId]]: JSON.stringify(raw)}, envelope ? 'legacy-cloud-envelope' : item.nativeExport ? 'native-export' : 'raw-browser-save', [
      ...(envelope ? ['仅导入游戏内容，旧账号标识、旧版本号和待写入操作不会迁入。'] : []),
      ...(item.moduleId === 'pocket-arcade-ten' ? ['此文件仅包含灰烬远征进度，不覆盖其他小游戏纪录。'] : []),
    ]);
  }

  const matched = GAME_IMPORT_METADATA.filter(item => (!selectedModuleId || item.moduleId === selectedModuleId) && Object.keys(value).some(key => ownsKey(item.moduleId, key)));
  if (matched.length > 1) throw new Error('此文件包含多个游戏，请选择本次要导入的游戏。');
  if (matched.length === 1) {
    const item = matched[0], entries = Object.entries(value).filter(([key]) => ownsKey(item.moduleId, key));
    const values: Record<string, string> = Object.create(null);
    const warnings: string[] = [];
    const primary = primaryKeys[item.moduleId];
    for (const [key, rawValue] of entries) {
      if (typeof rawValue !== 'string') throw new Error('浏览器键值备份需保留原始字符串。游戏状态 JSON 可直接单独导入。');
      values[key] = rawValue;
    }
    // Older account-local caches have a transport envelope. Move only the state,
    // never select one silently when several old account copies exist.
    const oldCloud = ['mistbound-letters', 'moonlit-immortal-chronicle'].includes(item.moduleId);
    if (oldCloud && values[primary]) {
      const stored = parseStored(values[primary]);
      if (object(stored) && validRaw(item.moduleId, stored.save)) {
        values[primary] = JSON.stringify(stored.save);
        warnings.push('已提取旧缓存包装中的游戏内容，旧账号和同步版本不会迁入。');
      }
    }
    if (!values[primary] && oldCloud) {
      const saves = entries.filter(([key]) => key !== 'mistbound-letters-v1:claimed-by').flatMap(([, entry]) => {
        try { const stored = parseStored(entry); return object(stored) && validRaw(item.moduleId, stored.save) ? [stored] : []; }
        catch { return []; }
      });
      if (saves.length > 1) throw new Error('备份包含多份旧账号旅途，请先选定并单独导出其中一份。');
      if (saves.length === 1) {
        values[primary] = JSON.stringify((saves[0] as Row).save);
        warnings.push('已提取旧缓存中的游戏内容，旧账号标识和同步版本不会迁入。');
      }
    }
    if (oldCloud) {
      for (const key of Object.keys(values)) if (!item.keys.includes(key)) delete values[key];
      if (!Object.keys(values).length) throw new Error('这份旧缓存只有账号或同步元数据，没有可识别的游戏进度。');
    }
    if (values[primary] && !validRaw(item.moduleId, parseStored(values[primary]))) throw new Error(`${item.title}主存档内容损坏，未执行导入。`);
    return conversion(item.moduleId, values, 'legacy-storage-map', warnings);
  }
  throw new Error('无法可靠识别这份旧游戏存档。支持原页面导出的星屿、灰烬远征、雾海 JSON，以及已核实格式的原浏览器备份。');
}
