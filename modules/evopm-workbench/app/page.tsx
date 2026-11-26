'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileCheck2,
  FileCode2,
  FileText,
  FolderPlus,
  GitBranch,
  Inbox,
  Layers3,
  LoaderCircle,
  LogIn,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  Action,
  Cluster,
  EvidenceLink,
  Plan,
  Product,
  Requirement,
  Signal,
  Snapshot,
  State,
} from '@/modules/evopm-workbench/lib/contracts';
import { CSV_TEMPLATE, parseSignals } from '@/modules/evopm-workbench/components/workbench/import';

type ApiResponse = Snapshot & {
  error?: string;
  result?: {
    error?: string;
    productId?: string;
    filename?: string;
    changePackage?: unknown;
    [key: string]: unknown;
  };
};

type StageTab = 'signals' | 'specify' | 'plan-tasks' | 'canvas' | 'delivery';

type CanvasNode = {
  id: string;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'cluster' | 'spec' | 'plan' | 'task' | 'verify';
  code: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  tone: 'blue' | 'green' | 'amber' | 'neutral';
  detail: {
    heading: string;
    summary: string;
    scope?: string;
    acceptance?: string;
    meta?: string;
    rawCluster?: Cluster;
    rawReq?: Requirement;
    rawPlan?: Plan;
  };
};

type CanvasEdge = {
  id: string;
  from: string;
  to: string;
  flow: 'execution' | 'data' | 'dependency';
};

const EMPTY: State = {
  products: [],
  signals: [],
  clusters: [],
  requirements: [],
  plans: [],
  approvals: [],
  runs: [],
  jobs: [],
  evaluations: [],
  releases: [],
  outcomes: [],
  audit: [],
};

const LABELS: Record<string, string> = {
  draft: '待评审 Spec',
  needs_evidence: '待补证据',
  approved: '已批准',
  rejected: '已驳回',
  active: '活跃痛点簇',
  discarded: '已归档',
  linked: '已转 Spec',
  completed: '已完成',
  failed: '失败',
  waiting: '等待中',
  passed: '验证通过',
  pending: '待验证',
  sample: '示例课题',
  manual: '正式项目',
};

const iso = (d: string) => {
  try {
    return new Date(d).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return d;
  }
};

function downloadFile(name: string, content: string, type = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 600);
}

function generateSpecMarkdown(product?: Product, requirements: Requirement[] = [], signals: Signal[] = []) {
  const lines = [
    `# Feature Specification: ${product?.name || '未命名产品'}`,
    '',
    `- **目标用户**: ${product?.users || '待补充'}`,
    `- **当前产品目标**: ${product?.goal || '待补充'}`,
    `- **核心观测指标**: ${product?.metric || '待补充'}`,
    `- **仓库地址**: ${product?.repository || '未绑定'}`,
    '',
    '---',
    '',
  ];
  if (!requirements.length) {
    lines.push('> 尚未创建需求规格（Spec）。请先从 Stage 1 痛点簇提炼需求规格。');
    return lines.join('\n');
  }
  requirements.forEach((req, idx) => {
    lines.push(`## Spec ${String(idx + 1).padStart(2, '0')}: ${req.title}`);
    lines.push('');
    lines.push(`- **决策状态**: ${LABELS[req.decision] || req.decision} (v${req.version})`);
    lines.push(
      `- **RICE / 优先级评分**: Priority ${req.score.priority.toFixed(1)} (Impact ${req.score.impact} / Confidence ${req.score.confidence} / Effort ${req.score.effort})`,
    );
    lines.push('');
    lines.push('### User Story & Problem Statement');
    lines.push(req.story || '待补充');
    lines.push('');
    lines.push('### Scope & Boundaries');
    lines.push(req.scope || '待补充');
    lines.push('');
    lines.push('### Acceptance Criteria');
    lines.push(req.acceptance || '待补充');
    lines.push('');
    if (req.links.length) {
      lines.push('### Evidence & User Signals');
      req.links.forEach((l) => {
        const sig = signals.find((s) => s.id === l.signalId);
        lines.push(`- **[${l.relation}]** "${sig?.text || l.signalId}" — *${l.note || '原始反馈证据'}*`);
      });
      lines.push('');
    }
  });
  return lines.join('\n');
}

function generatePlanMarkdown(product?: Product, plans: Plan[] = []) {
  const lines = [
    `# Technical Implementation Plan: ${product?.name || '未命名产品'}`,
    '',
    '---',
    '',
  ];
  if (!plans.length) {
    lines.push('> 尚未创建技术方案（Plan）。请在 Stage 2 批准需求后进入 Stage 3 创建技术方案。');
    return lines.join('\n');
  }
  plans.forEach((p, idx) => {
    lines.push(`## Plan ${String(idx + 1).padStart(2, '0')}: ${p.title} (v${p.version})`);
    lines.push('');
    lines.push(`- **Baseline Commit**: \`${p.baseCommit}\``);
    lines.push(`- **Execution Budget**: ${p.budget}`);
    lines.push('');
    lines.push('### Goal');
    lines.push(p.goal);
    lines.push('');
    lines.push('### Technical Scope');
    lines.push(p.scope);
    lines.push('');
    lines.push('### Non-Goals');
    lines.push(p.nonGoals);
    lines.push('');
    lines.push('### Risks & Safeguards');
    lines.push(p.risks);
    lines.push('');
    lines.push('### Rollback Strategy');
    lines.push(p.rollback);
    lines.push('');
  });
  return lines.join('\n');
}

function generateTasksMarkdown(product?: Product, plans: Plan[] = [], requirements: Requirement[] = []) {
  const lines = [
    `# Executable Tasks Checklist: ${product?.name || '未命名产品'}`,
    '',
    '---',
    '',
  ];
  if (!plans.length && !requirements.length) {
    lines.push('- [ ] T001 收集用户反馈并建立首个痛点簇 (`/speckit.specify`)');
    lines.push('- [ ] T002 编写需求规格与验收标准 (`/speckit.specify`)');
    lines.push('- [ ] T003 制定技术方案与回滚边界 (`/speckit.plan`)');
    return lines.join('\n');
  }
  let taskNum = 1;
  plans.forEach((p) => {
    lines.push(`## ${p.title} (v${p.version})`);
    lines.push('');
    const scopeLines = p.scope
      .split(/[\r\n；;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const accLines = p.acceptance
      .split(/[\r\n；;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    scopeLines.forEach((item) => {
      lines.push(`- [ ] T${String(taskNum++).padStart(3, '0')} [Impl] ${item}`);
    });
    accLines.forEach((item) => {
      lines.push(`- [ ] T${String(taskNum++).padStart(3, '0')} [Verify] 验收：${item}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}

export default function SpecKitWorkbench() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [productId, setProductId] = useState('');
  const [activeStage, setActiveStage] = useState<StageTab>('signals');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [modal, setModal] = useState<string>('');

  // Selection & Filters
  const [search, setSearch] = useState('');
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [targetRequirementForPlan, setTargetRequirementForPlan] = useState<Requirement | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [importText, setImportText] = useState('');
  const [specPreviewTab, setSpecPreviewTab] = useState<'spec' | 'plan' | 'tasks'>('spec');

  // Architecture & Workflow Canvas state
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFilter, setCanvasFilter] = useState<'all' | 'execution' | 'data' | 'dependency'>('all');
  const [canvasSelectedId, setCanvasSelectedId] = useState<string>('');
  const [canvasFocusRelated, setCanvasFocusRelated] = useState(false);

  const busyRef = useRef(false);
  const revisionRef = useRef(0);

  const state = snapshot?.state ?? EMPTY;
  const product = state.products.find((p) => p.id === productId) ?? state.products[0];
  const pid = product?.id ?? '';

  const signals = useMemo(() => state.signals.filter((x) => x.productId === pid), [state.signals, pid]);
  const clusters = useMemo(() => state.clusters.filter((x) => x.productId === pid), [state.clusters, pid]);
  const requirements = useMemo(
    () => state.requirements.filter((x) => x.productId === pid),
    [state.requirements, pid],
  );
  const plans = useMemo(() => state.plans.filter((x) => x.productId === pid), [state.plans, pid]);
  const evaluations = useMemo(
    () => state.evaluations.filter((x) => x.productId === pid),
    [state.evaluations, pid],
  );
  const releases = useMemo(() => state.releases.filter((x) => x.productId === pid), [state.releases, pid]);
  const outcomes = useMemo(() => state.outcomes.filter((x) => x.productId === pid), [state.outcomes, pid]);

  const dataKnown = !!snapshot && !needsLogin && !loadError;
  const writeDisabled = busy || loading || !dataKnown;

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/m/evopm-workbench/workbench', { cache: 'no-store' });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        setSnapshot(null);
        setNeedsLogin(res.status === 401);
        throw new Error(data.error || (res.status === 401 ? '请登录以打开你的工作区' : '读取工作区失败'));
      }
      setNeedsLogin(false);
      setSnapshot(data);
      revisionRef.current = data.revision;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '无法连接服务');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  async function mutate(action: Action): Promise<ApiResponse | null> {
    if (busyRef.current || loading || !dataKnown) return null;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch('/api/m/evopm-workbench/workbench', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: revisionRef.current,
          requestId: crypto.randomUUID(),
          action,
        }),
      });
      const data = (await res.json()) as ApiResponse;
      if (res.status === 401) {
        setNeedsLogin(true);
        setLoadError('登录已失效，请重新登录');
      }
      if (!res.ok) {
        throw new Error(data.error || '保存失败');
      }
      setSnapshot(data);
      revisionRef.current = data.revision;
      if (action.type === 'sample.load' && data.result?.productId) {
        setProductId(data.result.productId);
      }
      setToast({
        text: data.result?.error || data.notice || '已保存到云端工作区',
        error: !!data.result?.error,
      });
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失败';
      setToast({ text: message, error: true });
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const planApproval = (p: Plan) => {
    const a = state.approvals.filter((x) => x.planId === p.id).at(-1);
    const r = requirements.find((x) => x.id === p.requirementId);
    if (
      !a ||
      a.planVersion !== p.version ||
      a.inputVersion !== p.inputVersion ||
      a.baseCommit !== p.baseCommit ||
      r?.version !== p.inputVersion ||
      r.decision !== 'approved' ||
      (p.productVersion ?? 1) !== (product?.version ?? 1)
    ) {
      return undefined;
    }
    return a;
  };

  const specMd = useMemo(
    () => generateSpecMarkdown(product, requirements, signals),
    [product, requirements, signals],
  );
  const planMd = useMemo(() => generatePlanMarkdown(product, plans), [product, plans]);
  const tasksMd = useMemo(
    () => generateTasksMarkdown(product, plans, requirements),
    [product, plans, requirements],
  );

  const activePreviewText =
    specPreviewTab === 'spec' ? specMd : specPreviewTab === 'plan' ? planMd : tasksMd;

  const filteredSignals = useMemo(
    () =>
      signals.filter((s) =>
        `${s.text} ${s.source} ${s.userKey}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [signals, search],
  );

  // Build interactive architecture & execution graph from live product data
  const canvasGraph = useMemo(() => {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];
    const NODE_W = 240;
    const NODE_H = 126;
    const COL_X = [40, 350, 660, 970, 1280];
    const ROW_GAP = 156;

    // 1. Clusters (Column 0)
    const displayClusters = clusters.length
      ? clusters
      : [
          {
            id: 'demo-cluster-1',
            productId: pid,
            title: '多工作台入口分散，缺乏可视化架构画布与 SpecKit 闭环',
            signalIds: signals.map((s) => s.id),
            status: 'active' as const,
            reason: '',
            mode: 'sample' as const,
          },
        ];

    displayClusters.forEach((c, idx) => {
      nodes.push({
        id: `cluster:${c.id}`,
        col: 0,
        x: COL_X[0],
        y: 50 + idx * ROW_GAP,
        w: NODE_W,
        h: NODE_H,
        kind: 'cluster',
        code: `CLUSTER-${String(idx + 1).padStart(2, '0')}`,
        title: c.title,
        subtitle: `${c.signalIds.length} 条用户痛点原话证据`,
        statusLabel: LABELS[c.status] || c.status,
        tone: c.status === 'linked' ? 'green' : 'blue',
        detail: {
          heading: `痛点主题簇 · ${c.title}`,
          summary:
            signals.find((s) => s.id === c.signalIds[0])?.text ||
            '聚合来自真实用户的核心痛点反馈，作为后续 /speckit.specify 立项的原始证据锚点。',
          meta: `包含 ${c.signalIds.length} 条原始反馈 · 状态：${LABELS[c.status] || c.status}`,
          rawCluster: clusters.find((x) => x.id === c.id),
        },
      });
    });

    // 2. Requirements / Specs (Column 1)
    const displayReqs = requirements.length
      ? requirements
      : [
          {
            id: 'demo-req-1',
            productId: pid,
            clusterId: displayClusters[0].id,
            title: 'SpecKit 流水线与可视化架构画布融合规格',
            story: '作为研发与产品负责人，希望在统一工作台中既能管理 Spec/Plan/Tasks，又能通过架构画布直观审视节点流向与验收状态。',
            scope: '集成 4 步 SpecKit 流水线与 SVG 节点关系画布，支持按执行流、数据流、依赖关系过滤。',
            acceptance: '1. 画布节点实时映射当前产品 Spec 与 Plan；2. 点击节点可在右侧直接审查并编辑。',
            links: [],
            quality: { score: 92, checks: [], missing: [] },
            score: { impact: 5, confidence: 5, effort: 2, priority: 12.5 },
            critic: '需保持画布与列表数据同源。',
            decision: 'approved' as const,
            decisionNote: '已批准进入技术方案设计',
            version: 1,
            mode: 'sample' as const,
          },
        ];

    displayReqs.forEach((r, idx) => {
      const nodeId = `spec:${r.id}`;
      nodes.push({
        id: nodeId,
        col: 1,
        x: COL_X[1],
        y: 50 + idx * ROW_GAP,
        w: NODE_W,
        h: NODE_H,
        kind: 'spec',
        code: `SPEC-${String(idx + 1).padStart(2, '0')} · v${r.version}`,
        title: r.title,
        subtitle: `优先级 ${r.score.priority.toFixed(1)} · 完整度 ${r.quality.score}分`,
        statusLabel: LABELS[r.decision] || r.decision,
        tone: r.decision === 'approved' ? 'green' : r.decision === 'rejected' ? 'amber' : 'blue',
        detail: {
          heading: `需求规格 (/speckit.specify) · ${r.title}`,
          summary: r.story,
          scope: r.scope,
          acceptance: r.acceptance,
          meta: `状态：${LABELS[r.decision] || r.decision} · 版本 v${r.version}`,
          rawReq: requirements.find((x) => x.id === r.id),
        },
      });
      const sourceCluster = displayClusters.find((c) => c.id === r.clusterId) || displayClusters[0];
      if (sourceCluster) {
        edges.push({
          id: `e:cluster:${sourceCluster.id}->${nodeId}`,
          from: `cluster:${sourceCluster.id}`,
          to: nodeId,
          flow: 'data',
        });
      }
    });

    // 3. Technical Plans (Column 2)
    const displayPlans = plans.length
      ? plans
      : [
          {
            id: 'demo-plan-1',
            productId: pid,
            requirementId: displayReqs[0].id,
            title: 'SpecKit + 可视化架构画布实施方案',
            goal: '将痛点簇、Spec、Plan、Tasks 与验收回执映射为五列有向无环图 (DAG)。',
            nonGoals: '不引入外部重型图形库，使用原生高性能 SVG 贝塞尔连线。',
            scope: '实现五列自动布局与贝塞尔连线；支持缩放与三类流向过滤；支持节点检查器联动编辑。',
            risks: '节点过多时需自动撑开画布高度。',
            acceptance: 'tsc 零错误通过；画布节点点击可联动详情抽屉。',
            rollback: '按基线 Commit 一键回滚视图层。',
            baseCommit: '9f2df9c7c5d0db6e134837aa0a3b5a54902e0788',
            budget: '2 小时 / 自动化测试门禁',
            version: 1,
            inputVersion: 1,
            mode: 'sample' as const,
          },
        ];

    const taskItems: { id: string; planId: string; code: string; text: string; kind: 'impl' | 'verify' }[] = [];

    displayPlans.forEach((p, idx) => {
      const realPlan = plans.find((x) => x.id === p.id);
      const approval = realPlan ? planApproval(realPlan) : { decision: 'approved' as const };
      const nodeId = `plan:${p.id}`;
      nodes.push({
        id: nodeId,
        col: 2,
        x: COL_X[2],
        y: 50 + idx * ROW_GAP,
        w: NODE_W,
        h: NODE_H,
        kind: 'plan',
        code: `PLAN-${String(idx + 1).padStart(2, '0')} · v${p.version}`,
        title: p.title,
        subtitle: `基线 ${p.baseCommit.slice(0, 8)} · ${p.budget}`,
        statusLabel: approval?.decision === 'approved' ? '方案已批准' : '待审批方案',
        tone: approval?.decision === 'approved' ? 'green' : 'amber',
        detail: {
          heading: `技术方案 (/speckit.plan) · ${p.title}`,
          summary: p.goal,
          scope: p.scope,
          acceptance: `不做：${p.nonGoals}\n回滚：${p.rollback}`,
          meta: `基线 Commit: ${p.baseCommit} · 预算: ${p.budget}`,
          rawPlan: realPlan,
        },
      });

      const parentReq = displayReqs.find((r) => r.id === p.requirementId) || displayReqs[0];
      if (parentReq) {
        edges.push({
          id: `e:spec:${parentReq.id}->${nodeId}`,
          from: `spec:${parentReq.id}`,
          to: nodeId,
          flow: 'execution',
        });
      }

      // Extract tasks from Plan scope
      const scopeParts = p.scope
        .split(/[\r\n；;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      scopeParts.forEach((part) => {
        taskItems.push({
          id: `task:${p.id}:${taskItems.length + 1}`,
          planId: p.id,
          code: `TASK-T${String(taskItems.length + 1).padStart(2, '0')}`,
          text: part,
          kind: 'impl',
        });
      });
    });

    // 4. Tasks (Column 3)
    taskItems.forEach((t, idx) => {
      nodes.push({
        id: t.id,
        col: 3,
        x: COL_X[3],
        y: 50 + idx * 142,
        w: NODE_W,
        h: 114,
        kind: 'task',
        code: t.code,
        title: t.text.slice(0, 36) + (t.text.length > 36 ? '…' : ''),
        subtitle: '研发执行单元 (/speckit.tasks)',
        statusLabel: '可执行模块',
        tone: 'blue',
        detail: {
          heading: `可执行研发任务 (${t.code})`,
          summary: t.text,
          meta: '由 /speckit.plan 修改范围自动拆解的原子工程任务',
        },
      });
      edges.push({
        id: `e:plan:${t.planId}->${t.id}`,
        from: `plan:${t.planId}`,
        to: t.id,
        flow: 'execution',
      });
    });

    // 5. Verification & Delivery Gates (Column 4)
    const verifyNodes = [
      {
        id: 'verify:gate',
        code: 'VERIFY-GATE',
        title: '质量门禁与契约验收',
        subtitle: `${evaluations.length} 份评测回执 · tsc + 82 单测`,
        statusLabel: evaluations.some((e) => e.status === 'passed') ? '验证通过' : '持续验证',
        tone: 'green' as const,
        summary: '验证所有拆解任务是否满足 Spec 验收标准、乐观并发 CAS 契约以及自动化回归测试。',
      },
      {
        id: 'verify:delivery',
        code: 'DELIVERY-PACK',
        title: 'SpecKit 三件套与上线回看',
        subtitle: `spec.md · plan.md · tasks.md (${outcomes.length} 项效果观察)`,
        statusLabel: releases.length ? '已登记发布' : '就绪可导出',
        tone: 'green' as const,
        summary: '汇总生成标准 SpecKit 工程文档（spec.md / plan.md / tasks.md），并记录发布前后的核心指标对照。',
      },
    ];

    verifyNodes.forEach((v, idx) => {
      nodes.push({
        id: v.id,
        col: 4,
        x: COL_X[4],
        y: 50 + idx * ROW_GAP,
        w: NODE_W,
        h: NODE_H,
        kind: 'verify',
        code: v.code,
        title: v.title,
        subtitle: v.subtitle,
        statusLabel: v.statusLabel,
        tone: v.tone,
        detail: {
          heading: `交付与验收门禁 · ${v.title}`,
          summary: v.summary,
          meta: v.subtitle,
        },
      });
    });

    taskItems.forEach((t) => {
      edges.push({
        id: `e:${t.id}->verify:gate`,
        from: t.id,
        to: 'verify:gate',
        flow: 'dependency',
      });
    });
    edges.push({
      id: 'e:verify:gate->verify:delivery',
      from: 'verify:gate',
      to: 'verify:delivery',
      flow: 'data',
    });

    const maxBottom = Math.max(460, ...nodes.map((n) => n.y + n.h + 60));
    return { nodes, edges, width: 1560, height: maxBottom };
  }, [clusters, requirements, plans, signals, evaluations, releases, outcomes, pid]);

  const selectedCanvasNode = useMemo(
    () =>
      canvasGraph.nodes.find((n) => n.id === canvasSelectedId) ||
      canvasGraph.nodes.find((n) => n.kind === 'spec') ||
      canvasGraph.nodes[0] ||
      null,
    [canvasGraph.nodes, canvasSelectedId],
  );

  return (
    <div className="sk-shell">
      {/* Top Header */}
      <header className="sk-header">
        <div className="sk-brand">
          <div className="sk-logo">SK</div>
          <div>
            <div className="sk-title-row">
              <h1>SpecKit 研发工作台</h1>
              <span className="sk-badge">AI PM · EvoPM · AI 研发协作 三合一主线</span>
            </div>
            <p className="sk-subtitle">
              以 SpecKit 为主线：用户痛点采集 → 需求规格 (/speckit.specify) → 技术方案与任务 (/speckit.plan &amp; tasks) → 交付验收与导出
            </p>
          </div>
        </div>

        <div className="sk-header-controls">
          <div className="sk-product-picker">
            <select
              aria-label="切换当前产品"
              disabled={!dataKnown || !state.products.length}
              value={pid}
              onChange={(e) => setProductId(e.target.value)}
            >
              {!product && <option value="">尚未创建产品…</option>}
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({LABELS[p.mode] || p.mode})
                </option>
              ))}
            </select>
          </div>

          <button
            className="sk-btn"
            disabled={writeDisabled}
            onClick={() => setModal('product')}
          >
            <FolderPlus size={16} />
            {product ? '新建 / 编辑产品' : '新建产品'}
          </button>

          <button
            className="sk-btn"
            disabled={writeDisabled}
            onClick={() => void mutate({ type: 'sample.load' })}
          >
            <BookOpen size={16} />
            一键载入示例项目
          </button>

          <button
            className="sk-btn"
            disabled={busy || loading}
            onClick={() => void refresh()}
            title="刷新云端数据"
          >
            <RefreshCw size={16} className={loading ? 'sk-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 4-Stage SpecKit Pipeline Navigation */}
      <nav className="sk-pipeline-nav" aria-label="SpecKit 研发四步流水线">
        <button
          className={`sk-stage-tab ${activeStage === 'signals' ? 'is-active' : ''}`}
          onClick={() => setActiveStage('signals')}
        >
          <span className="sk-stage-num">01</span>
          <Inbox size={18} />
          <div className="sk-stage-text">
            <strong>痛点与反馈池</strong>
            <small>Signals &amp; Discovery</small>
          </div>
          <em className="sk-count">{signals.length}</em>
        </button>

        <button
          className={`sk-stage-tab ${activeStage === 'specify' ? 'is-active' : ''}`}
          onClick={() => setActiveStage('specify')}
        >
          <span className="sk-stage-num">02</span>
          <Layers3 size={18} />
          <div className="sk-stage-text">
            <strong>需求规格定义</strong>
            <small>/speckit.specify</small>
          </div>
          <em className="sk-count">{requirements.length}</em>
        </button>

        <button
          className={`sk-stage-tab ${activeStage === 'plan-tasks' ? 'is-active' : ''}`}
          onClick={() => setActiveStage('plan-tasks')}
        >
          <span className="sk-stage-num">03</span>
          <GitBranch size={18} />
          <div className="sk-stage-text">
            <strong>技术方案与任务</strong>
            <small>/speckit.plan &amp; tasks</small>
          </div>
          <em className="sk-count">{plans.length}</em>
        </button>

        <button
          className={`sk-stage-tab ${activeStage === 'canvas' ? 'is-active' : ''}`}
          onClick={() => setActiveStage('canvas')}
        >
          <span className="sk-stage-num">04</span>
          <Workflow size={18} />
          <div className="sk-stage-text">
            <strong>架构与协作画布</strong>
            <small>Architecture Canvas</small>
          </div>
          <em className="sk-count">{canvasGraph.nodes.length}</em>
        </button>

        <button
          className={`sk-stage-tab ${activeStage === 'delivery' ? 'is-active' : ''}`}
          onClick={() => setActiveStage('delivery')}
        >
          <span className="sk-stage-num">05</span>
          <Rocket size={18} />
          <div className="sk-stage-text">
            <strong>交付验收与 SpecKit 导出</strong>
            <small>/speckit.implement</small>
          </div>
          <em className="sk-count">{releases.length + outcomes.length}</em>
        </button>
      </nav>

      {/* Auth / Error Banners */}
      {needsLogin && (
        <div className="sk-banner is-warn" role="status">
          <ShieldCheck size={20} />
          <div>
            <strong>请先登录以同步你的 SpecKit 研发项目</strong>
            <p>登录后可创建产品、保存需求规格、审批技术方案并导出 SpecKit 工程文档。</p>
          </div>
          <a
            className="sk-btn is-primary"
            href={`/signin-with-chatgpt?return_to=${encodeURIComponent('/m/evopm-workbench')}`}
            target="_top"
          >
            <LogIn size={16} /> 登录工作区
          </a>
        </div>
      )}

      {loadError && !needsLogin && (
        <div className="sk-banner is-error" role="alert">
          <AlertTriangle size={20} />
          <span>{loadError}</span>
          <button className="sk-btn is-small" onClick={() => void refresh()}>
            重试
          </button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="sk-empty-hero">
          <LoaderCircle size={32} className="sk-spin" />
          <h2>正在同步 SpecKit 研发工作区…</h2>
        </div>
      ) : !product ? (
        <div className="sk-empty-hero">
          <FileCode2 size={42} />
          <h2>创建你的第一个 SpecKit 产品工作区</h2>
          <p>
            将原本分散在 AI PM Studio、AI 研发协作与 EvoPM 中的能力统一收敛为一条清晰的 Spec → Plan → Tasks → Delivery 研发流水线。
          </p>
          <div className="sk-btn-row">
            <button
              className="sk-btn is-primary"
              disabled={writeDisabled}
              onClick={() => setModal('product')}
            >
              <Plus size={16} /> 创建新产品
            </button>
            <button
              className="sk-btn"
              disabled={writeDisabled}
              onClick={() => void mutate({ type: 'sample.load' })}
            >
              <BookOpen size={16} /> 一键加载完整示例项目
            </button>
          </div>
        </div>
      ) : (
        <main className="sk-main">
          {/* Active Product Context Bar */}
          <section className="sk-product-strip">
            <div className="sk-product-meta">
              <span className="sk-pill is-blue">{LABELS[product.mode] || product.mode}</span>
              <h2>{product.name}</h2>
              {product.goal && <p>目标：{product.goal}</p>}
              {product.metric && <span className="sk-pill">核心指标：{product.metric}</span>}
            </div>
            <div className="sk-product-stats">
              <span>已同步版本 v{snapshot?.revision ?? 0}</span>
              <button
                className="sk-btn is-small"
                onClick={() => setActiveStage('delivery')}
              >
                <FileCode2 size={14} /> 一键预览 / 导出 SpecKit 文档
              </button>
            </div>
          </section>

          {/* STAGE 1: SIGNALS & CLUSTERS */}
          {activeStage === 'signals' && (
            <div className="sk-bento-two">
              {/* Left: Raw User Feedback Inbox */}
              <section className="sk-card">
                <div className="sk-card-head">
                  <div>
                    <h3>原始痛点与用户反馈池 ({signals.length})</h3>
                    <p>录入或批量导入真实用户原话，勾选相似痛点归入右侧「痛点簇」</p>
                  </div>
                  <div className="sk-btn-row">
                    <button
                      className="sk-btn is-small"
                      disabled={writeDisabled}
                      onClick={() => {
                        setImportText('');
                        setModal('import-signals');
                      }}
                    >
                      <Upload size={14} /> 批量导入 CSV/JSON
                    </button>
                    <button
                      className="sk-btn is-small is-primary"
                      disabled={writeDisabled}
                      onClick={() => setModal('add-signal')}
                    >
                      <Plus size={14} /> 录入痛点反馈
                    </button>
                  </div>
                </div>

                <div className="sk-toolbar">
                  <div className="sk-search">
                    <Search size={16} />
                    <input
                      placeholder="搜索反馈原文、来源或用户标识…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="sk-btn is-small is-primary"
                    disabled={writeDisabled || selectedSignals.length === 0}
                    onClick={() => setModal('create-cluster')}
                  >
                    <Layers3 size={14} />
                    将所选归为痛点簇 ({selectedSignals.length})
                  </button>
                </div>

                {filteredSignals.length === 0 ? (
                  <div className="sk-empty-box">
                    <Inbox size={26} />
                    <h4>暂无反馈记录</h4>
                    <p>点击右上角「录入痛点反馈」或顶部「一键载入示例项目」快速开始。</p>
                  </div>
                ) : (
                  <div className="sk-signal-list">
                    {filteredSignals.map((s) => {
                      const checked = selectedSignals.includes(s.id);
                      const inCluster = clusters.some((c) => c.signalIds.includes(s.id));
                      return (
                        <label
                          key={s.id}
                          className={`sk-signal-item ${checked ? 'is-selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedSignals((prev) =>
                                checked ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                              )
                            }
                          />
                          <div className="sk-signal-body">
                            <p>{s.text}</p>
                            <div className="sk-signal-meta">
                              <span>来源：{s.source || '手动录入'}</span>
                              <span>用户：{s.userKey || '匿名'}</span>
                              <span>{iso(s.createdAt)}</span>
                              <span className={`sk-pill ${inCluster ? 'is-green' : ''}`}>
                                {inCluster ? '已归入痛点簇' : '待归类'}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Right: Pain-Point Clusters -> Convert to Spec */}
              <aside className="sk-card">
                <div className="sk-card-head">
                  <div>
                    <h3>痛点主题簇 ({clusters.length})</h3>
                    <p>从高价值痛点簇一键立项生成 `/speckit.specify` 需求规格</p>
                  </div>
                </div>

                {clusters.length === 0 ? (
                  <div className="sk-empty-box">
                    <Layers3 size={26} />
                    <h4>尚未建立痛点簇</h4>
                    <p>在左侧勾选 1 条或多条反馈，点击「将所选归为痛点簇」。</p>
                  </div>
                ) : (
                  <div className="sk-cluster-list">
                    {clusters.map((c) => {
                      const firstSignal = signals.find((s) => s.id === c.signalIds[0]);
                      const linkedReq = requirements.find((r) => r.clusterId === c.id);
                      return (
                        <article key={c.id} className="sk-cluster-card">
                          <div className="sk-cluster-top">
                            <span className="sk-pill is-blue">{c.signalIds.length} 条原始证据</span>
                            <span className={`sk-pill ${c.status === 'linked' ? 'is-green' : ''}`}>
                              {LABELS[c.status] || c.status}
                            </span>
                          </div>
                          <h4>{c.title}</h4>
                          {firstSignal && (
                            <blockquote className="sk-quote">“{firstSignal.text}”</blockquote>
                          )}
                          <div className="sk-cluster-actions">
                            <button
                              className="sk-btn is-small is-primary"
                              disabled={writeDisabled || c.status === 'discarded'}
                              onClick={() => {
                                setSelectedCluster(c);
                                setEditingRequirement(linkedReq || null);
                                setModal('requirement-editor');
                              }}
                            >
                              <FileCheck2 size={14} />
                              {linkedReq ? '编辑关联 Spec' : '提炼为 Spec 需求规格 →'}
                            </button>
                            <button
                              className="sk-btn is-small"
                              disabled={writeDisabled}
                              onClick={() =>
                                void mutate({ type: 'run.analyze', productId: pid, clusterId: c.id })
                              }
                            >
                              <Sparkles size={14} /> AI 聚类分析
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </aside>
            </div>
          )}

          {/* STAGE 2: /speckit.specify (REQUIREMENTS & SPEC) */}
          {activeStage === 'specify' && (
            <section className="sk-card">
              <div className="sk-card-head">
                <div>
                  <h3>Stage 02 · 需求规格定义 (`/speckit.specify`)</h3>
                  <p>
                    审查用户故事、功能范围与验收标准（Acceptance Criteria）。人工批准后即可进入 Stage 03 制定技术方案。
                  </p>
                </div>
                <button
                  className="sk-btn is-primary"
                  onClick={() => setActiveStage('signals')}
                >
                  <Plus size={16} /> 从痛点簇新建需求规格
                </button>
              </div>

              {requirements.length === 0 ? (
                <div className="sk-empty-box">
                  <Layers3 size={28} />
                  <h4>暂无需求规格 (Spec)</h4>
                  <p>请先在 Stage 01 选择一个痛点簇并点击「提炼为 Spec 需求规格」。</p>
                </div>
              ) : (
                <div className="sk-spec-grid">
                  {requirements.map((r, idx) => (
                    <article key={r.id} className="sk-spec-card">
                      <div className="sk-spec-head">
                        <div className="sk-spec-title-group">
                          <span className="sk-spec-index">SPEC-{String(idx + 1).padStart(2, '0')}</span>
                          <h4>{r.title}</h4>
                          <span
                            className={`sk-pill ${
                              r.decision === 'approved'
                                ? 'is-green'
                                : r.decision === 'rejected'
                                  ? 'is-red'
                                  : 'is-amber'
                            }`}
                          >
                            {LABELS[r.decision] || r.decision} · v{r.version}
                          </span>
                        </div>
                        <div className="sk-spec-scores">
                          <span className="sk-pill">材料完整度 {r.quality.score}分</span>
                          <span className="sk-pill is-blue">
                            优先级 {r.score.priority.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="sk-spec-columns">
                        <div className="sk-spec-box">
                          <strong>用户故事与问题定义 (User Story)</strong>
                          <p>{r.story}</p>
                        </div>
                        <div className="sk-spec-box">
                          <strong>功能范围与边界 (Scope)</strong>
                          <p>{r.scope}</p>
                        </div>
                        <div className="sk-spec-box">
                          <strong>验收标准 (Acceptance Criteria)</strong>
                          <p>{r.acceptance}</p>
                        </div>
                      </div>

                      {r.decisionNote && (
                        <div className="sk-decision-note">
                          <strong>评审意见：</strong> {r.decisionNote}
                        </div>
                      )}

                      <div className="sk-spec-actions">
                        <button
                          className="sk-btn is-small"
                          disabled={writeDisabled}
                          onClick={() => {
                            const cluster = clusters.find((c) => c.id === r.clusterId) || clusters[0];
                            if (cluster) {
                              setSelectedCluster(cluster);
                              setEditingRequirement(r);
                              setModal('requirement-editor');
                            }
                          }}
                        >
                          编辑 Spec 内容
                        </button>

                        {r.decision !== 'approved' && (
                          <button
                            className="sk-btn is-small is-primary"
                            disabled={writeDisabled}
                            onClick={() =>
                              void mutate({
                                type: 'requirement.decide',
                                productId: pid,
                                requirementId: r.id,
                                decision: 'approved',
                                note: '需求边界与验收标准清晰，批准进入技术方案阶段。',
                              })
                            }
                          >
                            <Check size={14} /> 批准此 Spec
                          </button>
                        )}

                        {r.decision === 'approved' && (
                          <button
                            className="sk-btn is-small is-primary"
                            disabled={writeDisabled}
                            onClick={() => {
                              setTargetRequirementForPlan(r);
                              setEditingPlan(plans.find((p) => p.requirementId === r.id) || null);
                              setModal('plan-editor');
                            }}
                          >
                            <GitBranch size={14} /> 编写技术方案 (`/speckit.plan`) →
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* STAGE 3: /speckit.plan & /speckit.tasks */}
          {activeStage === 'plan-tasks' && (
            <section className="sk-card">
              <div className="sk-card-head">
                <div>
                  <h3>Stage 03 · 技术方案与任务拆解 (`/speckit.plan` &amp; `/speckit.tasks`)</h3>
                  <p>定义修改范围、明确不做事项（Non-Goals）、风险与回滚方案，并自动拆解可执行检查清单</p>
                </div>
                {requirements.some((r) => r.decision === 'approved') && (
                  <button
                    className="sk-btn is-primary"
                    disabled={writeDisabled}
                    onClick={() => {
                      const approvedReq = requirements.find((r) => r.decision === 'approved')!;
                      setTargetRequirementForPlan(approvedReq);
                      setEditingPlan(null);
                      setModal('plan-editor');
                    }}
                  >
                    <Plus size={16} /> 新建技术方案
                  </button>
                )}
              </div>

              {plans.length === 0 ? (
                <div className="sk-empty-box">
                  <GitBranch size={28} />
                  <h4>尚未制定技术方案 (Plan)</h4>
                  <p>请先在 Stage 02 批准一项需求规格，然后点击「编写技术方案」。</p>
                </div>
              ) : (
                <div className="sk-spec-grid">
                  {plans.map((p, idx) => {
                    const approval = planApproval(p);
                    const tasksList = [
                      ...p.scope
                        .split(/[\r\n；;]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((t) => `[实现] ${t}`),
                      ...p.acceptance
                        .split(/[\r\n；;]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((t) => `[验证] ${t}`),
                    ];
                    return (
                      <article key={p.id} className="sk-spec-card">
                        <div className="sk-spec-head">
                          <div className="sk-spec-title-group">
                            <span className="sk-spec-index">PLAN-{String(idx + 1).padStart(2, '0')}</span>
                            <h4>{p.title}</h4>
                            <span className="sk-pill">v{p.version}</span>
                            <span
                              className={`sk-pill ${
                                approval?.decision === 'approved' ? 'is-green' : 'is-amber'
                              }`}
                            >
                              {approval?.decision === 'approved' ? '方案已批准执行' : '待审批方案'}
                            </span>
                          </div>
                          <div className="sk-spec-scores">
                            <span className="sk-pill">基线: {p.baseCommit.slice(0, 10)}</span>
                            <span className="sk-pill">预算: {p.budget}</span>
                          </div>
                        </div>

                        <div className="sk-spec-columns">
                          <div className="sk-spec-box">
                            <strong>架构目标与修改范围 (Goal &amp; Scope)</strong>
                            <p>{p.goal}</p>
                            <p style={{ marginTop: 8, color: 'var(--sk-muted)' }}>范围：{p.scope}</p>
                          </div>
                          <div className="sk-spec-box">
                            <strong>非目标与风险回滚 (Non-Goals &amp; Rollback)</strong>
                            <p>不做：{p.nonGoals}</p>
                            <p style={{ marginTop: 8, color: 'var(--sk-muted)' }}>回滚：{p.rollback}</p>
                          </div>
                          <div className="sk-spec-box">
                            <strong>自动拆解任务清单 (`/speckit.tasks`)</strong>
                            <ul className="sk-task-checklist">
                              {tasksList.map((t, i) => (
                                <li key={i}>
                                  <code>T{String(i + 1).padStart(2, '0')}</code> {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="sk-spec-actions">
                          <button
                            className="sk-btn is-small"
                            disabled={writeDisabled}
                            onClick={() => {
                              const req =
                                requirements.find((r) => r.id === p.requirementId) || requirements[0];
                              setTargetRequirementForPlan(req || null);
                              setEditingPlan(p);
                              setModal('plan-editor');
                            }}
                          >
                            修订方案版本
                          </button>

                          {approval?.decision !== 'approved' && (
                            <button
                              className="sk-btn is-small is-primary"
                              disabled={writeDisabled}
                              onClick={() =>
                                void mutate({
                                  type: 'plan.approve',
                                  productId: pid,
                                  planId: p.id,
                                  decision: 'approved',
                                  note: `批准技术方案 v${p.version} 进入研发实施与交付阶段。`,
                                })
                              }
                            >
                              <Check size={14} /> 批准方案 v{p.version}
                            </button>
                          )}

                          <button
                            className="sk-btn is-small"
                            disabled={writeDisabled}
                            onClick={async () => {
                              const r = await mutate({
                                type: 'job.export',
                                productId: pid,
                                planId: p.id,
                              });
                              if (r) {
                                const exported = r.result as
                                  | { filename?: string; changePackage?: unknown }
                                  | undefined;
                                downloadFile(
                                  exported?.filename ?? `SpecKit-${p.title}-v${p.version}.json`,
                                  JSON.stringify(exported?.changePackage ?? r.result, null, 2),
                                  'application/json',
                                );
                              }
                            }}
                          >
                            <Download size={14} /> 导出变更执行包 (.json)
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* STAGE 4: ARCHITECTURE & COLLABORATION CANVAS (FROM AI-DEV-COLLABORATION-WORKBENCH) */}
          {activeStage === 'canvas' && (
            <div className="sk-canvas-layout">
              {/* Left: Directed SVG Node & Edge Graph Viewport */}
              <section className="sk-card sk-canvas-card">
                <div className="sk-canvas-toolbar">
                  <div>
                    <h3>SpecKit 架构与协作画布 (Directed Architecture Canvas)</h3>
                    <p>
                      完整保留原 AI 研发协作工作台的节点连线画布体验：实时将「痛点簇 → Spec → Plan → Tasks → 验收门禁」映射为有向图
                    </p>
                  </div>
                  <div className="sk-canvas-controls">
                    <div className="sk-flow-filters" role="group" aria-label="关系流向筛选">
                      {(
                        [
                          ['all', '全部流向'],
                          ['execution', '执行流 (Spec→Plan→Task)'],
                          ['data', '数据流 (证据→交付包)'],
                          ['dependency', '依赖/验收依据'],
                        ] as const
                      ).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          className={`sk-btn is-small ${canvasFilter === k ? 'is-primary' : ''}`}
                          onClick={() => setCanvasFilter(k)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={`sk-btn is-small ${canvasFocusRelated ? 'is-primary' : ''}`}
                      onClick={() => setCanvasFocusRelated((v) => !v)}
                    >
                      {canvasFocusRelated ? '★ 已聚焦关联链路' : '聚焦关联节点'}
                    </button>

                    <div className="sk-zoom-group">
                      <button
                        type="button"
                        className="sk-btn is-small"
                        aria-label="缩小画布"
                        onClick={() => setCanvasZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
                      >
                        <ZoomOut size={15} />
                      </button>
                      <span>{Math.round(canvasZoom * 100)}%</span>
                      <button
                        type="button"
                        className="sk-btn is-small"
                        aria-label="放大画布"
                        onClick={() => setCanvasZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(2))))}
                      >
                        <ZoomIn size={15} />
                      </button>
                      <button
                        type="button"
                        className="sk-btn is-small"
                        onClick={() => setCanvasZoom(1)}
                      >
                        100%
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column Legend Headers */}
                <div className="sk-canvas-lanes">
                  <span>01 痛点簇 (Signals)</span>
                  <span>02 需求规格 (/speckit.specify)</span>
                  <span>03 技术方案 (/speckit.plan)</span>
                  <span>04 执行模块 (/speckit.tasks)</span>
                  <span>05 验收与交付门禁</span>
                </div>

                <div className="sk-canvas-viewport" role="region" aria-label="SpecKit 架构节点画布">
                  <div
                    className="sk-canvas-size"
                    style={{
                      width: canvasGraph.width * canvasZoom,
                      height: canvasGraph.height * canvasZoom,
                    }}
                  >
                    <div
                      className="sk-canvas-plane"
                      style={{
                        width: canvasGraph.width,
                        height: canvasGraph.height,
                        transform: `scale(${canvasZoom})`,
                      }}
                    >
                      <svg
                        className="sk-canvas-svg"
                        width={canvasGraph.width}
                        height={canvasGraph.height}
                        viewBox={`0 0 ${canvasGraph.width} ${canvasGraph.height}`}
                        fill="none"
                        aria-hidden="true"
                      >
                        <defs>
                          <marker id="sk-arrow-execution" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M1 1 L7 4 L1 7" stroke="#1e3a8a" strokeWidth="1.6" fill="none" />
                          </marker>
                          <marker id="sk-arrow-data" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M1 1 L7 4 L1 7" stroke="#047857" strokeWidth="1.6" fill="none" />
                          </marker>
                          <marker id="sk-arrow-dependency" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M1 1 L7 4 L1 7" stroke="#b45309" strokeWidth="1.6" fill="none" />
                          </marker>
                        </defs>
                        {canvasGraph.edges
                          .filter((e) => canvasFilter === 'all' || e.flow === canvasFilter)
                          .map((e) => {
                            const fromNode = canvasGraph.nodes.find((n) => n.id === e.from);
                            const toNode = canvasGraph.nodes.find((n) => n.id === e.to);
                            if (!fromNode || !toNode) return null;
                            const sx = fromNode.x + fromNode.w;
                            const sy = fromNode.y + fromNode.h / 2;
                            const tx = toNode.x;
                            const ty = toNode.y + toNode.h / 2;
                            const bend = Math.max(45, Math.abs(tx - sx) / 2);
                            const d = `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`;
                            const isRelated =
                              !selectedCanvasNode ||
                              selectedCanvasNode.id === e.from ||
                              selectedCanvasNode.id === e.to;
                            const dimmed = canvasFocusRelated && !isRelated;
                            return (
                              <path
                                key={e.id}
                                d={d}
                                className={`sk-canvas-edge is-${e.flow} ${dimmed ? 'is-dimmed' : ''}`}
                                markerEnd={`url(#sk-arrow-${e.flow})`}
                              />
                            );
                          })}
                      </svg>

                      {canvasGraph.nodes.map((node) => {
                        const isSelected = selectedCanvasNode?.id === node.id;
                        const isConnected =
                          !selectedCanvasNode ||
                          selectedCanvasNode.id === node.id ||
                          canvasGraph.edges.some(
                            (e) =>
                              (e.from === selectedCanvasNode.id && e.to === node.id) ||
                              (e.to === selectedCanvasNode.id && e.from === node.id),
                          );
                        const dimmed = canvasFocusRelated && !isConnected;
                        return (
                          <button
                            key={node.id}
                            type="button"
                            className={`sk-canvas-node is-${node.tone} ${isSelected ? 'is-selected' : ''} ${
                              dimmed ? 'is-dimmed' : ''
                            }`}
                            style={{
                              left: node.x,
                              top: node.y,
                              width: node.w,
                              height: node.h,
                            }}
                            onClick={() => setCanvasSelectedId(node.id)}
                          >
                            <div className="sk-canvas-node-top">
                              <span className="sk-canvas-node-code">{node.code}</span>
                              <span className={`sk-pill is-${node.tone}`}>{node.statusLabel}</span>
                            </div>
                            <strong className="sk-canvas-node-title">{node.title}</strong>
                            <span className="sk-canvas-node-sub">{node.subtitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Right: Live Node Inspector & Direct Spec/Plan Quick Actions */}
              <aside className="sk-card sk-canvas-inspector">
                {selectedCanvasNode ? (
                  <div className="sk-inspector-stack">
                    <div className="sk-card-head">
                      <div>
                        <span className={`sk-pill is-${selectedCanvasNode.tone}`}>
                          {selectedCanvasNode.code} · {selectedCanvasNode.statusLabel}
                        </span>
                        <h3 style={{ marginTop: 8 }}>{selectedCanvasNode.detail.heading}</h3>
                        {selectedCanvasNode.detail.meta && <p>{selectedCanvasNode.detail.meta}</p>}
                      </div>
                    </div>

                    <div className="sk-spec-box">
                      <strong>核心内容与产物契约</strong>
                      <p>{selectedCanvasNode.detail.summary}</p>
                    </div>

                    {selectedCanvasNode.detail.scope && (
                      <div className="sk-spec-box">
                        <strong>模块边界与实现范围 (Scope)</strong>
                        <p>{selectedCanvasNode.detail.scope}</p>
                      </div>
                    )}

                    {selectedCanvasNode.detail.acceptance && (
                      <div className="sk-spec-box">
                        <strong>验收断言与回滚边界 (Acceptance)</strong>
                        <p>{selectedCanvasNode.detail.acceptance}</p>
                      </div>
                    )}

                    <div className="sk-btn-row" style={{ paddingTop: 8 }}>
                      {selectedCanvasNode.detail.rawCluster && (
                        <button
                          type="button"
                          className="sk-btn is-small is-primary"
                          disabled={writeDisabled}
                          onClick={() => {
                            setSelectedCluster(selectedCanvasNode.detail.rawCluster!);
                            setEditingRequirement(
                              requirements.find(
                                (r) => r.clusterId === selectedCanvasNode.detail.rawCluster!.id,
                              ) || null,
                            );
                            setModal('requirement-editor');
                          }}
                        >
                          <FileCheck2 size={14} /> 提炼 / 编辑此簇的 Spec
                        </button>
                      )}

                      {selectedCanvasNode.detail.rawReq && (
                        <>
                          <button
                            type="button"
                            className="sk-btn is-small"
                            disabled={writeDisabled}
                            onClick={() => {
                              const req = selectedCanvasNode.detail.rawReq!;
                              const cluster =
                                clusters.find((c) => c.id === req.clusterId) || clusters[0];
                              if (cluster) {
                                setSelectedCluster(cluster);
                                setEditingRequirement(req);
                                setModal('requirement-editor');
                              }
                            }}
                          >
                            编辑 Spec
                          </button>
                          <button
                            type="button"
                            className="sk-btn is-small is-primary"
                            disabled={writeDisabled}
                            onClick={() => {
                              const req = selectedCanvasNode.detail.rawReq!;
                              setTargetRequirementForPlan(req);
                              setEditingPlan(plans.find((p) => p.requirementId === req.id) || null);
                              setModal('plan-editor');
                            }}
                          >
                            <GitBranch size={14} /> 编写 / 更新技术方案
                          </button>
                        </>
                      )}

                      {selectedCanvasNode.detail.rawPlan && (
                        <button
                          type="button"
                          className="sk-btn is-small is-primary"
                          disabled={writeDisabled}
                          onClick={() => {
                            const p = selectedCanvasNode.detail.rawPlan!;
                            const req =
                              requirements.find((r) => r.id === p.requirementId) || requirements[0];
                            setTargetRequirementForPlan(req || null);
                            setEditingPlan(p);
                            setModal('plan-editor');
                          }}
                        >
                          修订此技术方案
                        </button>
                      )}

                      <button
                        type="button"
                        className="sk-btn is-small"
                        onClick={() => setActiveStage('delivery')}
                      >
                        <FileCode2 size={14} /> 查看 SpecKit Markdown 三件套 →
                      </button>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          )}

          {/* STAGE 5: DELIVERY, VERIFICATION & SPECKIT MARKDOWN EXPORT */}
          {activeStage === 'delivery' && (
            <div className="sk-bento-two">
              {/* Left: Live SpecKit Artifact Generator (spec.md / plan.md / tasks.md) */}
              <section className="sk-card">
                <div className="sk-card-head">
                  <div>
                    <h3>SpecKit 标准工程文档实时预览与导出</h3>
                    <p>自动将当前产品的痛点证据、需求规格与技术方案编译为标准 SpecKit 三件套</p>
                  </div>
                  <div className="sk-btn-row">
                    <button
                      className="sk-btn is-small"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(activePreviewText);
                          setToast({ text: `已复制 ${specPreviewTab}.md 到剪贴板` });
                        } catch {
                          setToast({ text: '请手动全选复制', error: true });
                        }
                      }}
                    >
                      <ClipboardCopy size={14} /> 复制当前 Markdown
                    </button>
                    <button
                      className="sk-btn is-small is-primary"
                      onClick={() =>
                        downloadFile(
                          `${product.name}-${specPreviewTab}.md`,
                          activePreviewText,
                        )
                      }
                    >
                      <Download size={14} /> 下载 {specPreviewTab}.md
                    </button>
                  </div>
                </div>

                <div className="sk-subtabs">
                  <button
                    className={specPreviewTab === 'spec' ? 'is-active' : ''}
                    onClick={() => setSpecPreviewTab('spec')}
                  >
                    <FileText size={15} /> spec.md (需求规格)
                  </button>
                  <button
                    className={specPreviewTab === 'plan' ? 'is-active' : ''}
                    onClick={() => setSpecPreviewTab('plan')}
                  >
                    <FileCode2 size={15} /> plan.md (技术方案)
                  </button>
                  <button
                    className={specPreviewTab === 'tasks' ? 'is-active' : ''}
                    onClick={() => setSpecPreviewTab('tasks')}
                  >
                    <FileCheck2 size={15} /> tasks.md (任务清单)
                  </button>
                </div>

                <pre className="sk-markdown-preview">{activePreviewText}</pre>
              </section>

              {/* Right: Verification Receipts & Outcomes */}
              <aside className="sk-card">
                <div className="sk-card-head">
                  <div>
                    <h3>交付验收与效果回看</h3>
                    <p>记录 CI 评测回执、上线提交记录与发布前后的核心指标对比</p>
                  </div>
                  {plans.length > 0 && (
                    <button
                      className="sk-btn is-small is-primary"
                      disabled={writeDisabled}
                      onClick={() => setModal('record-outcome')}
                    >
                      <Plus size={14} /> 记录效果指标
                    </button>
                  )}
                </div>

                <div className="sk-delivery-stats">
                  <div className="sk-stat-box">
                    <span>CI / 评测回执</span>
                    <strong>{evaluations.length}</strong>
                  </div>
                  <div className="sk-stat-box">
                    <span>发布登记</span>
                    <strong>{releases.length}</strong>
                  </div>
                  <div className="sk-stat-box">
                    <span>上线效果对照</span>
                    <strong>{outcomes.length}</strong>
                  </div>
                </div>

                {outcomes.length === 0 ? (
                  <div className="sk-empty-box">
                    <BarChart3 size={24} />
                    <h4>暂无上线效果观察记录</h4>
                    <p>方案发布后，可在此登记变更前后的核心指标窗口与样本量对照。</p>
                  </div>
                ) : (
                  <div className="sk-outcome-list">
                    {outcomes.map((o) => {
                      const diff = o.after - o.before;
                      return (
                        <article key={o.id} className="sk-outcome-card">
                          <div className="sk-outcome-top">
                            <strong>{o.metric}</strong>
                            <span className={`sk-pill ${diff >= 0 ? 'is-green' : 'is-amber'}`}>
                              {diff >= 0 ? `+${diff}` : diff} {o.unit}
                            </span>
                          </div>
                          <p>
                            变更前：{o.before} {o.unit} ({o.beforeWindow}) → 变更后：{o.after} {o.unit} ({o.afterWindow})
                          </p>
                          <small>样本量 N={o.sampleSize} · 来源：{o.source}</small>
                        </article>
                      );
                    })}
                  </div>
                )}
              </aside>
            </div>
          )}
        </main>
      )}

      {/* Toast */}
      {toast && (
        <div className={`sk-toast ${toast.error ? 'is-error' : ''}`} role="status">
          <CheckCircle2 size={18} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* MODAL: Create / Edit Product */}
      {modal === 'product' && (
        <div className="sk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="sk-modal" role="dialog" aria-modal="true" aria-label="产品配置">
            <header className="sk-modal-head">
              <h2>{product ? '新建或更新产品工作区' : '创建产品工作区'}</h2>
              <button onClick={() => setModal('')} aria-label="关闭">
                <X size={20} />
              </button>
            </header>
            <form
              className="sk-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const mode = String(f.get('actionMode') || 'create');
                const payload = {
                  name: String(f.get('name') || ''),
                  description: String(f.get('description') || ''),
                  users: String(f.get('users') || ''),
                  goal: String(f.get('goal') || ''),
                  metric: String(f.get('metric') || ''),
                  repository: String(f.get('repository') || ''),
                };
                const r = await mutate(
                  mode === 'update' && product
                    ? { type: 'product.update', productId: product.id, ...payload }
                    : { type: 'product.create', ...payload },
                );
                if (r) {
                  if (mode === 'create') {
                    setProductId(r.state.products.at(-1)?.id ?? '');
                  }
                  setModal('');
                }
              }}
            >
              {product && (
                <label className="sk-field">
                  <span>操作方式</span>
                  <select name="actionMode" defaultValue="update">
                    <option value="update">更新当前产品（{product.name}）</option>
                    <option value="create">创建一个全新的产品</option>
                  </select>
                </label>
              )}
              <label className="sk-field">
                <span>产品名称</span>
                <input
                  name="name"
                  required
                  defaultValue={product?.name || ''}
                  placeholder="如：丁康个人 AI 研发工作台"
                />
              </label>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>目标用户</span>
                  <input
                    name="users"
                    defaultValue={product?.users || ''}
                    placeholder="如：AI 工程师与独立开发者"
                  />
                </label>
                <label className="sk-field">
                  <span>核心观测指标</span>
                  <input
                    name="metric"
                    defaultValue={product?.metric || ''}
                    placeholder="如：首次任务完成率 (%)"
                  />
                </label>
              </div>
              <label className="sk-field">
                <span>当前产品目标</span>
                <input
                  name="goal"
                  defaultValue={product?.goal || ''}
                  placeholder="本阶段最核心的演进目标是什么？"
                />
              </label>
              <label className="sk-field">
                <span>Git 仓库地址（可选）</span>
                <input
                  name="repository"
                  defaultValue={product?.repository || ''}
                  placeholder="https://github.com/Adversit/dingkang"
                />
              </label>
              <div className="sk-modal-actions">
                <button type="button" className="sk-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="sk-btn is-primary" disabled={busy}>
                  <Save size={16} /> 保存产品
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: Add Single Signal */}
      {modal === 'add-signal' && (
        <div className="sk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="sk-modal" role="dialog" aria-modal="true" aria-label="录入痛点反馈">
            <header className="sk-modal-head">
              <h2>录入用户痛点或产品想法</h2>
              <button onClick={() => setModal('')} aria-label="关闭">
                <X size={20} />
              </button>
            </header>
            <form
              className="sk-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const r = await mutate({
                  type: 'signals.import',
                  productId: pid,
                  items: [
                    {
                      text: String(f.get('text') || ''),
                      source: String(f.get('source') || '手动录入'),
                      userKey: String(f.get('userKey') || 'user-01'),
                      redacted: true,
                    },
                  ],
                });
                if (r) setModal('');
              }}
            >
              <label className="sk-field">
                <span>痛点反馈原文（请确保已脱敏个人隐私）</span>
                <textarea
                  name="text"
                  rows={4}
                  required
                  autoFocus
                  placeholder="用户遇到的真实阻碍或需求原话…"
                />
              </label>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>反馈来源</span>
                  <input name="source" defaultValue="用户访谈 / 体验反馈" />
                </label>
                <label className="sk-field">
                  <span>匿名用户标识</span>
                  <input name="userKey" defaultValue="user-01" />
                </label>
              </div>
              <div className="sk-modal-actions">
                <button type="button" className="sk-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="sk-btn is-primary" disabled={busy}>
                  <Plus size={16} /> 保存反馈
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: Batch Import Signals */}
      {modal === 'import-signals' && (
        <div className="sk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="sk-modal" role="dialog" aria-modal="true" aria-label="批量导入反馈">
            <header className="sk-modal-head">
              <h2>批量导入 CSV / JSON 反馈</h2>
              <button onClick={() => setModal('')} aria-label="关闭">
                <X size={20} />
              </button>
            </header>
            <div className="sk-form">
              <div className="sk-btn-row">
                <button
                  type="button"
                  className="sk-btn is-small"
                  onClick={() => downloadFile('SpecKit-feedback-template.csv', CSV_TEMPLATE, 'text/csv')}
                >
                  下载 CSV 模板
                </button>
              </div>
              <label className="sk-field">
                <span>粘贴 CSV 或 JSON 内容</span>
                <textarea
                  rows={7}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={CSV_TEMPLATE}
                />
              </label>
              <div className="sk-modal-actions">
                <button type="button" className="sk-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button
                  type="button"
                  className="sk-btn is-primary"
                  disabled={busy || !importText.trim()}
                  onClick={async () => {
                    try {
                      const items = parseSignals(importText);
                      const r = await mutate({
                        type: 'signals.import',
                        productId: pid,
                        items,
                      });
                      if (r) setModal('');
                    } catch (err) {
                      setToast({
                        text: err instanceof Error ? err.message : '解析失败',
                        error: true,
                      });
                    }
                  }}
                >
                  导入反馈
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: Create Cluster */}
      {modal === 'create-cluster' && (
        <div className="sk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="sk-modal" role="dialog" aria-modal="true" aria-label="创建痛点簇">
            <header className="sk-modal-head">
              <h2>将 {selectedSignals.length} 条反馈归为痛点簇</h2>
              <button onClick={() => setModal('')} aria-label="关闭">
                <X size={20} />
              </button>
            </header>
            <form
              className="sk-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const r = await mutate({
                  type: 'cluster.create',
                  productId: pid,
                  title: String(f.get('title') || ''),
                  signalIds: selectedSignals,
                });
                if (r) {
                  setSelectedSignals([]);
                  setModal('');
                }
              }}
            >
              <label className="sk-field">
                <span>痛点簇一句话主题</span>
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="如：多工作台入口分散，缺少统一的 SpecKit 研发主线"
                />
              </label>
              <div className="sk-modal-actions">
                <button type="button" className="sk-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="sk-btn is-primary" disabled={busy}>
                  创建痛点簇
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: Requirement / Spec Editor */}
      {modal === 'requirement-editor' && selectedCluster && (
        <div className="sk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="sk-modal is-wide" role="dialog" aria-modal="true" aria-label="编写需求规格 Spec">
            <header className="sk-modal-head">
              <div>
                <h2>{editingRequirement ? '编辑需求规格 (Spec)' : '从痛点簇提炼需求规格 (/speckit.specify)'}</h2>
                <p>关联痛点簇：{selectedCluster.title}</p>
              </div>
              <button onClick={() => setModal('')} aria-label="关闭">
                <X size={20} />
              </button>
            </header>
            <form
              className="sk-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const links: EvidenceLink[] = selectedCluster.signalIds.map((signalId) => ({
                  signalId,
                  relation: 'supports',
                  note: '核心痛点原话支撑',
                }));
                const basePayload = {
                  productId: pid,
                  title: String(f.get('title') || ''),
                  story: String(f.get('story') || ''),
                  scope: String(f.get('scope') || ''),
                  acceptance: String(f.get('acceptance') || ''),
                  critic: String(f.get('critic') || '需进一步在上线后观测真实转化率与留存表现。'),
                  impact: Number(f.get('impact') || 4),
                  confidence: Number(f.get('confidence') || 4),
                  effort: Number(f.get('effort') || 2),
                  links,
                };
                const r = await mutate(
                  editingRequirement
                    ? {
                        type: 'requirement.update',
                        requirementId: editingRequirement.id,
                        ...basePayload,
                      }
                    : {
                        type: 'requirement.create',
                        clusterId: selectedCluster.id,
                        ...basePayload,
                      },
                );
                if (r && !r.result?.error) {
                  setModal('');
                  setActiveStage('specify');
                }
              }}
            >
              <label className="sk-field">
                <span>Spec 需求标题</span>
                <input
                  name="title"
                  required
                  defaultValue={editingRequirement?.title || selectedCluster.title}
                />
              </label>
              <label className="sk-field">
                <span>用户故事与问题背景 (User Story)</span>
                <textarea
                  name="story"
                  rows={3}
                  required
                  defaultValue={
                    editingRequirement?.story ||
                    `作为目标用户，当我面对「${selectedCluster.title}」时，我希望有一套直观的四步流水线，以便快速完成从痛点到交付的闭环。`
                  }
                />
              </label>
              <label className="sk-field">
                <span>功能范围与边界 (Scope)</span>
                <textarea
                  name="scope"
                  rows={3}
                  required
                  defaultValue={
                    editingRequirement?.scope ||
                    '提供痛点归簇、需求规格定义、技术方案拆解与 SpecKit Markdown 三件套导出；不破坏底层已有 API 存储契约。'
                  }
                />
              </label>
              <label className="sk-field">
                <span>可验证的验收标准 (Acceptance Criteria)</span>
                <textarea
                  name="acceptance"
                  rows={3}
                  required
                  defaultValue={
                    editingRequirement?.acceptance ||
                    '1. 支持从反馈簇一键生成 Spec；2. 支持批准并生成 Plan 与 Tasks；3. 支持一键导出标准 spec.md / plan.md / tasks.md。'
                  }
                />
              </label>
              <div className="sk-form-three">
                <label className="sk-field">
                  <span>影响度 (Impact 1-5)</span>
                  <input
                    name="impact"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={editingRequirement?.score.impact || 4}
                  />
                </label>
                <label className="sk-field">
                  <span>把握度 (Confidence 1-5)</span>
                  <input
                    name="confidence"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={editingRequirement?.score.confidence || 4}
                  />
                </label>
                <label className="sk-field">
                  <span>工作量 (Effort 1-5)</span>
                  <input
                    name="effort"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={editingRequirement?.score.effort || 2}
                  />
                </label>
              </div>
              <label className="sk-field">
                <span>风险与反驳审视 (Critic &amp; Missing Info)</span>
                <textarea
                  name="critic"
                  rows={2}
                  required
                  defaultValue={
                    editingRequirement?.critic ||
                    '需注意保持存量数据迁移兼容，并在上线后观察真实用户完成率。'
                  }
                />
              </label>
              <div className="sk-modal-actions">
                <button type="button" className="sk-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="sk-btn is-primary" disabled={busy}>
                  <Save size={16} /> 保存 Spec 规格
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: Plan Editor */}
      {modal === 'plan-editor' && targetRequirementForPlan && (
        <div className="sk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="sk-modal is-wide" role="dialog" aria-modal="true" aria-label="编写技术方案 Plan">
            <header className="sk-modal-head">
              <div>
                <h2>{editingPlan ? '修订技术方案 (`/speckit.plan`)' : '创建技术方案 (`/speckit.plan`)'}</h2>
                <p>关联 Spec：{targetRequirementForPlan.title}</p>
              </div>
              <button onClick={() => setModal('')} aria-label="关闭">
                <X size={20} />
              </button>
            </header>
            <form
              className="sk-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const payload = {
                  productId: pid,
                  title: String(f.get('title') || ''),
                  goal: String(f.get('goal') || ''),
                  scope: String(f.get('scope') || ''),
                  nonGoals: String(f.get('nonGoals') || ''),
                  acceptance: String(f.get('acceptance') || ''),
                  risks: String(f.get('risks') || ''),
                  rollback: String(f.get('rollback') || ''),
                  baseCommit: String(f.get('baseCommit') || ''),
                  budget: String(f.get('budget') || ''),
                };
                const r = await mutate(
                  editingPlan
                    ? { type: 'plan.update', planId: editingPlan.id, ...payload }
                    : {
                        type: 'plan.create',
                        requirementId: targetRequirementForPlan.id,
                        ...payload,
                      },
                );
                if (r && !r.result?.error) {
                  setModal('');
                  setActiveStage('plan-tasks');
                }
              }}
            >
              <label className="sk-field">
                <span>技术方案名称</span>
                <input
                  name="title"
                  required
                  defaultValue={editingPlan?.title || `${targetRequirementForPlan.title} 技术实施方案`}
                />
              </label>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>基线 Commit (40 位 SHA)</span>
                  <input
                    name="baseCommit"
                    required
                    defaultValue={
                      editingPlan?.baseCommit || '4c6ca52698058edce3f786fd59f88e8fdb8770a5'
                    }
                  />
                </label>
                <label className="sk-field">
                  <span>执行预算</span>
                  <input
                    name="budget"
                    required
                    defaultValue={editingPlan?.budget || '2 小时 / 全量自动化回归测试'}
                  />
                </label>
              </div>
              <label className="sk-field">
                <span>变更目标 (Goal)</span>
                <textarea
                  name="goal"
                  rows={2}
                  required
                  defaultValue={editingPlan?.goal || targetRequirementForPlan.story}
                />
              </label>
              <label className="sk-field">
                <span>修改范围（每条分号或换行将自动拆解为 `/speckit.tasks` 实现项）</span>
                <textarea
                  name="scope"
                  rows={3}
                  required
                  defaultValue={editingPlan?.scope || targetRequirementForPlan.scope}
                />
              </label>
              <label className="sk-field">
                <span>明确不做 (Non-Goals)</span>
                <textarea
                  name="nonGoals"
                  rows={2}
                  required
                  defaultValue={editingPlan?.nonGoals || '不更改底层数据库表结构与历史备份恢复协议。'}
                />
              </label>
              <label className="sk-field">
                <span>验收标准（每条将自动拆解为 `/speckit.tasks` 验证项）</span>
                <textarea
                  name="acceptance"
                  rows={3}
                  required
                  defaultValue={editingPlan?.acceptance || targetRequirementForPlan.acceptance}
                />
              </label>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>风险与防护措施</span>
                  <textarea
                    name="risks"
                    rows={2}
                    required
                    defaultValue={editingPlan?.risks || '通过 CAS 版本号防止并发覆盖，通过 tsc 与单元测试保障类型安全。'}
                  />
                </label>
                <label className="sk-field">
                  <span>回滚策略 (Rollback)</span>
                  <textarea
                    name="rollback"
                    rows={2}
                    required
                    defaultValue={editingPlan?.rollback || '若构建或验收异常，直接按基线 Commit 一键回滚前端视图层。'}
                  />
                </label>
              </div>
              <div className="sk-modal-actions">
                <button type="button" className="sk-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="sk-btn is-primary" disabled={busy}>
                  <Save size={16} /> 保存技术方案
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL: Record Outcome */}
      {modal === 'record-outcome' && plans.length > 0 && (
        <div className="sk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal('')}>
          <section className="sk-modal" role="dialog" aria-modal="true" aria-label="记录效果观察">
            <header className="sk-modal-head">
              <h2>记录发布效果对照</h2>
              <button onClick={() => setModal('')} aria-label="关闭">
                <X size={20} />
              </button>
            </header>
            <form
              className="sk-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const r = await mutate({
                  type: 'outcome.record',
                  productId: pid,
                  planId: String(f.get('planId') || plans[0].id),
                  metric: String(f.get('metric') || product.metric || '任务完成率'),
                  unit: String(f.get('unit') || '%'),
                  before: Number(f.get('before') || 0),
                  after: Number(f.get('after') || 0),
                  beforeWindow: String(f.get('beforeWindow') || '2026-11-01 ~ 2026-11-07'),
                  afterWindow: String(f.get('afterWindow') || '2026-11-08 ~ 2026-11-14'),
                  sampleSize: Number(f.get('sampleSize') || 100),
                  source: String(f.get('source') || '线上核心埋点看板'),
                  confounders: String(f.get('confounders') || '同期无其他重大改版干扰'),
                });
                if (r && !r.result?.error) setModal('');
              }}
            >
              <label className="sk-field">
                <span>关联技术方案</span>
                <select name="planId" defaultValue={plans[0].id}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (v{p.version})
                    </option>
                  ))}
                </select>
              </label>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>观测指标名称</span>
                  <input name="metric" required defaultValue={product.metric || '首次任务完成率'} />
                </label>
                <label className="sk-field">
                  <span>单位</span>
                  <input name="unit" required defaultValue="%" />
                </label>
              </div>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>变更前数值</span>
                  <input name="before" type="number" step="any" required defaultValue={62} />
                </label>
                <label className="sk-field">
                  <span>变更后数值</span>
                  <input name="after" type="number" step="any" required defaultValue={84} />
                </label>
              </div>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>变更前时间窗口</span>
                  <input name="beforeWindow" required defaultValue="2026-11-01 至 2026-11-07" />
                </label>
                <label className="sk-field">
                  <span>变更后时间窗口</span>
                  <input name="afterWindow" required defaultValue="2026-11-08 至 2026-11-14" />
                </label>
              </div>
              <div className="sk-form-two">
                <label className="sk-field">
                  <span>样本量 (N)</span>
                  <input name="sampleSize" type="number" min={1} required defaultValue={120} />
                </label>
                <label className="sk-field">
                  <span>数据来源</span>
                  <input name="source" required defaultValue="生产环境验收看板" />
                </label>
              </div>
              <label className="sk-field">
                <span>潜在干扰因素说明</span>
                <textarea name="confounders" rows={2} required defaultValue="同期无渠道投放波动。" />
              </label>
              <div className="sk-modal-actions">
                <button type="button" className="sk-btn" onClick={() => setModal('')}>
                  取消
                </button>
                <button type="submit" className="sk-btn is-primary" disabled={busy}>
                  <Save size={16} /> 保存效果记录
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
