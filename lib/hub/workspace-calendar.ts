/** Pure state, date, and serialization helpers for the homepage workspace calendar (`hub-workspace-calendar`). */

export const WORKSPACE_CALENDAR_MODULE_ID = 'hub-workspace-calendar';
export const WORKSPACE_CALENDAR_TIMEZONE = 'Asia/Shanghai';
export const WORKSPACE_CALENDAR_SCHEMA_VERSION = '1';

export type PlanStatus = 'todo' | 'in_progress' | 'done';

export type WorkRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkPlan = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  note: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type MonthBucket = {
  records: WorkRecord[];
  plans: WorkPlan[];
};

export type CalendarStateMap = Record<string, MonthBucket>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PREFIX = 'month:';
const MONTH_RE = /^\d{4}-\d{2}$/;

/** Returns today's natural date (`YYYY-MM-DD`) in `Asia/Shanghai` by default. */
export function getTodayDate(now = new Date(), timeZone = WORKSPACE_CALENDAR_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value ?? '2026';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthHeading(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${y} 年 ${m} 月`;
}

export function formatDateHeading(date: string): string {
  if (!isValidDateKey(date)) return date;
  const [y, m, d] = date.split('-').map(Number);
  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${y}年${m}月${d}日 ${weekdayNames[dt.getUTCDay()]}`;
}

export type CalendarCell = {
  date: string;
  day: number;
  inCurrentMonth: boolean;
};

/** Builds a Monday-first 6-week (42-cell) month grid for `YYYY-MM`. */
export function buildMonthGrid(month: string): CalendarCell[] {
  const [y, m] = month.split('-').map(Number);
  const firstDay = new Date(Date.UTC(y, m - 1, 1));
  const mondayIndex = (firstDay.getUTCDay() + 6) % 7; // 0 = Mon .. 6 = Sun
  const start = new Date(Date.UTC(y, m - 1, 1 - mondayIndex));
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cur = new Date(start.getTime() + i * 86_400_000);
    const cy = cur.getUTCFullYear();
    const cm = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const cd = String(cur.getUTCDate()).padStart(2, '0');
    const date = `${cy}-${cm}-${cd}`;
    cells.push({
      date,
      day: cur.getUTCDate(),
      inCurrentMonth: `${cy}-${cm}` === month,
    });
  }
  return cells;
}

function normalizeRecord(raw: unknown): WorkRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id || typeof item.date !== 'string' || !isValidDateKey(item.date)) return null;
  if (typeof item.title !== 'string' || !item.title.trim()) return null;
  return {
    id: item.id,
    date: item.date,
    title: item.title,
    note: typeof item.note === 'string' ? item.note : '',
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
  };
}

function normalizePlan(raw: unknown): WorkPlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id || typeof item.date !== 'string' || !isValidDateKey(item.date)) return null;
  if (typeof item.title !== 'string' || !item.title.trim()) return null;
  const status: PlanStatus = item.status === 'in_progress' || item.status === 'done' ? item.status : 'todo';
  return {
    id: item.id,
    date: item.date,
    title: item.title,
    note: typeof item.note === 'string' ? item.note : '',
    status,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    ...(status === 'done' && typeof item.completedAt === 'string' ? { completedAt: item.completedAt } : {}),
  };
}

export function parseMonthBucket(raw?: string): MonthBucket {
  if (!raw) return { records: [], plans: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { records: [], plans: [] };
    const obj = parsed as Record<string, unknown>;
    const records = Array.isArray(obj.records) ? obj.records.map(normalizeRecord).filter((x): x is WorkRecord => x !== null) : [];
    const plans = Array.isArray(obj.plans) ? obj.plans.map(normalizePlan).filter((x): x is WorkPlan => x !== null) : [];
    return { records, plans };
  } catch {
    return { records: [], plans: [] };
  }
}

export function parseCalendarValues(values: Record<string, string>): CalendarStateMap {
  const map: CalendarStateMap = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!key.startsWith(MONTH_KEY_PREFIX)) continue;
    const month = key.slice(MONTH_KEY_PREFIX.length);
    if (!MONTH_RE.test(month)) continue;
    map[month] = parseMonthBucket(raw);
  }
  return map;
}

export function serializeCalendarValues(
  baseValues: Record<string, string>,
  months: CalendarStateMap,
  touchedMonths: Iterable<string>,
): Record<string, string> {
  const next: Record<string, string> = {
    ...baseValues,
    schemaVersion: WORKSPACE_CALENDAR_SCHEMA_VERSION,
  };
  for (const month of touchedMonths) {
    if (!MONTH_RE.test(month)) continue;
    const bucket = months[month] ?? { records: [], plans: [] };
    next[`${MONTH_KEY_PREFIX}${month}`] = JSON.stringify(bucket);
  }
  return next;
}

export function createEntryId(prefix: 'rec' | 'plan'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertWorkRecord(
  months: CalendarStateMap,
  input: { id?: string; date: string; title: string; note: string },
  nowIso = new Date().toISOString(),
): { months: CalendarStateMap; touched: string[]; record: WorkRecord } {
  const month = monthKeyOf(input.date);
  const existingBucket = months[month] ?? { records: [], plans: [] };
  const existing = input.id ? existingBucket.records.find(r => r.id === input.id) : undefined;
  const record: WorkRecord = existing
    ? { ...existing, title: input.title.trim(), note: input.note.trim(), updatedAt: nowIso }
    : {
        id: input.id || createEntryId('rec'),
        date: input.date,
        title: input.title.trim(),
        note: input.note.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
  const nextRecords = existing
    ? existingBucket.records.map(r => (r.id === record.id ? record : r))
    : [record, ...existingBucket.records];
  return {
    months: { ...months, [month]: { ...existingBucket, records: nextRecords } },
    touched: [month],
    record,
  };
}

export function deleteWorkRecord(
  months: CalendarStateMap,
  date: string,
  id: string,
): { months: CalendarStateMap; touched: string[]; removed: WorkRecord | null } {
  const month = monthKeyOf(date);
  const existingBucket = months[month];
  if (!existingBucket) return { months, touched: [], removed: null };
  const removed = existingBucket.records.find(r => r.id === id) ?? null;
  if (!removed) return { months, touched: [], removed: null };
  return {
    months: {
      ...months,
      [month]: { ...existingBucket, records: existingBucket.records.filter(r => r.id !== id) },
    },
    touched: [month],
    removed,
  };
}

export function upsertWorkPlan(
  months: CalendarStateMap,
  input: { id?: string; sourceDate?: string; date: string; title: string; note: string; status: PlanStatus },
  nowIso = new Date().toISOString(),
): { months: CalendarStateMap; touched: string[]; plan: WorkPlan } {
  const targetMonth = monthKeyOf(input.date);
  const sourceDate = input.sourceDate || input.date;
  const sourceMonth = monthKeyOf(sourceDate);
  const sourceBucket = months[sourceMonth] ?? { records: [], plans: [] };
  const existing = input.id ? sourceBucket.plans.find(p => p.id === input.id) : undefined;
  const completedAt =
    input.status === 'done'
      ? existing?.status === 'done' && existing.completedAt
        ? existing.completedAt
        : nowIso
      : undefined;

  const plan: WorkPlan = {
    id: existing?.id || input.id || createEntryId('plan'),
    date: input.date,
    title: input.title.trim(),
    note: input.note.trim(),
    status: input.status,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    ...(completedAt ? { completedAt } : {}),
  };

  if (existing && sourceMonth !== targetMonth) {
    const targetBucket = months[targetMonth] ?? { records: [], plans: [] };
    return {
      months: {
        ...months,
        [sourceMonth]: { ...sourceBucket, plans: sourceBucket.plans.filter(p => p.id !== plan.id) },
        [targetMonth]: { ...targetBucket, plans: [plan, ...targetBucket.plans] },
      },
      touched: [sourceMonth, targetMonth],
      plan,
    };
  }

  const targetBucket = months[targetMonth] ?? { records: [], plans: [] };
  const nextPlans = existing
    ? targetBucket.plans.map(p => (p.id === plan.id ? plan : p))
    : [plan, ...targetBucket.plans];
  return {
    months: {
      ...months,
      [targetMonth]: { ...targetBucket, plans: nextPlans },
    },
    touched: [targetMonth],
    plan,
  };
}

export function deleteWorkPlan(
  months: CalendarStateMap,
  date: string,
  id: string,
): { months: CalendarStateMap; touched: string[]; removed: WorkPlan | null } {
  const month = monthKeyOf(date);
  const existingBucket = months[month];
  if (!existingBucket) return { months, touched: [], removed: null };
  const removed = existingBucket.plans.find(p => p.id === id) ?? null;
  if (!removed) return { months, touched: [], removed: null };
  return {
    months: {
      ...months,
      [month]: { ...existingBucket, plans: existingBucket.plans.filter(p => p.id !== id) },
    },
    touched: [month],
    removed,
  };
}

export function getDayItems(months: CalendarStateMap, date: string): { records: WorkRecord[]; plans: WorkPlan[] } {
  const bucket = months[monthKeyOf(date)];
  if (!bucket) return { records: [], plans: [] };
  return {
    records: bucket.records.filter(r => r.date === date),
    plans: bucket.plans.filter(p => p.date === date),
  };
}

export function getAllRecords(months: CalendarStateMap): WorkRecord[] {
  return Object.values(months)
    .flatMap(b => b.records)
    .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.updatedAt.localeCompare(a.updatedAt)));
}

export function getAllPlans(months: CalendarStateMap): WorkPlan[] {
  return Object.values(months)
    .flatMap(b => b.plans)
    .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : b.updatedAt.localeCompare(a.updatedAt)));
}
