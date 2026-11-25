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
