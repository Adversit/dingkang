'use client';

import { useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildMonthGrid,
  formatDateHeading,
  formatMonthHeading,
  getAllPlans,
  getAllRecords,
  getDayItems,
  type PlanStatus,
  type WorkPlan,
  type WorkRecord,
} from '@/lib/hub/workspace-calendar';
import type { useWorkspaceCalendar } from '@/lib/hub/use-workspace-calendar';
import styles from './WorkspaceCalendar.module.css';

type CalendarController = ReturnType<typeof useWorkspaceCalendar>;

type Props = {
  calendar: CalendarController;
  authenticated: boolean;
  onSignIn: () => void;
};

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const STATUS_LABELS: Record<PlanStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
};

export default function WorkspaceCalendar({ calendar, authenticated, onSignIn }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'record' | 'plan';
    item: WorkRecord | WorkPlan;
  } | null>(null);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);

  const {
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
  } = calendar;

  const grid = buildMonthGrid(currentMonth);
  const { records: dayRecords, plans: dayPlans } = getDayItems(months, selectedDate);
  const { records: todayRecords, plans: todayPlans } = getDayItems(months, today);
  const allRecords = getAllRecords(months);
  const allPlans = getAllPlans(months);
  const upcomingPlans = allPlans
    .filter(plan => plan.status !== 'done')
    .sort((a, b) => a.date.localeCompare(b.date));
  const donePlans = allPlans.filter(plan => plan.status === 'done');
  const todayOpenPlans = todayPlans.filter(plan => plan.status !== 'done');

  return (
    <section className={styles.workspace} aria-label="个人工作台与日历">
      {/* 今日工作台概览 */}
      <div className={styles.todayBar} data-calendar-surface="true">
        <div className={styles.todayIdentity}>
          <span className={styles.todayBadge}>
            <CalendarDays size={18} />
            <span>今日 · {formatDateHeading(today)}</span>
          </span>
          <div className={styles.todayStats}>
            <span>待办计划 {todayOpenPlans.length} 项</span>
            <span>今日记录 {todayRecords.length} 条</span>
            {loading && (
              <span className={styles.statusChip}>
                <LoaderCircle size={15} className="hub-spin" />
                正在读取…
              </span>
            )}
            {saving && (
              <span className={styles.statusChip}>
                <LoaderCircle size={15} className="hub-spin" />
                正在保存…
              </span>
            )}
            {!saving && saveNotice && (
              <span className={`${styles.statusChip} ${styles.savedChip}`} role="status">
                <Check size={15} />
                {saveNotice}
              </span>
            )}
          </div>
        </div>
        <div className={styles.todayActions}>
          <button
            type="button"
            className="hub-button primary"
            onClick={() => {
              selectDate(today);
              openNewRecord(today);
            }}
            disabled={!authenticated || saving}
          >
            <Plus size={18} />
            记录今天
          </button>
          <button
            type="button"
            className="hub-button"
            onClick={() => {
              selectDate(today);
              openNewPlan(today);
            }}
            disabled={!authenticated || saving}
          >
            <Plus size={18} />
            添加计划
          </button>
          {selectedDate !== today && (
            <button type="button" className="hub-button" onClick={goToday}>
              回到今天
            </button>
          )}
        </div>
      </div>

      {!authenticated && (
        <div className={styles.guestNotice}>
          <ShieldCheck size={20} />
          <p>登录后可保存每日工作记录、未来计划并跨设备同步。</p>
          <button type="button" className="hub-button primary" onClick={onSignIn}>
            登录
          </button>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          <p>{error}</p>
          {conflict ? (
            <div className={styles.conflictActions}>
              <button
                type="button"
                className="hub-button primary"
                disabled={saving}
                onClick={() => void resolveConflictOverwrite()}
              >
                保留我的修改并覆盖
              </button>
              <button
                type="button"
                className="hub-button"
                disabled={saving}
                onClick={resolveConflictAdoptCloud}
              >
                <RefreshCw size={15} />
                读取云端最新内容
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.gridLayout}>
        {/* 主区：月历 + 选中日期详情 */}
        <div className={styles.primaryColumn}>
          <div className={styles.calendarCard} data-calendar-surface="true">
            <div className={styles.monthHeader}>
              <h2>{formatMonthHeading(currentMonth)}</h2>
              <div className={styles.monthNav}>
                <button
                  type="button"
                  className={styles.navIconBtn}
                  onClick={() => stepMonth(-1)}
                  aria-label="上一月"
                >
                  <ChevronLeft size={19} />
                </button>
                <button type="button" className={styles.todayBtn} onClick={goToday}>
                  今天
                </button>
                <button
                  type="button"
                  className={styles.navIconBtn}
                  onClick={() => stepMonth(1)}
                  aria-label="下一月"
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>

            <div className={styles.weekdayRow} aria-hidden="true">
              {WEEKDAYS.map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className={styles.dayGrid} role="grid" aria-label={formatMonthHeading(currentMonth)}>
              {grid.map(cell => {
                const items = getDayItems(months, cell.date);
                const recordCount = items.records.length;
                const openPlanCount = items.plans.filter(p => p.status !== 'done').length;
                const donePlanCount = items.plans.filter(p => p.status === 'done').length;
                const isToday = cell.date === today;
                const isSelected = cell.date === selectedDate;
                const labelParts = [
                  formatDateHeading(cell.date),
                  isToday ? '今天' : '',
                  recordCount ? `${recordCount}条工作记录` : '',
                  openPlanCount ? `${openPlanCount}项待办计划` : '',
                  donePlanCount ? `${donePlanCount}项已完成` : '',
                ].filter(Boolean);

                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={`${styles.dayCell} ${cell.inCurrentMonth ? '' : styles.outsideMonth} ${isToday ? styles.isToday : ''} ${isSelected ? styles.isSelected : ''}`}
                    onClick={() => selectDate(cell.date)}
                    aria-pressed={isSelected}
                    aria-label={labelParts.join('，')}
                  >
                    <span className={styles.dayNumber}>{cell.day}</span>
                    <span className={styles.dayMarkers} aria-hidden="true">
                      {recordCount > 0 && <i className={styles.markerRecord} />}
                      {openPlanCount > 0 && <i className={styles.markerPlan} />}
                      {openPlanCount === 0 && donePlanCount > 0 && <i className={styles.markerDone} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 选中日期详情 */}
          <div className={styles.detailCard} data-calendar-surface="true" aria-label="选中日期详情">
            <div className={styles.detailHeader}>
              <div>
                <h3>{formatDateHeading(selectedDate)}</h3>
                <p className={styles.detailMeta}>
                  {dayRecords.length} 条记录 · {dayPlans.length} 项计划
                </p>
              </div>
              <div className={styles.detailActions}>
                <button
                  type="button"
                  className="hub-button"
                  disabled={!authenticated || saving}
                  onClick={() => openNewRecord(selectedDate)}
                >
                  <Plus size={16} />
                  新增记录
                </button>
                <button
                  type="button"
                  className="hub-button"
                  disabled={!authenticated || saving}
                  onClick={() => openNewPlan(selectedDate)}
                >
                  <Plus size={16} />
                  新建计划
                </button>
              </div>
            </div>

            {draft && (
              <form
                className={styles.editorForm}
                onSubmit={event => {
                  event.preventDefault();
                  void submitDraft();
                }}
              >
                <div className={styles.editorHeader}>
                  <strong>
                    {draft.mode === 'create'
                      ? draft.kind === 'record'
                        ? '新增工作记录'
                        : '新建计划'
                      : draft.kind === 'record'
                        ? '编辑工作记录'
                        : '编辑计划'}
                  </strong>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => setDraft(null)}
                    aria-label="取消编辑"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.formFields}>
                  <label>
                    <span>日期</span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={event => setDraft({ ...draft, date: event.target.value })}
                      required
                    />
                  </label>

                  {draft.kind === 'plan' && (
                    <label>
                      <span>状态</span>
                      <select
                        value={draft.status}
                        onChange={event =>
                          setDraft({ ...draft, status: event.target.value as PlanStatus })
                        }
                      >
                        <option value="todo">待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="done">已完成</option>
                      </select>
                    </label>
                  )}

                  <label className={styles.fullWidth}>
                    <span>标题</span>
                    <input
                      type="text"
                      placeholder={
                        draft.kind === 'record' ? '今天完成了什么' : '接下来要推进的事'
                      }
                      value={draft.title}
                      onChange={event => setDraft({ ...draft, title: event.target.value })}
                      maxLength={120}
                      required
                    />
                  </label>

                  <label className={styles.fullWidth}>
                    <span>备注</span>
                    <textarea
                      rows={3}
                      placeholder="补充细节、关键结论或下一步（可选）"
                      value={draft.note}
                      onChange={event => setDraft({ ...draft, note: event.target.value })}
                      maxLength={1000}
                    />
                  </label>
                </div>

                <div className={styles.formActions}>
                  <button type="button" className="hub-button" onClick={() => setDraft(null)}>
                    取消
                  </button>
                  <button type="submit" className="hub-button primary" disabled={saving}>
                    {saving ? <LoaderCircle size={16} className="hub-spin" /> : <Check size={16} />}
                    {saving ? '保存中…' : '保存'}
                  </button>
                </div>
              </form>
            )}

            {confirmDelete && (
              <div className={styles.deleteConfirm} role="alertdialog" aria-label="确认删除">
                <p>
                  确认删除「{confirmDelete.item.title}」？
                </p>
                <div>
                  <button
                    type="button"
                    className="hub-button"
                    onClick={() => setConfirmDelete(null)}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="hub-button primary"
                    disabled={saving}
                    onClick={async () => {
                      const target = confirmDelete;
                      setConfirmDelete(null);
                      if (target.kind === 'record') await removeRecord(target.item as WorkRecord);
                      else await removePlan(target.item as WorkPlan);
                    }}
                  >
                    确认删除
                  </button>
                </div>
              </div>
            )}

            <div className={styles.detailLists}>
              <div className={styles.subSection}>
                <h4>工作记录</h4>
                {dayRecords.length === 0 ? (
                  <p className={styles.emptyText}>这一天还没有工作记录。</p>
                ) : (
                  <ul className={styles.entryList}>
                    {dayRecords.map(record => (
                      <li key={record.id} className={styles.entryItem}>
                        <div className={styles.entryBody}>
                          <strong>{record.title}</strong>
                          {record.note && <p>{record.note}</p>}
                        </div>
                        <div className={styles.entryActions}>
                          <button
                            type="button"
                            aria-label={`编辑记录 ${record.title}`}
                            disabled={!authenticated || saving}
                            onClick={() => openEditRecord(record)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={`删除记录 ${record.title}`}
                            disabled={!authenticated || saving}
                            onClick={() => setConfirmDelete({ kind: 'record', item: record })}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.subSection}>
                <h4>计划</h4>
                {dayPlans.length === 0 ? (
                  <p className={styles.emptyText}>这一天还没有安排计划。</p>
                ) : (
                  <ul className={styles.entryList}>
                    {dayPlans.map(plan => (
                      <li key={plan.id} className={styles.entryItem}>
                        <button
                          type="button"
                          className={styles.statusToggle}
                          disabled={!authenticated || saving}
                          aria-label={
                            plan.status === 'done'
                              ? `将 ${plan.title} 标为待办`
                              : `将 ${plan.title} 标为已完成`
                          }
                          onClick={() =>
                            void cyclePlanStatus(plan, plan.status === 'done' ? 'todo' : 'done')
                          }
                        >
                          {plan.status === 'done' ? (
                            <CheckCircle2 size={20} />
                          ) : plan.status === 'in_progress' ? (
                            <Clock3 size={20} />
                          ) : (
                            <Circle size={20} />
                          )}
                        </button>
                        <div className={styles.entryBody}>
                          <div className={styles.planTitleRow}>
                            <strong className={plan.status === 'done' ? styles.doneTitle : ''}>
                              {plan.title}
                            </strong>
                            <span className={styles.planBadge} data-status={plan.status}>
                              {STATUS_LABELS[plan.status]}
                            </span>
                          </div>
                          {plan.note && <p>{plan.note}</p>}
                        </div>
                        <div className={styles.entryActions}>
                          <button
                            type="button"
                            aria-label={`编辑或改期计划 ${plan.title}`}
                            disabled={!authenticated || saving}
                            onClick={() => openEditPlan(plan)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={`删除计划 ${plan.title}`}
                            disabled={!authenticated || saving}
                            onClick={() => setConfirmDelete({ kind: 'plan', item: plan })}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 副区：近期时间线与未来计划（移动端可折叠） */}
        <aside className={styles.timelineColumn} aria-label="近期时间线与未来计划">
          <button
            type="button"
            className={styles.mobileCollapseBtn}
            aria-expanded={mobileTimelineOpen}
            onClick={() => setMobileTimelineOpen(prev => !prev)}
          >
            <span>近期时间线与未来计划（{upcomingPlans.length} 项待办）</span>
            <ChevronDown size={18} className={mobileTimelineOpen ? styles.rotated : ''} />
          </button>

          <div
            className={`${styles.timelinePanel} ${mobileTimelineOpen ? styles.mobileOpen : ''}`}
            data-calendar-surface="true"
          >
            <div className={styles.timelineTabs} role="tablist" aria-label="时间线视图">
              <button
                type="button"
                role="tab"
                aria-selected={timelineTab === 'upcoming'}
                className={timelineTab === 'upcoming' ? styles.activeTab : ''}
                onClick={() => setTimelineTab('upcoming')}
              >
                待完成 ({upcomingPlans.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={timelineTab === 'done'}
                className={timelineTab === 'done' ? styles.activeTab : ''}
                onClick={() => setTimelineTab('done')}
              >
                已完成 ({donePlans.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={timelineTab === 'recent'}
                className={timelineTab === 'recent' ? styles.activeTab : ''}
                onClick={() => setTimelineTab('recent')}
              >
                近期记录 ({allRecords.length})
              </button>
            </div>

            <div className={styles.timelineBody}>
              {timelineTab === 'upcoming' &&
                (upcomingPlans.length === 0 ? (
                  <p className={styles.emptyText}>暂无待完成计划。</p>
                ) : (
                  <ul className={styles.timelineList}>
                    {upcomingPlans.slice(0, 12).map(plan => (
                      <li key={plan.id}>
                        <button
                          type="button"
                          className={styles.timelineItemBtn}
                          onClick={() => selectDate(plan.date)}
                        >
                          <span className={styles.timelineDate}>{plan.date}</span>
                          <strong>{plan.title}</strong>
                          <span className={styles.planBadge} data-status={plan.status}>
                            {STATUS_LABELS[plan.status]}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}

              {timelineTab === 'done' &&
                (donePlans.length === 0 ? (
                  <p className={styles.emptyText}>还没有已完成的计划。</p>
                ) : (
                  <ul className={styles.timelineList}>
                    {donePlans.slice(0, 12).map(plan => (
                      <li key={plan.id}>
                        <button
                          type="button"
                          className={styles.timelineItemBtn}
                          onClick={() => selectDate(plan.date)}
                        >
                          <span className={styles.timelineDate}>{plan.date}</span>
                          <strong className={styles.doneTitle}>{plan.title}</strong>
                          <span className={styles.planBadge} data-status="done">
                            已完成
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}

              {timelineTab === 'recent' &&
                (allRecords.length === 0 ? (
                  <p className={styles.emptyText}>还没有工作记录。</p>
                ) : (
                  <ul className={styles.timelineList}>
                    {allRecords.slice(0, 12).map(record => (
                      <li key={record.id}>
                        <button
                          type="button"
                          className={styles.timelineItemBtn}
                          onClick={() => selectDate(record.date)}
                        >
                          <span className={styles.timelineDate}>{record.date}</span>
                          <strong>{record.title}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
