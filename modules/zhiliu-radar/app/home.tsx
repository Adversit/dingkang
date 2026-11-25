'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  FileText,
  LoaderCircle,
  Newspaper,
  Plus,
  Radar,
  RefreshCw,
  Rss,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  shanghaiDate,
  type Event,
  type Source,
} from '@/modules/zhiliu-radar/lib/domain';

type View = 'feed' | 'digests' | 'sources';

const CATEGORY_BADGE: Record<string, string> = {
  'AI 产品': 'badge-purple',
  'Agent 工程': 'badge-blue',
  '软件工程': 'badge-emerald',
  '北京招聘': 'badge-amber',
  '一人公司': 'badge-rose',
};

function makeReqId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), x =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}

function formatPubDate(iso: string | null | undefined, today: string): string {
  if (!iso) return '近期';
  const d = shanghaiDate(iso);
  if (d === today) {
    return (
      '今天 ' +
      new Date(iso).toLocaleTimeString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    );
  }
  return d.slice(5).replace('-', '月') + '日';
}

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<View>('feed');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [collectProgress, setCollectProgress] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Feed filters
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [filterMode, setFilterMode] = useState<'all' | 'saved' | 'unread'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Digest state
  const [selectedDigestId, setSelectedDigestId] = useState<string>('');
  const [digestDraft, setDigestDraft] = useState<string>('');
  const [editingDigest, setEditingDigest] = useState(false);

  // New source form
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceCategory, setSourceCategory] = useState<string>(CATEGORIES[0]);

  async function load() {
    const res = await fetch('/api/m/zhiliu-radar/radar', { cache: 'no-store' });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || '暂时无法读取知流数据，请确认已登录。');
    setData(json);
    if (json.digests?.length && !selectedDigestId) {
      setSelectedDigestId(json.digests[0].id);
      setDigestDraft(json.digests[0].content || '');
    }
    return json;
  }

  useEffect(() => {
    load()
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  async function act(action: string, payload: Record<string, unknown> = {}, notice = '操作已完成') {
    if (busy) return null;
    setBusy(action);
    setError('');
    try {
      const res = await fetch('/api/m/zhiliu-radar/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId: makeReqId(), ...payload }),
      });
      const result: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || '请求未完成');
      const fresh = await load();
      if (notice) setToast(result.message || notice);
      return { result, fresh };
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
      return null;
    } finally {
      setBusy('');
    }
  }

  async function ingestAll() {
    if (busy) return;
    setBusy('ingest');
    setError('');
    setCollectProgress('正在连接信源…');
    let cycleId: string | undefined;
    let inserted = 0;
    try {
      for (let batch = 0; batch < 80; batch++) {
        const res = await fetch('/api/m/zhiliu-radar/radar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: batch === 0 && !data?.sources?.length ? 'initialize' : 'ingest',
            requestId: makeReqId(),
            cycleId,
          }),
        });
        const r: any = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(r.error || '采集失败');
        if (r.busy) {
          setToast(r.message || '后台正在采集');
          break;
        }
        inserted += r.inserted || 0;
        setCollectProgress(`正在采集 (${r.completedSources || 0}/${r.totalSources || 0})`);
        if (!r.hasMore) {
          setToast(`采集完成 · 新增 ${inserted} 条资讯`);
          break;
        }
        cycleId = r.cycleId;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '采集中断，可稍后重试');
      await load().catch(() => {});
    } finally {
      setBusy('');
      setCollectProgress('');
    }
  }

  const events: Event[] = data?.events || [];
  const sources: Source[] = data?.sources || [];
  const digests: any[] = data?.digests || [];
  const today: string = data?.today || shanghaiDate();

  const savedEvents = useMemo(
    () => events.filter(e => e.feedback.includes('saved')),
    [events],
  );

  const filteredEvents = useMemo(() => {
    return events
      .filter(e => {
        if (category !== '全部' && e.category !== category) return false;
        if (filterMode === 'saved' && !e.feedback.includes('saved')) return false;
        if (filterMode === 'unread' && e.feedback.includes('read')) return false;
        if (query.trim()) {
          const text = (
            e.displayTitle +
            ' ' +
            e.summary +
            ' ' +
            e.items.flatMap(i => i.sources.map(s => s.name)).join(' ')
          ).toLowerCase();
          if (!text.includes(query.trim().toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [events, category, filterMode, query]);

  const activeEvent = useMemo(
    () => events.find(e => e.id === selectedId) || null,
    [events, selectedId],
  );

  const activeDigest = useMemo(
    () => digests.find(d => d.id === selectedDigestId) || digests[0] || null,
    [digests, selectedDigestId],
  );

  function toggleFeedback(e: Event, kind: 'saved' | 'read' | 'useful') {
    const active = !e.feedback.includes(kind);
    void act(
      'feedback',
      { id: e.id, kind, active },
      active ? (kind === 'saved' ? '已加入收藏' : '已标记') : '已取消标记',
    );
  }

  return (
    <div className="zl-shell">
      {/* 顶部 Bento 导航舱 */}
      <header className="zl-header">
        <div className="zl-brand-group">
          <span className="zl-brand-icon">
            <Radar size={22} />
          </span>
          <div>
            <h1>知流</h1>
            <p>AI 情报雷达与每日简报工作台</p>
          </div>
        </div>

        <nav className="zl-tabs" aria-label="知流主视图">
          <button
            type="button"
            className={view === 'feed' ? 'active' : ''}
            onClick={() => setView('feed')}
          >
            <Newspaper size={17} />
            <span>情报流 ({events.length})</span>
          </button>
          <button
            type="button"
            className={view === 'digests' ? 'active' : ''}
            onClick={() => setView('digests')}
          >
            <FileText size={17} />
            <span>每日简报 ({digests.length})</span>
          </button>
          <button
            type="button"
            className={view === 'sources' ? 'active' : ''}
            onClick={() => setView('sources')}
          >
            <Rss size={17} />
            <span>信源管理 ({sources.length})</span>
          </button>
        </nav>

        <div className="zl-actions">
          <button
            type="button"
            className="zl-btn primary"
            disabled={!!busy}
            onClick={ingestAll}
          >
            {busy === 'ingest' ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            <span>{busy === 'ingest' ? collectProgress || '采集中…' : '一键采集最新情报'}</span>
          </button>
        </div>
      </header>

      <main className="zl-main">
        {error && (
          <div className="zl-alert" role="alert">
            <AlertCircle size={18} />
            <span>
              {error}
              {error.includes('登录') && (
                <>
                  {' '}
                  ·{' '}
                  <a href="/signin-with-chatgpt?return_to=%2Fm%2Fzhiliu-radar" target="_top">
                    立即登录
                  </a>
                </>
              )}
            </span>
            <button type="button" onClick={() => setError('')} aria-label="关闭提示">
              <X size={16} />
            </button>
          </div>
        )}

        {/* 视图 1：情报流 */}
        {view === 'feed' && (
          <div className="zl-feed-container">
            <div className="zl-toolbar-card">
              <div className="zl-category-pills" role="tablist" aria-label="情报分类">
                {['全部', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={category === cat ? 'active' : ''}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="zl-filter-row">
                <label className="zl-search">
                  <Search size={17} />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="搜索模型、Agent、工具或来源名称…"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="清除搜索">
                      <X size={15} />
                    </button>
                  )}
                </label>

                <div className="zl-mode-pills">
                  <button
                    type="button"
                    className={filterMode === 'all' ? 'active' : ''}
                    onClick={() => setFilterMode('all')}
                  >
                    全部 ({events.length})
                  </button>
                  <button
                    type="button"
                    className={filterMode === 'saved' ? 'active' : ''}
                    onClick={() => setFilterMode('saved')}
                  >
                    已收藏 ({savedEvents.length})
                  </button>
                  <button
                    type="button"
                    className={filterMode === 'unread' ? 'active' : ''}
                    onClick={() => setFilterMode('unread')}
                  >
                    未读
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="zl-empty-card">
                <LoaderCircle size={28} className="spin" />
                <h3>正在同步你的 AI 情报流…</h3>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="zl-empty-card">
                <Radar size={36} />
                <h3>{sources.length === 0 ? '还没有配置情报信源' : '当前筛选下暂无情报'}</h3>
                <p>
                  {sources.length === 0
                    ? '点击下方按钮一键导入精选 AI 信源并抓取最新动态。'
                    : '可以切换分类筛选，或点击右上角「一键采集最新情报」。'}
                </p>
                <div className="zl-empty-actions">
                  <button
                    type="button"
                    className="zl-btn primary"
                    disabled={!!busy}
                    onClick={ingestAll}
                  >
                    <Sparkles size={16} />
                    <span>初始化精选信源并采集</span>
                  </button>
                  {sources.length === 0 && (
                    <button
                      type="button"
                      className="zl-btn"
                      disabled={!!busy}
                      onClick={() =>
                        void act('source-import-aihot', {}, '已导入精选 AI 信源库')
                      }
                    >
                      导入 AIHOT 信源目录
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="zl-cards-grid">
                {filteredEvents.map(ev => {
                  const sourceNames = [
                    ...new Set(ev.items.flatMap(i => i.sources.map(s => s.name))),
                  ];
                  const firstUrl = ev.items[0]?.canonical_url || ev.items[0]?.raw_url;
                  const isSaved = ev.feedback.includes('saved');
                  const isRead = ev.feedback.includes('read');

                  return (
                    <article
                      key={ev.id}
                      className={`zl-event-card ${isRead ? 'is-read' : ''}`}
                    >
                      <div className="zl-card-head">
                        <span className={`zl-badge ${CATEGORY_BADGE[ev.category] || 'badge-blue'}`}>
                          {ev.category}
                        </span>
                        <span className="zl-card-date">
                          {formatPubDate(ev.latest, today)} · {sourceNames.slice(0, 2).join(' / ')}
                        </span>
                        <span className="zl-score-pill">相关度 {ev.score}</span>
                      </div>

                      <button
                        type="button"
                        className="zl-card-title"
                        onClick={() => setSelectedId(ev.id)}
                      >
                        <span>{ev.displayTitle}</span>
                        <ArrowUpRight size={19} />
                      </button>

                      <p className="zl-card-summary">{ev.summary}</p>

                      <div className="zl-card-foot">
                        <div className="zl-card-btns">
                          <button
                            type="button"
                            className={isSaved ? 'active' : ''}
                            disabled={!!busy}
                            onClick={() => toggleFeedback(ev, 'saved')}
                          >
                            <Bookmark size={15} />
                            <span>{isSaved ? '已收藏' : '收藏'}</span>
                          </button>
                          <button
                            type="button"
                            className={isRead ? 'active' : ''}
                            disabled={!!busy}
                            onClick={() => toggleFeedback(ev, 'read')}
                          >
                            <Check size={15} />
                            <span>{isRead ? '已读' : '标为已读'}</span>
                          </button>
                          {ev.items[0]?.id && (
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() =>
                                void act(
                                  'model-summary',
                                  { itemId: ev.items[0].id },
                                  'AI 摘要已更新',
                                )
                              }
                            >
                              <Sparkles size={15} />
                              <span>AI 提炼</span>
                            </button>
                          )}
                        </div>
                        {firstUrl && (
                          <a
                            href={firstUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="zl-ext-link"
                          >
                            <span>原文</span>
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 视图 2：每日简报 */}
        {view === 'digests' && (
          <div className="zl-digest-workspace">
            <aside className="zl-digest-sidebar">
              <div className="zl-digest-create-box">
                <h3>生成今日 AI 简报</h3>
                <p>从当前高优情报自动汇总生成结构化 Markdown 简报。</p>
                <button
                  type="button"
                  className="zl-btn primary full"
                  disabled={!!busy}
                  onClick={async () => {
                    const res = await act(
                      'digest-create',
                      { date: today, count: 8 },
                      '今日简报已生成',
                    );
                    if (res?.fresh?.digests?.[0]) {
                      setSelectedDigestId(res.fresh.digests[0].id);
                      setDigestDraft(res.fresh.digests[0].content || '');
                    }
                  }}
                >
                  <Sparkles size={16} />
                  <span>一键生成今日简报</span>
                </button>
              </div>

              <div className="zl-digest-list">
                {digests.length === 0 ? (
                  <p className="zl-muted">暂无历史简报，点击上方按钮即可生成第一份。</p>
                ) : (
                  digests.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      className={`zl-digest-item ${activeDigest?.id === d.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDigestId(d.id);
                        setDigestDraft(d.content || '');
                        setEditingDigest(false);
                      }}
                    >
                      <strong>{d.title || `${d.digest_date} 简报`}</strong>
                      <span>{d.digest_date} · {d.item_count || 0} 条精选</span>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="zl-digest-main">
              {activeDigest ? (
                <>
                  <div className="zl-digest-toolbar">
                    <div>
                      <h2>{activeDigest.title || `${activeDigest.digest_date} 简报`}</h2>
                      <span>支持直接编辑与一键复制 Markdown</span>
                    </div>
                    <div className="zl-digest-actions">
                      <button
                        type="button"
                        className="zl-btn"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            editingDigest ? digestDraft : activeDigest.content || '',
                          );
                          setToast('已复制简报 Markdown');
                        }}
                      >
                        <Copy size={15} />
                        <span>复制 Markdown</span>
                      </button>
                      <button
                        type="button"
                        className="zl-btn"
                        onClick={() => {
                          setDigestDraft(activeDigest.content || '');
                          setEditingDigest(!editingDigest);
                        }}
                      >
                        <span>{editingDigest ? '预览简报' : '编辑内容'}</span>
                      </button>
                      {editingDigest && (
                        <button
                          type="button"
                          className="zl-btn primary"
                          disabled={!!busy}
                          onClick={async () => {
                            await act(
                              'digest-save',
                              { id: activeDigest.id, content: digestDraft },
                              '简报已保存',
                            );
                            setEditingDigest(false);
                          }}
                        >
                          <Check size={15} />
                          <span>保存简报</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {editingDigest ? (
                    <textarea
                      className="zl-digest-editor"
                      value={digestDraft}
                      onChange={e => setDigestDraft(e.target.value)}
                    />
                  ) : (
                    <pre className="zl-digest-preview">{activeDigest.content}</pre>
                  )}
                </>
              ) : (
                <div className="zl-empty-card">
                  <FileText size={34} />
                  <h3>还没有简报</h3>
                  <p>点击左侧「一键生成今日简报」，自动汇总今日最重要的 AI 进展。</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* 视图 3：信源管理 */}
        {view === 'sources' && (
          <div className="zl-sources-workspace">
            <div className="zl-source-top-grid">
              <form
                className="zl-source-form-card"
                onSubmit={async e => {
                  e.preventDefault();
                  if (!sourceName.trim() || !sourceUrl.trim()) return;
                  await act(
                    'source-add',
                    {
                      source: {
                        name: sourceName.trim(),
                        url: sourceUrl.trim(),
                        category: sourceCategory,
                        kind: 'rss',
                        region: 'global',
                        weight: 3,
                        official: false,
                      },
                    },
                    '新信源已添加',
                  );
                  setSourceName('');
                  setSourceUrl('');
                }}
              >
                <h3>添加自定义 RSS / Atom 信源</h3>
                <div className="zl-form-row">
                  <input
                    type="text"
                    placeholder="信源名称（如 OpenAI Blog）"
                    value={sourceName}
                    onChange={e => setSourceName(e.target.value)}
                    required
                  />
                  <input
                    type="url"
                    placeholder="订阅地址 https://..."
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    required
                  />
                  <select
                    value={sourceCategory}
                    onChange={e => setSourceCategory(e.target.value)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="zl-btn primary" disabled={!!busy}>
                    <Plus size={16} />
                    <span>添加信源</span>
                  </button>
                </div>
              </form>

              <div className="zl-source-quick-card">
                <h3>一键导入精选 AI 信源库</h3>
                <p>包含主流大模型实验室、Agent 框架与开发者社区官方订阅。</p>
                <button
                  type="button"
                  className="zl-btn"
                  disabled={!!busy}
                  onClick={() =>
                    void act('source-import-aihot', {}, '已导入精选 AI 信源')
                  }
                >
                  <Sparkles size={16} />
                  <span>导入精选 AI 信源</span>
                </button>
              </div>
            </div>

            <div className="zl-sources-grid">
              {sources.map(src => (
                <div
                  key={src.id}
                  className={`zl-source-card ${src.enabled ? '' : 'disabled'}`}
                >
                  <div className="zl-source-head">
                    <div>
                      <strong>{src.name}</strong>
                      <span className="zl-source-cat">{src.category}</span>
                    </div>
                    <button
                      type="button"
                      className={`zl-switch ${src.enabled ? 'on' : ''}`}
                      disabled={!!busy}
                      onClick={() =>
                        void act(
                          'source-toggle',
                          { id: src.id, enabled: !src.enabled },
                          src.enabled ? '已暂停该信源' : '已启用该信源',
                        )
                      }
                      aria-label={src.enabled ? '暂停信源' : '启用信源'}
                    >
                      <i />
                    </button>
                  </div>
                  <p className="zl-source-url">{src.url}</p>
                  <div className="zl-source-foot">
                    <span>
                      {src.last_error
                        ? `最近异常：${src.last_error.slice(0, 40)}`
                        : src.last_success
                          ? '状态正常'
                          : '待首次采集'}
                    </span>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() =>
                        void act('source-test', { sourceId: src.id }, '测试连接完成')
                      }
                    >
                      测试连通
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 右侧详情抽屉 */}
      {activeEvent && (
        <div className="zl-drawer-backdrop" onClick={() => setSelectedId(null)}>
          <aside
            className="zl-drawer"
            onClick={e => e.stopPropagation()}
            aria-label="情报详情"
          >
            <div className="zl-drawer-head">
              <span className={`zl-badge ${CATEGORY_BADGE[activeEvent.category] || 'badge-blue'}`}>
                {activeEvent.category}
              </span>
              <button
                type="button"
                className="zl-icon-btn"
                onClick={() => setSelectedId(null)}
                aria-label="关闭详情"
              >
                <X size={20} />
              </button>
            </div>
            <h2>{activeEvent.displayTitle}</h2>
            <p className="zl-drawer-summary">{activeEvent.summary}</p>
            {activeEvent.reason && (
              <div className="zl-drawer-reason">
                <strong>推荐理由：</strong>
                <span>{activeEvent.reason}</span>
              </div>
            )}

            <div className="zl-drawer-sources">
              <h3>报道来源 ({activeEvent.items.length})</h3>
              {activeEvent.items.map(item => (
                <div key={item.id} className="zl-drawer-item">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.model_summary || item.excerpt}</p>
                  </div>
                  <div className="zl-drawer-item-actions">
                    <button
                      type="button"
                      className="zl-btn"
                      disabled={!!busy}
                      onClick={() =>
                        void act('model-summary', { itemId: item.id }, '已生成 AI 摘要')
                      }
                    >
                      <Sparkles size={14} />
                      <span>AI 提炼</span>
                    </button>
                    <a
                      href={item.canonical_url || item.raw_url}
                      target="_blank"
                      rel="noreferrer"
                      className="zl-btn primary"
                    >
                      <span>阅读原文</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className="zl-toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
