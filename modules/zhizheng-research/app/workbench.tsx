'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FilePenLine,
  Files,
  FileText,
  FlaskConical,
  FolderOpen,
  History,
  LoaderCircle,
  LogIn,
  Plus,
  Quote,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  dimensions,
  duplicatePaper,
  emptyState,
  Evidence,
  exportMarkdown,
  kindNames,
  mergePaper,
  normalizeDOI,
  now,
  Paper,
  Project,
  ResearchState,
  SourceFile,
  uid,
} from '@/modules/zhizheng-research/lib/domain';
import { demoFiles, demoState } from '@/modules/zhizheng-research/lib/demo';
import {
  blankCard,
  cardFields,
  paperContext,
  readingStatus,
  sourceSignature,
  splitTerms,
  synthesize,
} from '@/modules/zhizheng-research/lib/study';
import type { ReadingCard } from '@/modules/zhizheng-research/lib/study-schema';
import PDFReader, { inspectPDF } from './pdf-reader';

type ActiveTab = 'library' | 'reading' | 'synthesis';

function download(name: string, text: string, type = 'text/plain;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

const initialEvidence = (paperId: string, file?: SourceFile, page = 1): Evidence => ({
  id: uid(),
  paperId,
  fileId: file?.id ?? '',
  fileHash: file?.hash ?? '',
  page,
  printedPage: '',
  section: '',
  quote: '',
  note: '',
  kind: 'fact',
  dimension: 'method',
  selector: '',
  version: 1,
  updatedAt: now(),
  publishedAt: '',
  cutoff: '',
  period: '',
  currency: '',
  unit: '',
});

export default function Workbench() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [projects, setProjects] = useState<any[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auth, setAuth] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [demo, setDemo] = useState(false);
  const [modal, setModal] = useState('');
  const [model, setModel] = useState<any>({ configured: false });

  // Library & Search state
  const [paperId, setPaperId] = useState('');
  const [page, setPage] = useState(1);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [pendingPapers, setPendingPapers] = useState<Paper[]>([]);

  // Reading & Evidence state
  const [cardDraft, setCardDraft] = useState<ReadingCard | null>(null);
  const [cardTopicsText, setCardTopicsText] = useState('');
  const [cardMethodsText, setCardMethodsText] = useState('');
  const [cardDatasetsText, setCardDatasetsText] = useState('');
  const [evidenceDraft, setEvidenceDraft] = useState<Evidence | null>(null);
  const [readingPaneMode, setReadingPaneMode] = useState<'card' | 'evidence'>('card');

  // Synthesis & AI state
  const [selectedSynthesisPapers, setSelectedSynthesisPapers] = useState<string[]>([]);
  const [synthesisTitle, setSynthesisTitle] = useState('跨论文研究综述');
  const [synthesisBody, setSynthesisBody] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiTask, setAiTask] = useState<'reading' | 'synthesis' | 'directions' | 'replication'>('synthesis');
  const [aiOutput, setAiOutput] = useState('');

  const createRequest = useRef('');
  if (!createRequest.current) createRequest.current = uid();
  const projectRef = useRef(project);
  projectRef.current = project;
  const inFlight = useRef(false);
  const bibInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  const state = project?.state ?? emptyState();
  const selectedPaper = useMemo(
    () => state.papers.find((p) => p.id === paperId) ?? state.papers[0] ?? null,
    [state.papers, paperId],
  );
  const currentFile = useMemo(
    () => files.find((f) => f.id === selectedPaper?.fileId),
    [files, selectedPaper],
  );
  const paperEvidence = useMemo(
    () => state.evidence.filter((e) => e.paperId === selectedPaper?.id),
    [state.evidence, selectedPaper],
  );

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 4200);
  };

  useEffect(() => {
    loadProjects();
    request('/api/m/zhizheng-research/ai')
      .then(setModel)
      .catch(() => {});
  }, []);

  // Keep ReadingCard draft synced when switching papers
  useEffect(() => {
    if (!selectedPaper) {
      setCardDraft(null);
      return;
    }
    const existing = state.readingCards.find((c) => c.paperId === selectedPaper.id) ?? blankCard(selectedPaper.id);
    setCardDraft({ ...existing });
    setCardTopicsText((existing.topics ?? []).join(', '));
    setCardMethodsText((existing.methods ?? []).join(', '));
    setCardDatasetsText((existing.datasets ?? []).join(', '));
    setPage(existing.lastPage ?? 1);
  }, [selectedPaper?.id, project?.id]);

  // Keep synthesis selection synced
  useEffect(() => {
    if (state.papers.length && selectedSynthesisPapers.length === 0) {
      setSelectedSynthesisPapers(state.papers.slice(0, 5).map((p) => p.id));
    }
    if (state.syntheses.length && !synthesisBody) {
      setSynthesisTitle(state.syntheses[0].title);
      setSynthesisBody(state.syntheses[0].body);
    }
  }, [state.papers.length, project?.id]);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await request('/api/m/zhizheng-research/workspace');
      setProjects(data.projects || []);
      setAuth(true);
      if (data.projects?.length) {
        await loadProject(data.projects[0].id, true);
      }
    } catch (e) {
      setAuth(false);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProject(id: string, force = false) {
    if (!force && (busy || inFlight.current)) {
      notify('正在保存，请稍候切换课题');
      return;
    }
    setBusy(true);
    try {
      const data = await request('/api/m/zhizheng-research/workspace?id=' + id);
      setProject(data.project);
      setFiles(data.files || []);
      setVersions(data.versions || []);
      setDemo(false);
      setPaperId(data.project?.state?.papers?.[0]?.id || '');
      setEvidenceDraft(null);
      setSynthesisBody(data.project?.state?.syntheses?.[0]?.body || '');
      setSynthesisTitle(data.project?.state?.syntheses?.[0]?.title || '跨论文研究综述');
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openDemo() {
    const s = demoState();
    setProject({ id: 'demo', revision: 1, updatedAt: now(), state: s });
    setFiles(demoFiles);
    setDemo(true);
    setPaperId(s.papers[0]?.id || '');
    setEvidenceDraft(null);
    setSynthesisBody(s.syntheses[0]?.body || synthesize(s, s.papers.map((p) => p.id)));
    setSynthesisTitle(s.syntheses[0]?.title || '示例课题跨论文综述');
    setSelectedSynthesisPapers(s.papers.map((p) => p.id));
    setError('');
    notify('已载入示例课题（包含论文、摘录与综述）');
  }

  async function persist(next: ResearchState) {
    if (!projectRef.current) throw new Error('请先创建或打开研究课题');
    const target = projectRef.current;
    if (inFlight.current) throw new Error('上一项修改正在保存，请稍候');
    inFlight.current = true;
    setSaving(true);
    try {
      if (target.id === 'demo') {
        setProject((current) =>
          current?.id === target.id
            ? { ...target, state: next, revision: target.revision + 1, updatedAt: now() }
            : current,
        );
        return;
      }
      const data = await request('/api/m/zhizheng-research/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          id: target.id,
          revision: target.revision,
          state: next,
        }),
      });
      setProject((current) =>
        current?.id === target.id
          ? { ...target, state: next, revision: data.revision, updatedAt: data.updatedAt }
          : current,
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  async function runAction(fn: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addPapersToLibrary(incoming: Paper[]) {
    if (!project) {
      openDemo();
      return;
    }
    const merged = [...state.papers];
    let duplicates = 0;
    for (const p of incoming) {
      const old = duplicatePaper(merged, p);
      if (old) {
        merged[merged.indexOf(old)] = mergePaper(old, p);
        duplicates++;
      } else {
        merged.push(p);
      }
    }
    await persist({ ...state, papers: merged });
    if (!paperId && merged.length) setPaperId(merged[0].id);
    setModal('');
    setPendingPapers([]);
    notify(`已加入文献库（新增 ${incoming.length - duplicates} 篇，合并重复 ${duplicates} 篇）`);
  }

  async function uploadFile(file: File, kind: string, extra: Record<string, unknown> = {}) {
    if (demo) throw new Error('示例模式不支持上传文件到服务器，请先点击右上角「+ 新建课题」');
    const form = new FormData();
    form.set('file', file);
    form.set('kind', kind);
    form.set('projectId', project!.id);
    Object.entries(extra).forEach(([k, v]) => form.set(k, String(v)));
    const data = await request('/api/m/zhizheng-research/files', {
      method: 'POST',
      body: form,
    });
    setFiles((prev) => (prev.some((f) => f.id === data.file.id) ? prev : [...prev, data.file]));
    return data.file as SourceFile;
  }

  async function handlePDFUpload(file: File) {
    if (!selectedPaper) throw new Error('请先选择一篇文献');
    const meta = await inspectPDF(file);
    const uploaded = await uploadFile(file, 'pdf', meta);
    await persist({
      ...state,
      papers: state.papers.map((p) =>
        p.id === selectedPaper.id
          ? { ...p, fileId: uploaded.id, readStatus: 'fulltext', updatedAt: now() }
          : p,
      ),
    });
    setPage(1);
    notify(`已绑定 PDF 全文（共 ${meta.pages} 页）`);
  }

  async function saveReadingCard() {
    if (!selectedPaper || !cardDraft) return;
    const nextCard: ReadingCard = {
      ...cardDraft,
      paperId: selectedPaper.id,
      id: selectedPaper.id,
      topics: splitTerms(cardTopicsText),
      methods: splitTerms(cardMethodsText),
      datasets: splitTerms(cardDatasetsText),
      lastPage: page,
      updatedAt: now(),
    };
    const others = state.readingCards.filter((c) => c.paperId !== selectedPaper.id);
    await persist({
      ...state,
      readingCards: [...others, nextCard],
    });
    setCardDraft(nextCard);
    notify('精读笔记卡已保存');
  }

  async function saveEvidence() {
    if (!selectedPaper || !evidenceDraft) return;
    if (!evidenceDraft.quote.trim()) throw new Error('请填写原文摘录内容');
    const old = state.evidence.find((e) => e.id === evidenceDraft.id);
    const item: Evidence = {
      ...evidenceDraft,
      paperId: selectedPaper.id,
      version: old ? old.version + 1 : 1,
      updatedAt: now(),
      selector: evidenceDraft.quote.slice(0, 500),
    };
    await persist({
      ...state,
      evidence: old ? state.evidence.map((x) => (x.id === item.id ? item : x)) : [...state.evidence, item],
    });
    setEvidenceDraft(null);
    notify(old ? '原文证据已更新' : '原文证据已保存');
  }

  function handleRuleSynthesize() {
    const ids = selectedSynthesisPapers.length ? selectedSynthesisPapers : state.papers.map((p) => p.id);
    if (!ids.length) {
      notify('请先在文献库中添加至少一篇论文');
      return;
    }
    const generated = synthesize(state, ids);
    setSynthesisBody(generated);
    notify('已按精读卡与原文证据生成结构化对比综述');
  }

  async function saveSynthesisDoc() {
    const ids = selectedSynthesisPapers.length ? selectedSynthesisPapers : state.papers.map((p) => p.id);
    if (!ids.length) throw new Error('请至少勾选一篇文献');
    if (!synthesisBody.trim()) throw new Error('综述内容不能为空');
    const item = {
      id: state.syntheses[0]?.id || uid(),
      title: synthesisTitle.trim() || '跨论文研究综述',
      paperIds: ids,
      body: synthesisBody,
      origin: 'manual' as const,
      sourceSignature: sourceSignature(state, ids),
      updatedAt: now(),
    };
    await persist({
      ...state,
      syntheses: [item, ...state.syntheses.filter((s) => s.id !== item.id)],
    });
    notify('研究综述已保存到当前课题');
  }

  async function askAI() {
    if (!project || demo) {
      throw new Error('AI 学术助手需要正式课题。请先点击右上角「+ 新建课题」再调用模型。');
    }
    const ids = selectedSynthesisPapers.length
      ? selectedSynthesisPapers
      : selectedPaper
        ? [selectedPaper.id]
        : state.papers.map((p) => p.id);
    if (!ids.length) throw new Error('请先选择至少一篇文献作为上下文');
    const material = paperContext(state, ids);
    const res = await request('/api/m/zhizheng-research/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        task: aiTask,
        question: aiQuestion.trim() || '请归纳这些论文的核心问题、方法异同与研究局限。',
        text: material || '尚无详细摘录，请结合论文题目分析。',
        consent: true,
        requestId: uid(),
      }),
    });
    setAiOutput(res.text || '');
    notify('AI 研究分析已完成');
  }

  async function handleExport(kind: 'md' | 'bib' | 'backup') {
    if (kind === 'md') {
      const content =
        synthesisBody.trim() ||
        exportMarkdown(state, files);
      download(`${state.title || '知证研究综述'}.md`, content);
    } else if (kind === 'bib') {
      const b = await import('@/modules/zhizheng-research/lib/bibliography');
      download('references.bib', b.toBibtex(state.papers));
    } else {
      download(
        `${state.title || '知证课题备份'}.json`,
        JSON.stringify({ project, files, exportedAt: now() }, null, 2),
        'application/json',
      );
    }
    notify('文件已导出');
  }

  const filteredPapers = useMemo(
    () =>
      state.papers.filter((p) =>
        `${p.title} ${p.authors} ${p.year} ${p.doi}`.toLowerCase().includes(libraryQuery.toLowerCase()),
      ),
    [state.papers, libraryQuery],
  );

  return (
    <div className="zz-shell">
      {/* Top Header */}
      <header className="zz-header">
        <div className="zz-brand">
          <span className="zz-brand-icon">
            <BookMarked size={22} />
          </span>
          <div>
            <div className="zz-brand-title">
              <h1>知证</h1>
              <span className="zz-badge">学术文献精读与证据综述工作台</span>
            </div>
            <p className="zz-brand-sub">检索导入文献 → 结构化精读与原文证据锚定 → 跨论文对比综述</p>
          </div>
        </div>

        <div className="zz-header-controls">
          <div className="zz-project-switcher">
            <FolderOpen size={16} />
            <select
              aria-label="切换研究课题"
              value={project?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'demo') openDemo();
                else if (val) loadProject(val);
              }}
            >
              {!project && <option value="">选择或新建课题…</option>}
              {demo && <option value="demo">示例课题：{state.title}</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (v{p.revision})
                </option>
              ))}
            </select>
          </div>

          <button className="zz-btn" onClick={() => setModal('new')}>
            <Plus size={16} />
            新建课题
          </button>

          {!demo && (
            <button className="zz-btn" onClick={openDemo}>
              <FlaskConical size={16} />
              加载示例课题
            </button>
          )}

          <button
            className="zz-btn"
            disabled={!project}
            onClick={() => setModal('export')}
          >
            <Download size={16} />
            导出
          </button>
        </div>
      </header>

      {/* Main 3-Step Pipeline Navigation Bar */}
      <div className="zz-nav-bar">
        <div className="zz-tabs" role="tablist" aria-label="研究流程步骤">
          <button
            role="tab"
            aria-selected={activeTab === 'library'}
            className={`zz-tab ${activeTab === 'library' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <span className="zz-step-num">01</span>
            <BookOpen size={17} />
            <span>文献库与检索</span>
            <em className="zz-count">{state.papers.length}</em>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'reading'}
            className={`zz-tab ${activeTab === 'reading' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('reading')}
          >
            <span className="zz-step-num">02</span>
            <FilePenLine size={17} />
            <span>精读与证据笔记</span>
            <em className="zz-count">{state.evidence.length}</em>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'synthesis'}
            className={`zz-tab ${activeTab === 'synthesis' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('synthesis')}
          >
            <span className="zz-step-num">03</span>
            <Files size={17} />
            <span>跨论文综述与 AI 问答</span>
            <em className="zz-count">{state.syntheses.length}</em>
          </button>
        </div>

        <div className="zz-status-pill">
          {saving ? (
            <>
              <LoaderCircle size={15} className="zz-spin" />
              <span>正在保存…</span>
            </>
          ) : (
            <>
              <CheckCheck size={15} />
              <span>
                {demo
                  ? '示例模式（本地临时预览）'
                  : project
                    ? `已同步 · 版本 v${project.revision}`
                    : '未选择课题'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="zz-alert is-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          {!auth && !demo && (
            <a className="zz-btn is-small" href="/signin-with-chatgpt?return_to=%2Fm%2Fzhizheng-research" target="_top">
              <LogIn size={14} /> 登录账号
            </a>
          )}
          <button aria-label="关闭错误提示" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {demo && (
        <div className="zz-alert is-demo">
          <FlaskConical size={17} />
          <span>
            当前正在浏览<strong>示例课题</strong>（含预置论文、精读卡与证据摘录）。需要持久保存自己的研究时，请点击右上角「新建课题」。
          </span>
          <button className="zz-btn is-small is-primary" onClick={() => setModal('new')}>
            创建正式课题 <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={bibInput}
        type="file"
        accept=".bib,.ris,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            runAction(async () => {
              if (f.size > 1500000) throw new Error('文献文件上限 1.5 MB');
              const { importReferences } = await import('@/modules/zhizheng-research/lib/bibliography');
              const parsed = importReferences(await f.text(), f.name);
              await addPapersToLibrary(parsed);
            });
          }
          e.target.value = '';
        }}
      />
      <input
        ref={pdfInput}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) runAction(() => handlePDFUpload(f));
          e.target.value = '';
        }}
      />

      {/* Empty Project Onboarding */}
      {loading ? (
        <div className="zz-empty-stage">
          <LoaderCircle size={32} className="zz-spin" />
          <h2>正在读取知证研究工作区…</h2>
          <p>同步课题、文献列表与精读笔记</p>
        </div>
      ) : !project ? (
        <div className="zz-empty-stage">
          <BookMarked size={40} />
          <h2>开始你的第一个研究课题</h2>
          <p>
            把同一研究主题的文献检索、PDF 原文摘录、结构化精读卡和跨论文综述放在同一个清爽的工作台里。
          </p>
          <div className="zz-btn-row">
            <button className="zz-btn is-primary" onClick={() => setModal('new')}>
              <Plus size={16} /> 新建研究课题
            </button>
            <button className="zz-btn" onClick={openDemo}>
              <FlaskConical size={16} /> 一键体验完整示例课题
            </button>
          </div>
        </div>
      ) : (
        <main className="zz-main">
          {/* Project Context Strip */}
          <section className="zz-topic-strip">
            <div className="zz-topic-info">
              <span className="zz-topic-tag">{state.researchType || '研究课题'}</span>
              <h2>{state.title}</h2>
              {state.topic && <p>{state.topic}</p>}
            </div>
            <div className="zz-topic-metrics">
              <div className="zz-metric-chip">
                <span>收录文献</span>
                <strong>{state.papers.length}</strong>
              </div>
              <div className="zz-metric-chip">
                <span>精读笔记卡</span>
                <strong>{state.readingCards.length}</strong>
              </div>
              <div className="zz-metric-chip">
                <span>原文证据锚点</span>
                <strong>{state.evidence.length}</strong>
              </div>
              <button className="zz-btn is-small" onClick={() => setModal('edit-project')}>
                编辑课题信息
              </button>
            </div>
          </section>

          {/* TAB 1: LITERATURE LIBRARY & CROSSREF SEARCH */}
          {activeTab === 'library' && (
            <div className="zz-bento-two">
              {/* Left Column: Current Papers in Project */}
              <section className="zz-card">
                <div className="zz-card-header">
                  <div>
                    <h3>课题文献库 ({state.papers.length})</h3>
                    <p>点击任意论文即可进入精读、上传 PDF 全文或记录原文摘录</p>
                  </div>
                  <div className="zz-btn-row">
                    <button className="zz-btn is-small" onClick={() => bibInput.current?.click()}>
                      <Upload size={15} /> 导入 BibTeX / RIS
                    </button>
                    <button className="zz-btn is-small is-primary" onClick={() => setModal('manual')}>
                      <Plus size={15} /> 手动录入文献
                    </button>
                  </div>
                </div>

                <div className="zz-filter-bar">
                  <Search size={16} />
                  <input
                    aria-label="过滤课题内文献"
                    placeholder="按论文标题、作者、年份或 DOI 筛选…"
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                  />
                </div>

                {filteredPapers.length === 0 ? (
                  <div className="zz-empty-box">
                    <BookOpen size={28} />
                    <h4>暂无匹配的文献</h4>
                    <p>在右侧直接检索 Crossref 全球学术库，或手动录入 / 导入 BibTeX 文献。</p>
                  </div>
                ) : (
                  <div className="zz-paper-grid">
                    {filteredPapers.map((p, idx) => {
                      const card = state.readingCards.find((c) => c.paperId === p.id);
                      const evCount = state.evidence.filter((e) => e.paperId === p.id).length;
                      const isSelected = selectedPaper?.id === p.id;
                      return (
                        <article
                          key={p.id}
                          className={`zz-paper-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setPaperId(p.id)}
                        >
                          <div className="zz-paper-card-top">
                            <span className="zz-paper-index">#{String(idx + 1).padStart(2, '0')}</span>
                            <span className={`zz-pill ${p.fileId ? 'is-green' : 'is-neutral'}`}>
                              {p.fileId ? '已绑定 PDF' : p.abstract ? '含摘要' : '元数据'}
                            </span>
                            {card && (
                              <span className="zz-pill is-blue">
                                {readingStatus[card.status] || '已建卡'}
                              </span>
                            )}
                            <span className="zz-pill is-neutral">{evCount} 条证据</span>
                          </div>

                          <h4>{p.title}</h4>
                          <p className="zz-paper-meta">
                            {p.authors || '作者待补充'} · {p.year || '年份未知'}
                            {p.doi ? ` · DOI: ${p.doi}` : ''}
                          </p>

                          {card?.summary ? (
                            <p className="zz-paper-summary">“{card.summary}”</p>
                          ) : (
                            p.abstract && <p className="zz-paper-abstract">{p.abstract}</p>
                          )}

                          <div className="zz-paper-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="zz-btn is-small is-primary"
                              onClick={() => {
                                setPaperId(p.id);
                                setActiveTab('reading');
                              }}
                            >
                              <FilePenLine size={14} /> 精读与摘录
                            </button>
                            <button
                              className="zz-btn is-small"
                              onClick={() => {
                                setPaperId(p.id);
                                pdfInput.current?.click();
                              }}
                            >
                              <Upload size={14} /> {p.fileId ? '更新 PDF' : '上传 PDF'}
                            </button>
                            {p.doi && (
                              <a
                                className="zz-btn is-small"
                                href={`https://doi.org/${encodeURIComponent(p.doi)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                DOI <ExternalLink size={13} />
                              </a>
                            )}
                            <button
                              className="zz-btn is-small is-danger"
                              aria-label="移除该文献"
                              onClick={() => {
                                if (confirm(`确定从当前课题移除《${p.title}》吗？`)) {
                                  runAction(async () => {
                                    await persist({
                                      ...state,
                                      papers: state.papers.filter((x) => x.id !== p.id),
                                    });
                                    notify('已移除该文献');
                                  });
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Right Column: Crossref Live Discovery */}
              <aside className="zz-card">
                <div className="zz-card-header">
                  <div>
                    <h3>Crossref 学术文献检索</h3>
                    <p>按英文/中文题名关键词或 DOI 检索真实学术元数据并一键入库</p>
                  </div>
                </div>

                <form
                  className="zz-search-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!searchQuery.trim()) return;
                    runAction(async () => {
                      const r = await request(
                        '/api/m/zhizheng-research/search?q=' + encodeURIComponent(searchQuery.trim()),
                      );
                      setSearchResults(r.papers || []);
                    });
                  }}
                >
                  <input
                    placeholder="输入论文标题或 DOI，如 Multi-Agent Evaluation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    required
                  />
                  <button className="zz-btn is-primary" type="submit" disabled={busy}>
                    {busy ? <LoaderCircle size={16} className="zz-spin" /> : <Search size={16} />}
                    检索
                  </button>
                </form>

                <div className="zz-search-list">
                  {searchResults.length === 0 ? (
                    <div className="zz-empty-box is-compact">
                      <Search size={24} />
                      <p>输入关键词或 DOI 检索 Crossref 数据库，或点击左上角导入 `.bib / .ris` 文件。</p>
                    </div>
                  ) : (
                    searchResults.map((p) => {
                      const alreadyIn = !!duplicatePaper(state.papers, p);
                      return (
                        <div key={p.id} className="zz-search-item">
                          <div>
                            <h4>{p.title}</h4>
                            <p>
                              {p.authors || '未知作者'} · {p.year || '未知年份'}
                            </p>
                            {p.doi && <small>DOI: {p.doi}</small>}
                          </div>
                          <button
                            className={`zz-btn is-small ${alreadyIn ? '' : 'is-primary'}`}
                            disabled={busy}
                            onClick={() => runAction(() => addPapersToLibrary([p]))}
                          >
                            <Plus size={14} />
                            {alreadyIn ? '合并更新' : '加入课题'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: SPLIT-VIEW READING & EVIDENCE WORKBENCH */}
          {activeTab === 'reading' && (
            <div className="zz-reading-workspace">
              {/* Top Paper Selector Bar */}
              <div className="zz-reading-toolbar">
                <div className="zz-paper-select-wrap">
                  <span>当前精读文献：</span>
                  <select
                    aria-label="选择要精读的文献"
                    value={selectedPaper?.id || ''}
                    onChange={(e) => {
                      setPaperId(e.target.value);
                      setEvidenceDraft(null);
                    }}
                  >
                    {state.papers.length === 0 && <option value="">文献库为空，请先添加文献</option>}
                    {state.papers.map((p, i) => (
                      <option key={p.id} value={p.id}>
                        #{String(i + 1).padStart(2, '0')} {p.title} ({p.year || '年份未知'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPaper && (
                  <div className="zz-btn-row">
                    <button className="zz-btn is-small" onClick={() => pdfInput.current?.click()}>
                      <Upload size={15} />
                      {currentFile ? `更换 PDF (${currentFile.pages} 页)` : '上传 PDF 全文'}
                    </button>
                    <button
                      className="zz-btn is-small"
                      onClick={() => {
                        setSelectedSynthesisPapers([selectedPaper.id]);
                        setAiTask('reading');
                        setActiveTab('synthesis');
                      }}
                    >
                      <Sparkles size={15} /> AI 解读此文
                    </button>
                  </div>
                )}
              </div>

              {!selectedPaper ? (
                <div className="zz-empty-stage">
                  <BookOpen size={36} />
                  <h3>请先在「文献库与检索」中添加至少一篇论文</h3>
                  <button className="zz-btn is-primary" onClick={() => setActiveTab('library')}>
                    前往文献库
                  </button>
                </div>
              ) : (
                <div className="zz-reading-split">
                  {/* Left Pane: Paper Metadata, Abstract, or PDF Reader */}
                  <section className="zz-card zz-reader-pane">
                    <div className="zz-card-header">
                      <div>
                        <h3>{selectedPaper.title}</h3>
                        <p>
                          {selectedPaper.authors || '作者待核实'} · {selectedPaper.year || '年份未知'}
                          {selectedPaper.doi ? ` · DOI: ${selectedPaper.doi}` : ''}
                        </p>
                      </div>
                      <span className={`zz-pill ${currentFile ? 'is-green' : 'is-neutral'}`}>
                        {currentFile ? `PDF 全文 · ${currentFile.pages} 页` : '摘要与元数据视图'}
                      </span>
                    </div>

                    {currentFile ? (
                      <div className="zz-pdf-container">
                        <PDFReader
                          key={currentFile.id}
                          url={
                            demo
                              ? '/assets/zhizheng-research/demo-evidence.pdf'
                              : '/api/m/zhizheng-research/files?id=' + currentFile.id
                          }
                          page={page}
                          onPage={setPage}
                          onSelect={(quote) => {
                            if (busy || saving) return;
                            setReadingPaneMode('evidence');
                            setEvidenceDraft({
                              ...initialEvidence(selectedPaper.id, currentFile, page),
                              quote,
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="zz-abstract-reader">
                        <div className="zz-abstract-card">
                          <div className="zz-abstract-head">
                            <strong>论文摘要 (Abstract)</strong>
                            {selectedPaper.abstract && (
                              <button
                                className="zz-btn is-small"
                                onClick={() => {
                                  setReadingPaneMode('evidence');
                                  setEvidenceDraft({
                                    ...initialEvidence(selectedPaper.id),
                                    quote: selectedPaper.abstract,
                                    section: '摘要 (Abstract)',
                                  });
                                }}
                              >
                                <Quote size={14} /> 一键引用摘要为证据
                              </button>
                            )}
                          </div>
                          <p>
                            {selectedPaper.abstract ||
                              '当前文献尚未录入摘要。你可以点击上方「上传 PDF 全文」开启 PDF 阅读器，或在右侧直接记录精读笔记与原文摘录。'}
                          </p>
                        </div>

                        <div className="zz-upload-callout">
                          <FileText size={30} />
                          <div>
                            <h4>上传 PDF 全文进行逐页阅读与划词摘录</h4>
                            <p>支持最大 15 MB、500 页以内的 PDF 文档，自动校验 SHA-256 文件哈希与物理页码。</p>
                          </div>
                          <button className="zz-btn is-primary" onClick={() => pdfInput.current?.click()}>
                            <Upload size={16} /> 上传 PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Right Pane: Structured Reading Card & Evidence Notes */}
                  <section className="zz-card zz-notes-pane">
                    <div className="zz-subtabs">
                      <button
                        className={readingPaneMode === 'card' ? 'is-active' : ''}
                        onClick={() => setReadingPaneMode('card')}
                      >
                        <FilePenLine size={16} />
                        结构化精读卡
                      </button>
                      <button
                        className={readingPaneMode === 'evidence' ? 'is-active' : ''}
                        onClick={() => setReadingPaneMode('evidence')}
                      >
                        <Quote size={16} />
                        原文证据摘录 ({paperEvidence.length})
                      </button>
                    </div>

                    {readingPaneMode === 'card' && cardDraft && (
                      <div className="zz-form-stack">
                        <div className="zz-form-row-two">
                          <label className="zz-field">
                            <span>阅读状态</span>
                            <select
                              value={cardDraft.status}
                              onChange={(e) =>
                                setCardDraft({ ...cardDraft, status: e.target.value as ReadingCard['status'] })
                              }
                            >
                              {Object.entries(readingStatus).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="zz-field">
                            <span>当前阅读页码</span>
                            <input
                              type="number"
                              min={1}
                              max={5000}
                              value={page}
                              onChange={(e) => setPage(Number(e.target.value) || 1)}
                            />
                          </label>
                        </div>

                        {(Object.entries(cardFields) as [keyof typeof cardFields, string][]).map(
                          ([fieldKey, label]) => (
                            <label className="zz-field" key={fieldKey}>
                              <span>{label}</span>
                              <textarea
                                rows={fieldKey === 'summary' ? 2 : 3}
                                value={cardDraft[fieldKey] || ''}
                                onChange={(e) =>
                                  setCardDraft({ ...cardDraft, [fieldKey]: e.target.value })
                                }
                                placeholder={`记录该论文的${label}…`}
                              />
                            </label>
                          ),
                        )}

                        <div className="zz-form-row-three">
                          <label className="zz-field">
                            <span>主题标签（逗号分隔）</span>
                            <input
                              value={cardTopicsText}
                              onChange={(e) => setCardTopicsText(e.target.value)}
                              placeholder="如：Multi-Agent, 评估基准"
                            />
                          </label>
                          <label className="zz-field">
                            <span>核心方法（逗号分隔）</span>
                            <input
                              value={cardMethodsText}
                              onChange={(e) => setCardMethodsText(e.target.value)}
                              placeholder="如：对抗评审, 证据锚定"
                            />
                          </label>
                          <label className="zz-field">
                            <span>涉及数据集（逗号分隔）</span>
                            <input
                              value={cardDatasetsText}
                              onChange={(e) => setCardDatasetsText(e.target.value)}
                              placeholder="如：FinEval, SWE-bench"
                            />
                          </label>
                        </div>

                        <div className="zz-form-footer">
                          <button
                            className="zz-btn is-primary"
                            disabled={busy || saving}
                            onClick={() => runAction(saveReadingCard)}
                          >
                            <Save size={16} /> 保存精读笔记卡
                          </button>
                        </div>
                      </div>
                    )}

                    {readingPaneMode === 'evidence' && (
                      <div className="zz-evidence-stack">
                        <div className="zz-evidence-header">
                          <p>锚定原文句子、页码与你的个人批注，自动汇入跨论文综述。</p>
                          <button
                            className="zz-btn is-small is-primary"
                            onClick={() =>
                              setEvidenceDraft(initialEvidence(selectedPaper.id, currentFile, page))
                            }
                          >
                            <Plus size={14} /> 新建摘录
                          </button>
                        </div>

                        {evidenceDraft && (
                          <div className="zz-evidence-editor">
                            <div className="zz-form-row-three">
                              <label className="zz-field">
                                <span>归类维度</span>
                                <select
                                  value={evidenceDraft.dimension}
                                  onChange={(e) =>
                                    setEvidenceDraft({
                                      ...evidenceDraft,
                                      dimension: e.target.value as Evidence['dimension'],
                                    })
                                  }
                                >
                                  {Object.entries(dimensions).map(([k, v]) => (
                                    <option key={k} value={k}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="zz-field">
                                <span>证据性质</span>
                                <select
                                  value={evidenceDraft.kind}
                                  onChange={(e) =>
                                    setEvidenceDraft({
                                      ...evidenceDraft,
                                      kind: e.target.value as Evidence['kind'],
                                    })
                                  }
                                >
                                  {Object.entries(kindNames).map(([k, v]) => (
                                    <option key={k} value={k}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="zz-field">
                                <span>页码 / 章节位置</span>
                                <input
                                  value={evidenceDraft.section}
                                  onChange={(e) =>
                                    setEvidenceDraft({ ...evidenceDraft, section: e.target.value })
                                  }
                                  placeholder={`如 p.${page} / 3.2 实验设置`}
                                />
                              </label>
                            </div>

                            <label className="zz-field">
                              <span>原文摘录 (Quote)</span>
                              <textarea
                                rows={4}
                                value={evidenceDraft.quote}
                                onChange={(e) =>
                                  setEvidenceDraft({ ...evidenceDraft, quote: e.target.value })
                                }
                                placeholder="粘贴或从左侧 PDF 划词选取原文段落…"
                              />
                            </label>

                            <label className="zz-field">
                              <span>个人批注与边界分析 (Note)</span>
                              <textarea
                                rows={3}
                                value={evidenceDraft.note}
                                onChange={(e) =>
                                  setEvidenceDraft({ ...evidenceDraft, note: e.target.value })
                                }
                                placeholder="这段证据说明了什么？适用前提或潜在局限是什么？"
                              />
                            </label>

                            <div className="zz-btn-row">
                              <button
                                className="zz-btn is-primary"
                                disabled={busy || saving}
                                onClick={() => runAction(saveEvidence)}
                              >
                                <Save size={15} /> 保存证据摘录
                              </button>
                              <button className="zz-btn" onClick={() => setEvidenceDraft(null)}>
                                取消
                              </button>
                            </div>
                          </div>
                        )}

                        {paperEvidence.length === 0 && !evidenceDraft ? (
                          <div className="zz-empty-box is-compact">
                            <Quote size={24} />
                            <p>当前文献还没有摘录证据。点击右上角「+ 新建摘录」或从左侧摘要一键引用。</p>
                          </div>
                        ) : (
                          <div className="zz-evidence-list">
                            {paperEvidence.map((ev) => (
                              <article key={ev.id} className="zz-evidence-item">
                                <div className="zz-evidence-item-top">
                                  <span className="zz-pill is-green">{dimensions[ev.dimension]}</span>
                                  <span className="zz-pill is-neutral">{kindNames[ev.kind]}</span>
                                  <small>
                                    {ev.fileId ? `p.${ev.page}` : '摘要/无全文页码'}{' '}
                                    {ev.section ? `· ${ev.section}` : ''} · v{ev.version}
                                  </small>
                                </div>
                                <blockquote>{ev.quote}</blockquote>
                                {ev.note && <p>{ev.note}</p>}
                                <div className="zz-evidence-item-actions">
                                  <button
                                    className="zz-btn is-small"
                                    onClick={() => setEvidenceDraft({ ...ev })}
                                  >
                                    编辑
                                  </button>
                                  <button
                                    className="zz-btn is-small is-danger"
                                    onClick={() => {
                                      if (confirm('确定删除这条原文证据吗？')) {
                                        runAction(async () => {
                                          await persist({
                                            ...state,
                                            evidence: state.evidence.filter((x) => x.id !== ev.id),
                                          });
                                          notify('证据已删除');
                                        });
                                      }
                                    }}
                                  >
                                    <Trash2 size={13} /> 删除
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CROSS-PAPER SYNTHESIS & AI QA */}
          {activeTab === 'synthesis' && (
            <div className="zz-bento-two">
              {/* Left Column: Paper Selector & Rule/Markdown Synthesis Editor */}
              <section className="zz-card">
                <div className="zz-card-header">
                  <div>
                    <h3>跨论文对比综述工作台</h3>
                    <p>勾选要对比的文献，一键汇整精读卡与原文证据，生成结构化 Markdown 综述</p>
                  </div>
                  <div className="zz-btn-row">
                    <button className="zz-btn is-small" onClick={handleRuleSynthesize}>
                      <Files size={15} /> 一键生成对比综述初稿
                    </button>
                    <button
                      className="zz-btn is-small is-primary"
                      disabled={busy || saving}
                      onClick={() => runAction(saveSynthesisDoc)}
                    >
                      <Save size={15} /> 保存综述
                    </button>
                  </div>
                </div>

                {/* Paper Checkboxes */}
                <div className="zz-paper-selector-chips">
                  {state.papers.map((p) => {
                    const checked = selectedSynthesisPapers.includes(p.id);
                    return (
                      <label key={p.id} className={`zz-check-chip ${checked ? 'is-checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedSynthesisPapers((prev) =>
                              checked ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                            )
                          }
                        />
                        <span>{p.title}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Comparison Matrix Table */}
                {selectedSynthesisPapers.length > 0 && (
                  <div className="zz-matrix-scroll">
                    <table className="zz-matrix-table">
                      <thead>
                        <tr>
                          <th>对比文献</th>
                          <th>研究问题</th>
                          <th>核心方法</th>
                          <th>主要发现与局限</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.papers
                          .filter((p) => selectedSynthesisPapers.includes(p.id))
                          .map((p) => {
                            const c = state.readingCards.find((x) => x.paperId === p.id);
                            const evs = state.evidence.filter((e) => e.paperId === p.id);
                            return (
                              <tr key={p.id}>
                                <td>
                                  <strong>{p.title}</strong>
                                  <small>
                                    {p.authors} ({p.year || '未知'})
                                  </small>
                                </td>
                                <td>{c?.problem || evs.find((e) => e.dimension === 'question')?.note || '待补充'}</td>
                                <td>{c?.method || evs.find((e) => e.dimension === 'method')?.note || '待补充'}</td>
                                <td>
                                  {c?.findings || c?.limitations || evs.find((e) => e.dimension === 'result')?.note || '待补充'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                <label className="zz-field">
                  <span>综述标题</span>
                  <input
                    value={synthesisTitle}
                    onChange={(e) => setSynthesisTitle(e.target.value)}
                    placeholder="输入跨论文综述标题…"
                  />
                </label>

                <label className="zz-field">
                  <span>综述正文 (Markdown)</span>
                  <textarea
                    rows={14}
                    className="zz-mono-editor"
                    value={synthesisBody}
                    onChange={(e) => setSynthesisBody(e.target.value)}
                    placeholder="点击上方「一键生成对比综述初稿」，或在此直接撰写跨论文比较分析…"
                  />
                </label>
              </section>

              {/* Right Column: AI Research Assistant */}
              <aside className="zz-card">
                <div className="zz-card-header">
                  <div>
                    <h3>AI 学术问答与方向探索</h3>
                    <p>仅基于你所勾选文献的精读卡与原文证据进行严格有据回答</p>
                  </div>
                  <span className={`zz-pill ${model.configured ? 'is-green' : 'is-neutral'}`}>
                    {model.configured ? `模型已就绪 (${model.model})` : '规则模式可用'}
                  </span>
                </div>

                <div className="zz-form-stack">
                  <label className="zz-field">
                    <span>分析任务模式</span>
                    <select
                      value={aiTask}
                      onChange={(e) => setAiTask(e.target.value as typeof aiTask)}
                    >
                      <option value="synthesis">跨论文方法与结论对比综述</option>
                      <option value="reading">单篇论文深度答疑与公式/机制解释</option>
                      <option value="directions">基于现有局限生成下一步研究方向</option>
                      <option value="replication">拆解实验复刻步骤与基线对照</option>
                    </select>
                  </label>

                  <label className="zz-field">
                    <span>你的研究问题</span>
                    <textarea
                      rows={4}
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="例如：这几篇论文在评估多 Agent 系统时各自采用了什么指标？它们的共同局限是什么？"
                    />
                  </label>

                  <button
                    className="zz-btn is-primary"
                    disabled={busy}
                    onClick={() => runAction(askAI)}
                  >
                    {busy ? <LoaderCircle size={16} className="zz-spin" /> : <Sparkles size={16} />}
                    提交所选文献证据并提问
                  </button>

                  {aiOutput && (
                    <div className="zz-ai-output">
                      <div className="zz-ai-output-head">
                        <strong>AI 研究分析报告</strong>
                        <button
                          className="zz-btn is-small"
                          onClick={() => {
                            setSynthesisBody((prev) =>
                              prev ? `${prev}\n\n## AI 辅助分析补充\n\n${aiOutput}` : aiOutput,
                            );
                            notify('已追加至左侧综述正文');
                          }}
                        >
                          追加到左侧综述
                        </button>
                      </div>
                      <pre>{aiOutput}</pre>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </main>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="zz-toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Modals */}
      {modal === 'new' && (
        <div className="zz-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="zz-modal" role="dialog" aria-modal="true" aria-label="新建研究课题">
            <header className="zz-modal-head">
              <div>
                <h2>新建研究课题</h2>
                <p>将同一方向的论文、PDF 全文、精读卡与综述集中管理</p>
              </div>
              <button aria-label="关闭弹窗" onClick={() => setModal('')}>
                <X size={20} />
              </button>
            </header>
            <form
              className="zz-form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                runAction(async () => {
                  if (!auth) throw new Error('请先登录账号后再创建持久化课题');
                  const d = await request('/api/m/zhizheng-research/workspace', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'create',
                      requestId: createRequest.current,
                      title: f.get('title'),
                      topic: f.get('topic'),
                      scope: f.get('scope'),
                      researchType: f.get('researchType'),
                      materials: '',
                      unresolved: '',
                    }),
                  });
                  createRequest.current = uid();
                  setProject(d.project);
                  setFiles([]);
                  setVersions([]);
                  setDemo(false);
                  setProjects((prev) => [
                    {
                      id: d.project.id,
                      title: d.project.state.title,
                      revision: 1,
                      updated_at: d.project.updatedAt,
                    },
                    ...prev,
                  ]);
                  setModal('');
                  setActiveTab('library');
                  notify('新研究课题已创建');
                });
              }}
            >
              <label className="zz-field">
                <span>课题名称</span>
                <input
                  name="title"
                  required
                  autoFocus
                  maxLength={200}
                  defaultValue="金融 Agent 的多 Agent 评估系统设计"
                />
              </label>
              <label className="zz-field">
                <span>核心研究问题</span>
                <textarea
                  name="topic"
                  rows={3}
                  placeholder="本课题希望回答什么核心科学或工程问题？"
                />
              </label>
              <div className="zz-form-row-two">
                <label className="zz-field">
                  <span>研究类型</span>
                  <select name="researchType">
                    <option>文献综述</option>
                    <option>系统设计与验证</option>
                    <option>实证研究</option>
                    <option>理论研究</option>
                  </select>
                </label>
                <label className="zz-field">
                  <span>研究范围与边界</span>
                  <input name="scope" placeholder="研究对象与适用场景" />
                </label>
              </div>
              <div className="zz-modal-actions">
                <button type="button" className="zz-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="zz-btn is-primary" disabled={busy}>
                  <Plus size={16} /> 创建课题
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal === 'edit-project' && project && (
        <div className="zz-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="zz-modal" role="dialog" aria-modal="true" aria-label="编辑课题信息">
            <header className="zz-modal-head">
              <div>
                <h2>编辑课题信息</h2>
              </div>
              <button aria-label="关闭弹窗" onClick={() => setModal('')}>
                <X size={20} />
              </button>
            </header>
            <form
              className="zz-form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                runAction(async () => {
                  await persist({
                    ...state,
                    title: String(f.get('title')),
                    topic: String(f.get('topic')),
                    scope: String(f.get('scope')),
                  });
                  setModal('');
                  notify('课题信息已更新');
                });
              }}
            >
              <label className="zz-field">
                <span>课题名称</span>
                <input name="title" required defaultValue={state.title} />
              </label>
              <label className="zz-field">
                <span>核心研究问题</span>
                <textarea name="topic" rows={3} defaultValue={state.topic} />
              </label>
              <label className="zz-field">
                <span>研究范围与边界</span>
                <textarea name="scope" rows={2} defaultValue={state.scope} />
              </label>
              <div className="zz-modal-actions">
                <button type="button" className="zz-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="zz-btn is-primary" disabled={busy || saving}>
                  <Save size={16} /> 保存修改
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal === 'manual' && (
        <div className="zz-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="zz-modal" role="dialog" aria-modal="true" aria-label="手动录入文献">
            <header className="zz-modal-head">
              <div>
                <h2>手动录入文献</h2>
                <p>支持直接填写论文标题、作者、DOI 与摘要</p>
              </div>
              <button aria-label="关闭弹窗" onClick={() => setModal('')}>
                <X size={20} />
              </button>
            </header>
            <form
              className="zz-form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                runAction(() =>
                  addPapersToLibrary([
                    {
                      id: uid(),
                      title: String(f.get('title')),
                      doi: normalizeDOI(String(f.get('doi') || '')),
                      authors: String(f.get('authors') || ''),
                      year: String(f.get('year') || ''),
                      abstract: String(f.get('abstract') || ''),
                      source: '作者手动录入 / ' + now(),
                      verified: false,
                      fileId: '',
                      readStatus: f.get('abstract') ? 'abstract' : 'metadata',
                      updatedAt: now(),
                    },
                  ]),
                );
              }}
            >
              <label className="zz-field">
                <span>论文标题</span>
                <input name="title" required autoFocus placeholder="输入论文完整标题" />
              </label>
              <div className="zz-form-row-two">
                <label className="zz-field">
                  <span>作者</span>
                  <input name="authors" placeholder="如：Zhang et al." />
                </label>
                <label className="zz-field">
                  <span>发表年份</span>
                  <input name="year" maxLength={4} placeholder="如：2026" />
                </label>
              </div>
              <label className="zz-field">
                <span>DOI（可选）</span>
                <input name="doi" placeholder="如：10.18653/v1/2021.emnlp-main.300" />
              </label>
              <label className="zz-field">
                <span>论文摘要（可选）</span>
                <textarea name="abstract" rows={4} placeholder="粘贴论文摘要，方便后续摘录与综述…" />
              </label>
              <div className="zz-modal-actions">
                <button type="button" className="zz-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="zz-btn is-primary" disabled={busy}>
                  <Plus size={16} /> 加入文献库
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modal === 'export' && (
        <div className="zz-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="zz-modal" role="dialog" aria-modal="true" aria-label="导出研究成果">
            <header className="zz-modal-head">
              <div>
                <h2>导出研究资料</h2>
                <p>将文献库、综述 Markdown 或完整课题 JSON 导出到本地</p>
              </div>
              <button aria-label="关闭弹窗" onClick={() => setModal('')}>
                <X size={20} />
              </button>
            </header>
            <div className="zz-export-list">
              <button className="zz-export-item" onClick={() => handleExport('md')}>
                <FileText size={20} />
                <div>
                  <strong>导出研究综述与证据报告 (.md)</strong>
                  <p>包含当前跨论文综述正文、论断与原文证据锚点</p>
                </div>
                <ArrowUpRight size={18} />
              </button>
              <button className="zz-export-item" onClick={() => handleExport('bib')}>
                <BookOpen size={20} />
                <div>
                  <strong>导出 BibTeX 参考文献 (.bib)</strong>
                  <p>可用于 LaTeX、Overleaf 或 Zotero 文献管理</p>
                </div>
                <ArrowUpRight size={18} />
              </button>
              <button className="zz-export-item" onClick={() => handleExport('backup')}>
                <History size={20} />
                <div>
                  <strong>导出课题完整 JSON 备份 (.json)</strong>
                  <p>包含全部论文元数据、精读卡、原文摘录与版本状态</p>
                </div>
                <ArrowUpRight size={18} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
