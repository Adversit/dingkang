# Implementation Plan: 个人工作台前端改造与全站统一 (`001-frontend-workspace-v1`)

## Technical Context
- **Framework**: Next.js 16.3.4 + React 19.2.6 + Vinext (Vite 8) + Three.js 0.186.0
- **Storage**: Cloudflare D1 (`hub_states`, `hub_state_versions`, `hub_files`, `campus_*`) + R2
- **Testing**: `tsc --noEmit`, `node --experimental-strip-types --test`, `pnpm build:vercel`

## Architecture & Key Changes

1. **Workspace Calendar (`hub-workspace-calendar`)**
   - `lib/hub/server.ts` & `lib/hub/backup-preview.ts`: 注册内部 ID 并支持备份预览。
   - `lib/hub/workspace-calendar.ts`: 纯函数实现自然日、42 格月历、CRUD、跨月改期与分月序列化。
   - `lib/hub/use-workspace-calendar.ts`: 状态管理、队列提交、`409` 冲突保留草稿与账号隔离。
   - `components/WorkspaceCalendar.tsx` + `.module.css`: 四主题共用组件。

2. **Game Hall & Unified `/api/games`**
   - `app/api/games/route.ts`: 基于 `lib/hub/catalog.ts` 输出 8 款游戏公开元数据。
   - `app/api/games/[gameId]/state/route.ts`: 7 款桥接游戏统一 CAS 读写，复用 `hub_states`。
   - `app/api/games/jlu-campus/[...path]/route.ts`: 校园多人 HTTP 别名，共享 `handleCampusRequest`。
   - `lib/hub/games-client.ts`, `components/GameHall.tsx` + `.module.css`: 游戏大厅前端。

3. **Themes & 17 Sub-Workbenches Unification**
   - `app/page.tsx`, `app/globals.css`, `components/CozyBaseScene.tsx`: 四主题整合、暖居直达入口、玻璃态与景深层次。
   - `public/apps/hub-workbench-unified.css` + `app/layout.tsx` + 13 个静态 HTML 入口：全站 17 个子工作台统一样式与微动效层。
   - `docs/spec-plan-task/`: 整体、前端改造与 17 个子工作台独立交接文档。

4. **V3 Radical Overhaul & SpecKit Consolidation**
   - `lib/hub/catalog.ts`: 新增 `archived?: boolean` 与 `archiveNote?: string`；归档 `roommate-housekeeper`、`aipm-studio-dk`、`ai-dev-collaboration-workbench`；将 `evopm-workbench` 升级为 `SpecKit 研发工作台`。
   - `app/page.tsx` & `app/globals.css`: 全新 `.hub-spatial-hero` Next.js 极简 Bento 首页矩阵（6 个活跃工作台 + 1 个跨两列游戏大厅入口）与底部 `.hub-archive-drawer` 归档抽屉。
   - `modules/zhiliu-radar/app/home.tsx` & `globals.css`: 3 页签极简 Bento 情报与简报工作台。
   - `modules/zhizheng-research/app/workbench.tsx` & `globals.css`: 3 步学术文献检索、分栏精读卡/证据摘录与跨论文综述工作台。
   - `public/apps/agent-architecture-journey/index.html`: 5 大核心架构模块 + 实时 JSON 状态流推演沙盘 + 持久化学习笔记。
   - `modules/evopm-workbench/app/page.tsx` & `styles.css`: 统一合并 AI PM、EvoPM 与 AI 研发协作为 4 阶段 SpecKit 流水线，支持实时预览与一键导出 `spec.md`、`plan.md`、`tasks.md`。
   - `public/apps/novel-studio/canvas.js` & `canvas.css`: 3 栏沉浸式小说创作工作台（保留 `HubBeforeLeave`、`HubCancelLeave` 与 `hub:open-menu` / `hub:return` 通信契约）。
