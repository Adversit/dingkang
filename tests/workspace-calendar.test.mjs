import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  WORKSPACE_CALENDAR_MODULE_ID,
  buildMonthGrid,
  deleteWorkPlan,
  deleteWorkRecord,
  getDayItems,
  getTodayDate,
  parseCalendarValues,
  serializeCalendarValues,
  upsertWorkPlan,
  upsertWorkRecord,
} from '../lib/hub/workspace-calendar.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function transpileModule(relPath, replacements = {}) {
  let code = fs.readFileSync(path.join(root, relPath), 'utf8');
  for (const [from, to] of Object.entries(replacements)) code = code.replaceAll(from, to);
  return 'data:text/javascript;base64,' + Buffer.from(
    ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText,
  ).toString('base64');
}

const catalogUrl = new URL('../lib/hub/catalog.ts', import.meta.url).href;
const legacyImportUrl = new URL('../lib/hub/legacy-import.ts', import.meta.url).href;
const { parseBackup, prepareBackupPreview } = await import(
  transpileModule('lib/hub/backup-preview.ts', {
    "'./catalog'": JSON.stringify(catalogUrl),
    "'./legacy-import'": JSON.stringify(legacyImportUrl),
  })
);

test('getTodayDate uses Asia/Shanghai natural day', () => {
  // 2026-11-24T17:00:00Z is 2026-11-25T01:00:00+08:00 in Asia/Shanghai
  const date = getTodayDate(new Date('2026-11-24T17:00:00.000Z'));
  assert.equal(date, '2026-11-25');
});

test('buildMonthGrid builds 42 Monday-first cells', () => {
  const grid = buildMonthGrid('2026-11');
  assert.equal(grid.length, 42);
  // 2026-11-01 is Sunday, so Monday-first grid starts on 2026-10-26
  assert.equal(grid[0].date, '2026-10-26');
  assert.equal(grid[0].inCurrentMonth, false);
  assert.equal(grid[6].date, '2026-11-01');
  assert.equal(grid[6].inCurrentMonth, true);
});

test('work records and plans support create, edit, cross-month reschedule, done, and delete', () => {
  let months = {};

  const recRes = upsertWorkRecord(months, {
    date: '2026-11-24',
    title: '完成日历接口联调',
    note: '验证 409 与备份识别',
  }, '2026-11-24T10:00:00+08:00');
  months = recRes.months;
  assert.deepEqual(recRes.touched, ['2026-11']);
  assert.equal(getDayItems(months, '2026-11-24').records.length, 1);

  const planRes = upsertWorkPlan(months, {
    date: '2026-11-28',
    title: 'Preview 验收',
    note: '检查 4 套主题',
    status: 'todo',
  }, '2026-11-24T10:05:00+08:00');
  months = planRes.months;

  // Cross-month reschedule from 2026-11-28 to 2026-12-03
  const moved = upsertWorkPlan(months, {
    id: planRes.plan.id,
    sourceDate: '2026-11-28',
    date: '2026-12-03',
    title: 'Preview 验收',
    note: '检查 4 套主题',
    status: 'done',
  }, '2026-11-24T11:00:00+08:00');
  months = moved.months;
  assert.deepEqual(moved.touched, ['2026-11', '2026-12']);
  assert.equal(getDayItems(months, '2026-11-28').plans.length, 0);
  const decPlans = getDayItems(months, '2026-12-03').plans;
  assert.equal(decPlans.length, 1);
  assert.equal(decPlans[0].status, 'done');
  assert.equal(decPlans[0].completedAt, '2026-11-24T11:00:00+08:00');

  // Serialize and parse back while preserving unrelated keys
  const serialized = serializeCalendarValues({ customNote: 'keep-me' }, months, ['2026-11', '2026-12']);
  assert.equal(serialized.schemaVersion, '1');
  assert.equal(serialized.customNote, 'keep-me');
  const reparsed = parseCalendarValues(serialized);
  assert.equal(getDayItems(reparsed, '2026-11-24').records[0].title, '完成日历接口联调');
  assert.equal(getDayItems(reparsed, '2026-12-03').plans[0].status, 'done');

  // Delete record and plan
  const delRec = deleteWorkRecord(reparsed, '2026-11-24', recRes.record.id);
  assert.equal(delRec.removed?.id, recRes.record.id);
  assert.equal(getDayItems(delRec.months, '2026-11-24').records.length, 0);

  const delPlan = deleteWorkPlan(delRec.months, '2026-12-03', planRes.plan.id);
  assert.equal(delPlan.removed?.id, planRes.plan.id);
  assert.equal(getDayItems(delPlan.months, '2026-12-03').plans.length, 0);
});

test('backup preview recognizes hub-workspace-calendar', async () => {
  const backup = parseBackup({
    format: 'dingkang-hub-state-backup',
    version: 1,
    modules: [
      {
        moduleId: WORKSPACE_CALENDAR_MODULE_ID,
        values: { schemaVersion: '1', 'month:2026-11': '{"records":[],"plans":[]}' },
      },
    ],
  });
  assert.equal(backup.entries.length, 1);
  assert.equal(backup.entries[0].moduleId, WORKSPACE_CALENDAR_MODULE_ID);
  const preview = await prepareBackupPreview(backup.entries, async () => ({ values: {}, revision: 2 }));
  assert.equal(preview[0].expectedRevision, 2);
});
