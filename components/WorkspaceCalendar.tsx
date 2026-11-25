'use client';

import { useEffect, useState } from 'react';
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
  Flame,
  Layers,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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
  const [clockText, setClockText] = useState<string>('--:--:--');

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

  useEffect(() => {
    const updateClock = () => {
      try {
        const formatted = new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date());
        setClockText(formatted);
      } catch {
        setClockText(new Date().toTimeString().slice(0, 8));
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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
  const currentFocusPlan =
    todayOpenPlans.find(p => p.status === 'in_progress') ||
    todayOpenPlans[0] ||
    upcomingPlans[0] ||
    null;

  const [, todayM, todayD] = today.split('-').map(Number);
  const monthShort = `${todayM || 1}月`;
  const totalPlansCount = allPlans.length || 1;
  const doneRatio = Math.round((donePlans.length / totalPlansCount) * 100);

  return (
    <section className={styles.workspace} aria-label="个人工作台与日历">
      {/* 顶部 Bento 状态舱：日历矩阵徽章 + 今日脉搏 + 实时时钟 + 快捷主操作 */}
      <div className={styles.commandDeck} data-calendar-surface="true">
        <div className={styles.dateBadgeGroup}>
          <div className={styles.miniMatrixCard} aria-hidden="true">
            <div className={styles.miniMatrixTop}>
              <i />
              <i />
            </div>
            <div className={styles.miniMatrixDots}>
              {Array.from({ length: 14 }).map((_, idx) => (
                <span
                  key={idx}
                  className={idx === (todayD % 14) ? styles.miniDotActive : ''}
                />
              ))}
            </div>
          </div>
          <div className={styles.datePillReadout}>
            <div className={styles.dateMonthDay}>
              <span className={styles.dateMonthTag}>{monthShort}</span>
              <strong className={styles.dateDayNum}>{String(todayD).padStart(2, '0')}</strong>
            </div>
            <span className={styles.dateDivider} aria-hidden="true" />
            <div className={styles.dateTextBlock}>
              <span className={styles.todayHeading}>今日 · {formatDateHeading(today)}</span>
              <div className={styles.telemetryPills}>
                <span className={styles.telemetryPill}>
                  <i className={styles.orbBlue} />
                  待办 {upcomingPlans.length}
                </span>
                <span className={styles.telemetryPill}>
                  <i className={styles.orbEmerald} />
                  已完成 {donePlans.length}
                </span>
                <span className={styles.telemetryPill}>
                  <i className={styles.orbAmber} />
                  记录 {allRecords.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.clockAndStatus}>
          <div className={styles.digitalClock} aria-label="当前时间">
            <Clock3 size={15} />
            <span>{clockText}</span>
          </div>
          {loading && (
            <span className={styles.statusChip}>
              <LoaderCircle size={15} className="hub-spin" />
              同步中
            </span>
          )}
          {saving && (
            <span className={styles.statusChip}>
              <LoaderCircle size={15} className="hub-spin" />
              保存中
            </span>
          )}
          {!saving && saveNotice && (
            <span className={`${styles.statusChip} ${styles.savedChip}`} role="status">
              <Check size={15} />
              {saveNotice}
            </span>
          )}
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
        <div className={styles.guestNotice} data-calendar-surface="true">
          <div className={styles.guestIconWrap}>
            <ShieldCheck size={20} />
          </div>
          <p>登录私人空间后，即可记录每日进展、规划未来日程并在多端实时同步。</p>
          <button type="button" className="hub-button primary" onClick={onSignIn}>
            立即登录
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

      {/* 三栏 Bento 工作台网格：左月历矩阵 + 中选中日操作舱 + 右当前焦点与时间线 */}
      <div className={styles.bentoGrid}>
        {/* 1. 月历矩阵卡 */}
        <div className={styles.calendarCard} data-calendar-surface="true">
          <div className={styles.cardEyebrow}>
            <span><CalendarDays size={15} /> 月历视图</span>
            <span className={styles.monthTag}>{currentMonth}</span>
          </div>
          <div className={styles.monthHeader}>
            <h2>{formatMonthHeading(currentMonth)}</h2>
            <div className={styles.monthNav}>
              <button
                type="button"
                className={styles.navIconBtn}
                onClick={() => stepMonth(-1)}
                aria-label="上一月"
              >
                <ChevronLeft size={18} />
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
                <ChevronRight size={18} />
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

          <div className={styles.calendarLegend} aria-hidden="true">
            <span><i className={styles.markerRecord} /> 工作记录</span>
            <span><i className={styles.markerPlan} /> 待办计划</span>
            <span><i className={styles.markerDone} /> 已完成</span>
          </div>
        </div>

        {/* 2. 选中日期详情与编辑舱 */}
        <div className={styles.detailCard} data-calendar-surface="true" aria-label="选中日期详情">
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.cardEyebrow}>
                <span>
                  <Layers size={15} />
                  {selectedDate === today ? '今日工作焦点' : '单日档案'}
                </span>
              </div>
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
              <p>确认删除「{confirmDelete.item.title}」？</p>
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
              <div className={styles.subSectionHeader}>
                <h4>工作记录</h4>
                <span>{dayRecords.length}</span>
              </div>
              {dayRecords.length === 0 ? (
                <div className={styles.emptyBox}>
                  <p className={styles.emptyText}>这一天还没有工作记录。</p>
                </div>
              ) : (
                <ul className={styles.entryList}>
                  {dayRecords.map(record => (
                    <li key={record.id} className={styles.entryItem}>
                      <span className={styles.entryAccentBar} aria-hidden="true" />
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
              <div className={styles.subSectionHeader}>
                <h4>计划安排</h4>
                <span>{dayPlans.length}</span>
              </div>
              {dayPlans.length === 0 ? (
                <div className={styles.emptyBox}>
                  <p className={styles.emptyText}>这一天还没有安排计划。</p>
                </div>
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

        {/* 3. 右侧：当前焦点计划卡 + 纵向时间线轨 */}
        <aside className={styles.timelineColumn} aria-label="近期时间线与未来计划">
          {/* 当前焦点卡片（借鉴参考站计划列表卡片的网格底纹与分段进度条） */}
          <div className={styles.focusPlanCard} data-calendar-surface="true">
            <div className={styles.focusPlanTop}>
              <span className={styles.focusTitle}>
                <Flame size={16} />
                当前焦点
              </span>
              <span className={styles.focusLeftBadge}>
                {upcomingPlans.length} 项待推进
              </span>
            </div>

            {currentFocusPlan ? (
              <button
                type="button"
                className={styles.focusHighlightBox}
                onClick={() => selectDate(currentFocusPlan.date)}
              >
                <span className={styles.focusPulseDot} aria-hidden="true" />
                <div className={styles.focusHighlightText}>
                  <strong>{currentFocusPlan.title}</strong>
                  <span>{currentFocusPlan.date} · {STATUS_LABELS[currentFocusPlan.status]}</span>
                </div>
              </button>
            ) : (
              <div className={styles.focusEmptyBox}>
                <Sparkles size={17} />
                <span>今天还没有待办焦点，点击上方「添加计划」开启新目标。</span>
              </div>
            )}

            <div className={styles.segmentedBar} aria-hidden="true">
              {Array.from({ length: 7 }).map((_, idx) => {
                const active = idx < Math.max(1, Math.round((doneRatio / 100) * 7));
                return (
                  <span
                    key={idx}
                    className={active ? styles.segmentActive : styles.segmentIdle}
                  />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className={styles.mobileCollapseBtn}
            aria-expanded={mobileTimelineOpen}
            onClick={() => setMobileTimelineOpen(prev => !prev)}
          >
            <span>近期时间线与计划列表（{upcomingPlans.length} 项待办）</span>
            <ChevronDown size={18} className={mobileTimelineOpen ? styles.rotated : ''} />
          </button>

          <div
            className={`${styles.timelinePanel} ${mobileTimelineOpen ? styles.mobileOpen : ''}`}
            data-calendar-surface="true"
          >
            <div className={styles.timelineWatermark} aria-hidden="true">
              {currentMonth.slice(0, 4)}
            </div>

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
                          <span className={styles.timelineNodeDot} data-node="plan" />
                          <span className={styles.timelineDate}>{plan.date.slice(5)}</span>
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
                          <span className={styles.timelineNodeDot} data-node="done" />
                          <span className={styles.timelineDate}>{plan.date.slice(5)}</span>
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
                          <span className={styles.timelineNodeDot} data-node="record" />
                          <span className={styles.timelineDate}>{record.date.slice(5)}</span>
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
