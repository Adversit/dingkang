# Feature Specification: 个人工作台前端改造与全站统一 (`001-frontend-workspace-v1`)

**Feature Branch**: `codex/frontend-workspace-v1`  
**Status**: Completed & Verified (Local D1 + 82 Unit Tests + E2E Browser + Vercel Build)  
**Related Docs**: [docs/spec-plan-task/README.md](../../docs/spec-plan-task/README.md)

## User Scenarios & Testing

### User Story 1 — 首页个人工作台与日历 (`hub-workspace-calendar`)
用户打开工作台首页即可直接查看当日日期（`Asia/Shanghai`）、未完成计划、近期工作记录和周一至周日月历。点击日期格仅切换选中日期；新建/编辑工作记录、新建/编辑/跨月改期/完成计划通过独立操作触发，并在四套主题切换时保留选中日期与编辑草稿。

- **Acceptance**:
  1. 新账号打开首页展示今日日期与可操作空状态。
  2. 新增/编辑记录及跨月改期计划保存至 `hub-workspace-calendar`，刷新仍存在。
  3. 遇到 `409` 版本冲突时保留未保存草稿，支持覆盖或拉取云端最新内容。
  4. `lib/hub/backup-preview.ts` 与备份弹窗可识别「工作台日历」。

### User Story 2 — 游戏大厅与统一 `/api/games` 接口
首页一级目录将 8 款游戏聚合为「游戏大厅」入口，大厅内保留各游戏原生 ID 启动、继续游玩、收藏与 `flushHubModule` 离开保护。后端提供 `GET /api/games`、`GET/PUT /api/games/:gameId/state`（与 `/api/hub/state/:moduleId` 共享同一份 `hub_states`）以及 `/api/games/jlu-campus/*`（共享 `handleCampusRequest`）。

### User Story 3 — 四套主题与 17 个子工作台视觉/动效统一
四套主题（`classic`、`night-harbor`、`kinetic`、`cozy`）均整合工作台日历与游戏大厅入口；17 个子工作台（6 个 `/m/*` Next.js 模块 + 11 个静态 HTML 入口）统一接入极简、细腻的微动效与焦点环增强层（`public/apps/hub-workbench-unified.css`），同时严格保留各自原生业务交互与 `prefers-reduced-motion` 降级。

### User Story 4 — V3 激进重构：Next.js 极简空间 Bento 矩阵与核心工作台全面重做
1. **目录归档与合并收敛**：
   - 将 AI 面试作品 `同住` (`roommate-housekeeper`) 标记为归档（`archived: true`），移出主界面活跃卡片矩阵，收拢到底部可折叠「归档与已合并历史项目」抽屉。
   - 将 `AI PM Studio` (`aipm-studio-dk`)、`AI 研发协作` (`ai-dev-collaboration-workbench`) 与 `EvoPM` (`evopm-workbench`) 三合一合并为 **`SpecKit 研发工作台`**，以 `痛点与反馈池 → /speckit.specify → /speckit.plan & tasks → 架构与协作画布 (Architecture Canvas) → 交付验收与 SpecKit 导出` 为唯一主线，完整保留原 AI 研发协作工作台的可视化节点连线画布（支持按执行流、数据流、依赖关系过滤与节点检查器联动），前两个历史入口归入归档抽屉并提供顶部跳转横幅。
   - 主界面收敛为 **6 个核心工作台 + 1 个「游戏大厅」聚合入口（共 7 张 Bento 核心卡片）+ 个人工作台日历**。
2. **核心工作台彻底重构（解决原 GPT 生成界面晦涩难用问题）**：
   - **知流 (`zhiliu-radar`)**：重构为 3 页签极简 Bento 情报工作台（`情报流` / `每日简报` / `信源管理`），支持一键抓取、一键导入 AIHOT 信源、一键 AI 摘要与双栏 Markdown 简报编辑。
   - **知证 (`zhizheng-research`)**：重构为 3 步学术精读流水线（`01 文献库与 Crossref 检索` / `02 左右分栏 PDF 精读与证据笔记` / `03 跨论文对比综述与 AI 问答`）。
   - **Agent 架构实验室 (`agent-architecture-journey`)**：重构为 5 大核心架构模块（`Spec & Context`、`Memory & Compact`、`Plan & Tasks`、`Tool Use & MCP`、`Eval & Reflection`）+ 右侧 **Agent 运行推演沙盘 (Live Trace)** + 生产级代码蓝图复制与云端学习笔记。
   - **AI 小说工坊 (`novel-studio`)**：重构为无干扰 3 栏沉浸式小说创作台（左侧作品与章节目录、中间支持「沉浸正文编辑器」与「6 节点执行流程画布（构思 → 规划 → 起草 → 设定锚定 → 一致性审阅 → 定稿入库）」双视图一键切换、右侧 AI 续写助手 / 世界观设定集 / 一致性审阅）。
   - **四套主题主界面**：摒弃旧版杂乱欢迎横幅，统一采用 Next.js 极简空间 Bento 架构（`.hub-spatial-hero` + 7 宫格核心矩阵 + 工作台日历 + 底部归档抽屉）。
