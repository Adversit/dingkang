'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WORKSPACE_CALENDAR_MODULE_ID,
  deleteWorkPlan,
  deleteWorkRecord,
  getTodayDate,
  monthKeyOf,
  parseCalendarValues,
  serializeCalendarValues,
  shiftMonth,
  upsertWorkPlan,
  upsertWorkRecord,
  type CalendarStateMap,
  type PlanStatus,
  type WorkPlan,
  type WorkRecord,
} from './workspace-calendar';

export type CalendarSession = {
  authenticated: boolean;
  userId?: string;
  displayName?: string;
} | null;

export type CalendarDraft =
  | {
      kind: 'record';
      mode: 'create' | 'edit';
      id?: string;
      date: string;
      title: string;
      note: string;
    }
  | {
      kind: 'plan';
      mode: 'create' | 'edit';
      id?: string;
      sourceDate?: string;
      date: string;
      title: string;
      note: string;
      status: PlanStatus;
    };

type StoredState = {
  values: Record<string, string>;
  revision: number;
  updatedAt: string | null;
};

type ConflictState = {
  latestValues: Record<string, string>;
  latestRevision: number;
  latestUpdatedAt: string | null;
  pendingOp:
    | { type: 'upsert-record'; input: { id?: string; date: string; title: string; note: string } }
    | { type: 'delete-record'; date: string; id: string }
    | { type: 'upsert-plan'; input: { id?: string; sourceDate?: string; date: string; title: string; note: string; status: PlanStatus } }
    | { type: 'delete-plan'; date: string; id: string };
};

export function useWorkspaceCalendar(session: CalendarSession, hubReady: boolean) {
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [currentMonth, setCurrentMonth] = useState<string>(monthKeyOf(today));
  const [months, setMonths] = useState<CalendarStateMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [draft, setDraft] = useState<CalendarDraft | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [timelineTab, setTimelineTab] = useState<'upcoming' | 'done' | 'recent'>('upcoming');

  const ownerRef = useRef<string | undefined>(undefined);
  const baseValuesRef = useRef<Record<string, string>>({});
  const revisionRef = useRef<number>(0);
  const monthsRef = useRef<CalendarStateMap>({});
  const loadSeqRef = useRef(0);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  monthsRef.current = months;

  const flashNotice = useCallback((message: string) => {
    setSaveNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setSaveNotice(''), 3200);
  }, []);

  const resetAccountData = useCallback(() => {
    baseValuesRef.current = {};
    revisionRef.current = 0;
    monthsRef.current = {};
    setMonths({});
    setDraft(null);
    setConflict(null);
    setError('');
    setSaveNotice('');
  }, []);

  const loadCalendar = useCallback(async () => {
    const userId = session?.authenticated ? session.userId : undefined;
    if (!userId) {
      ownerRef.current = undefined;
      resetAccountData();
      setLoading(false);
      return;
    }
    const seq = ++loadSeqRef.current;
    ownerRef.current = userId;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/hub/state/${WORKSPACE_CALENDAR_MODULE_ID}`, {
        cache: 'no-store',
        headers: { 'X-Hub-User-Id': userId },
      });
      const body = (await response.json().catch(() => ({}))) as Partial<StoredState> & { error?: string };
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : '暂时无法读取工作台日历。');
      }
      if (seq !== loadSeqRef.current || ownerRef.current !== userId) return;
      const values = body.values && typeof body.values === 'object' ? body.values : {};
      baseValuesRef.current = values;
      revisionRef.current = typeof body.revision === 'number' ? body.revision : 0;
      const parsed = parseCalendarValues(values);
      monthsRef.current = parsed;
      setMonths(parsed);
      setConflict(null);
    } catch (cause) {
      if (seq === loadSeqRef.current && ownerRef.current === userId) {
        setError(cause instanceof Error ? cause.message : '暂时无法读取工作台日历。');
      }
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [resetAccountData, session?.authenticated, session?.userId]);

  useEffect(() => {
    if (!hubReady) return;
    if (session?.userId !== ownerRef.current) {
      resetAccountData();
    }
    void loadCalendar();
  }, [hubReady, session?.authenticated, session?.userId, loadCalendar, resetAccountData]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const applyPendingOp = useCallback(
    (sourceMonths: CalendarStateMap, op: ConflictState['pendingOp']) => {
      if (op.type === 'upsert-record') return upsertWorkRecord(sourceMonths, op.input);
      if (op.type === 'delete-record') return deleteWorkRecord(sourceMonths, op.date, op.id);
      if (op.type === 'upsert-plan') return upsertWorkPlan(sourceMonths, op.input);
      return deleteWorkPlan(sourceMonths, op.date, op.id);
    },
    [],
  );

  const commitOperation = useCallback(
    async (
      op: ConflictState['pendingOp'],
      overrideBase?: { values: Record<string, string>; revision: number },
    ): Promise<boolean> => {
      const userId = session?.authenticated ? session.userId : undefined;
      if (!userId) {
        setError('请先登录私人空间后再保存日历记录。');
        return false;
      }
      const baseValues = overrideBase ? overrideBase.values : baseValuesRef.current;
      const expectedRevision = overrideBase ? overrideBase.revision : revisionRef.current;
      const baseMonths = overrideBase ? parseCalendarValues(baseValues) : monthsRef.current;
      const result = applyPendingOp(baseMonths, op);
      const nextValues = serializeCalendarValues(baseValues, result.months, result.touched);

      setSaving(true);
      setError('');
      try {
        const response = await fetch(`/api/hub/state/${WORKSPACE_CALENDAR_MODULE_ID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-User-Id': userId,
          },
          body: JSON.stringify({
            values: nextValues,
            expectedRevision,
          }),
        });
        const body = (await response.json().catch(() => ({}))) as Partial<StoredState> & {
          error?: string;
          current?: StoredState;
        };
        if (ownerRef.current !== userId) return false;

        if (response.status === 409) {
          let latest = body.current;
          if (!latest) {
            const freshRes = await fetch(`/api/hub/state/${WORKSPACE_CALENDAR_MODULE_ID}`, {
              cache: 'no-store',
              headers: { 'X-Hub-User-Id': userId },
            });
            if (freshRes.ok) {
              latest = (await freshRes.json()) as StoredState;
            }
          }
          setConflict({
            latestValues: latest?.values ?? baseValues,
            latestRevision: latest?.revision ?? expectedRevision,
            latestUpdatedAt: latest?.updatedAt ?? null,
            pendingOp: op,
          });
          setError('另一处更新了日历数据，已保留你的当前输入。请确认如何处理。');
          return false;
        }

        if (!response.ok) {
          throw new Error(typeof body.error === 'string' ? body.error : '保存失败，请保留当前输入后重试。');
        }

        const savedValues = body.values && typeof body.values === 'object' ? body.values : nextValues;
        baseValuesRef.current = savedValues;
        revisionRef.current = typeof body.revision === 'number' ? body.revision : expectedRevision + 1;
        const parsed = parseCalendarValues(savedValues);
        monthsRef.current = parsed;
        setMonths(parsed);
        setConflict(null);
        flashNotice('已保存到云端');
        return true;
      } catch (cause) {
        if (ownerRef.current === userId) {
          setError(cause instanceof Error ? cause.message : '保存失败，请重试。');
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [applyPendingOp, flashNotice, session?.authenticated, session?.userId],
  );

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setCurrentMonth(monthKeyOf(date));
  }, []);

  const goToday = useCallback(() => {
    const nowToday = getTodayDate();
    setSelectedDate(nowToday);
    setCurrentMonth(monthKeyOf(nowToday));
  }, []);

  const stepMonth = useCallback((delta: number) => {
    setCurrentMonth(prev => shiftMonth(prev, delta));
  }, []);

  const openNewRecord = useCallback((date: string) => {
    setDraft({ kind: 'record', mode: 'create', date, title: '', note: '' });
    setError('');
  }, []);

  const openEditRecord = useCallback((record: WorkRecord) => {
    setDraft({
      kind: 'record',
      mode: 'edit',
      id: record.id,
      date: record.date,
      title: record.title,
      note: record.note,
    });
    setError('');
  }, []);

  const openNewPlan = useCallback((date: string) => {
    setDraft({ kind: 'plan', mode: 'create', date, title: '', note: '', status: 'todo' });
    setError('');
  }, []);

  const openEditPlan = useCallback((plan: WorkPlan) => {
    setDraft({
      kind: 'plan',
      mode: 'edit',
      id: plan.id,
      sourceDate: plan.date,
      date: plan.date,
      title: plan.title,
      note: plan.note,
      status: plan.status,
    });
    setError('');
  }, []);

  const submitDraft = useCallback(async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError('请填写标题。');
      return;
    }
    const op: ConflictState['pendingOp'] =
      draft.kind === 'record'
        ? {
            type: 'upsert-record',
            input: { id: draft.id, date: draft.date, title: draft.title, note: draft.note },
          }
        : {
            type: 'upsert-plan',
            input: {
              id: draft.id,
              sourceDate: draft.sourceDate,
              date: draft.date,
              title: draft.title,
              note: draft.note,
              status: draft.status,
            },
          };
    const ok = await commitOperation(op);
    if (ok) {
      setSelectedDate(draft.date);
      setCurrentMonth(monthKeyOf(draft.date));
      setDraft(null);
    }
  }, [commitOperation, draft]);

  const removeRecord = useCallback(
    async (record: WorkRecord) => {
      await commitOperation({ type: 'delete-record', date: record.date, id: record.id });
    },
    [commitOperation],
  );

  const removePlan = useCallback(
    async (plan: WorkPlan) => {
      await commitOperation({ type: 'delete-plan', date: plan.date, id: plan.id });
    },
    [commitOperation],
  );

  const cyclePlanStatus = useCallback(
    async (plan: WorkPlan, nextStatus: PlanStatus) => {
      await commitOperation({
        type: 'upsert-plan',
        input: {
          id: plan.id,
          sourceDate: plan.date,
          date: plan.date,
          title: plan.title,
          note: plan.note,
          status: nextStatus,
        },
      });
    },
    [commitOperation],
  );

  const resolveConflictOverwrite = useCallback(async () => {
    if (!conflict) return;
    const ok = await commitOperation(conflict.pendingOp, {
      values: conflict.latestValues,
      revision: conflict.latestRevision,
    });
    if (ok && draft) {
      setSelectedDate(draft.date);
      setCurrentMonth(monthKeyOf(draft.date));
      setDraft(null);
    }
  }, [commitOperation, conflict, draft]);

  const resolveConflictAdoptCloud = useCallback(() => {
    if (!conflict) return;
    baseValuesRef.current = conflict.latestValues;
    revisionRef.current = conflict.latestRevision;
    const parsed = parseCalendarValues(conflict.latestValues);
    monthsRef.current = parsed;
    setMonths(parsed);
    setConflict(null);
    setDraft(null);
    setError('');
    flashNotice('已加载云端最新日历');
  }, [conflict, flashNotice]);

  return {
    today,
    selectedDate,
    currentMonth,
    months,
    loading,
    saving,
    error,
    saveNotice,
    draft,
    conflict,
    timelineTab,
    setTimelineTab,
    setDraft,
    setError,
    selectDate,
    goToday,
    stepMonth,
    openNewRecord,
    openEditRecord,
    openNewPlan,
    openEditPlan,
    submitDraft,
    removeRecord,
    removePlan,
    cyclePlanStatus,
    resolveConflictOverwrite,
    resolveConflictAdoptCloud,
    reload: loadCalendar,
  };
}
