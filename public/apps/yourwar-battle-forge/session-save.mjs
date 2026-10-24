import {TYPES, STAGES, costOf} from './battle.mjs';

export const SESSION_KEY = 'yourwar-session-v1';

// Persist the editable deployment, not renderer objects or a running simulation.
// Returning to a saved battle lets the player start again from the same formation.
export function normalizeSession(value) {
  if (!value || value.version !== 1 || !['challenge', 'sandbox'].includes(value.mode) ||
      !Number.isInteger(value.stage) || value.stage < 0 || value.stage >= STAGES.length ||
      ![0, 1].includes(value.team) || !Object.hasOwn(TYPES, value.selected) ||
      !Array.isArray(value.placements) || value.placements.length > 160) return null;
  const placements = [];
  for (const unit of value.placements) {
    if (!unit || !Object.hasOwn(TYPES, unit.type) || ![0, 1].includes(unit.team) ||
        !Number.isFinite(unit.x) || !Number.isFinite(unit.z) ||
        Math.abs(unit.x) > 15 || Math.abs(unit.z) > 9 ||
        unit.team === 0 && unit.x > -.7 || unit.team === 1 && unit.x < .7) return null;
    placements.push({type: unit.type, team: unit.team, x: unit.x, z: unit.z});
  }
  // Existing recommended armies include adjacent giants slightly closer than
  // the manual placement radius. Preserve those real saves; only new UI
  // placements apply the stricter spacing rule in validPlacement().
  if ([0, 1].some(team => placements.filter(unit => unit.team === team).length > 80) ||
      value.mode === 'challenge' && costOf(placements, 0) > STAGES[value.stage].budget) return null;
  return {
    version: 1, mode: value.mode, stage: value.stage,
    team: value.mode === 'challenge' ? 0 : value.team,
    selected: value.selected,
    seed: Number.isSafeInteger(value.seed) ? value.seed : 42,
    placements,
  };
}

export function readSession(storage = globalThis.localStorage) {
  try { return normalizeSession(JSON.parse(storage.getItem(SESSION_KEY) || 'null')); }
  catch { return null; }
}

export function persistSession(state, storage = globalThis.localStorage) {
  const value = normalizeSession({...state, version: 1});
  if (!value) return false;
  try { storage.setItem(SESSION_KEY, JSON.stringify(value)); return true; }
  catch { return false; }
}
