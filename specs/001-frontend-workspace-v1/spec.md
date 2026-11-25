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
