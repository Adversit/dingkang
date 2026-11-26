# Tasks: 个人工作台前端改造与全站统一 (`001-frontend-workspace-v1`)

## Phase 1: Workspace Calendar (`hub-workspace-calendar`)
- [x] T001 Register `hub-workspace-calendar` in `lib/hub/server.ts` and `lib/hub/backup-preview.ts`
- [x] T002 Implement pure calendar logic in `lib/hub/workspace-calendar.ts` and unit tests in `tests/workspace-calendar.test.mjs`
- [x] T003 Implement `lib/hub/use-workspace-calendar.ts` with `409` conflict recovery and account isolation
- [x] T004 Build `components/WorkspaceCalendar.tsx` and wire into `app/page.tsx`

## Phase 2: Game Hall & Unified `/api/games`
- [x] T005 Implement `GET /api/games`, `GET/PUT /api/games/[gameId]/state`, and `/api/games/jlu-campus/[...path]`
- [x] T006 Add `tests/games-api.test.mjs` verifying shared `hub_states` and campus delegation
- [x] T007 Build `components/GameHall.tsx` and aggregate 8 games in `app/page.tsx`

## Phase 3: Four Themes & 17 Sub-Workbenches Unification
- [x] T008 Upgrade 4-theme surfaces & Cozy quick entrances (`app/globals.css`, `components/CozyBaseScene.tsx`)
- [x] T009 Create `public/apps/hub-workbench-unified.css` and link across `app/layout.tsx` and all 13 static HTML entrypoints
- [x] T010 Create `docs/spec-plan-task/` handoff documentation and initialize Spec Kit (`specs/001-frontend-workspace-v1/`)
- [x] T011 Upgrade per-module stylesheets & HUD motion across all 17 sub-workbenches (`modules/*/app/*.css`, `public/apps/*/*.css`, `public/assets/yunque-sanguo/game.css`, `roommate-housekeeper/index.html`)

## Phase 4: Verification & V2 Spatial Bento Overhaul
- [x] T012 Pass `pnpm exec tsc --noEmit --pretty false`, all 7 Node unit test suites (82 tests), and `pnpm build:vercel`
- [x] T013 Initialize local D1 migrations (51 tables) and verify D1-backed calendar persistence, `409` conflict, `/api/hub/health`, and `/api/games/jlu-campus/health` in live browser environment
- [x] T014 V2 Spatial Bento Overhaul: Command Deck (mini matrix badge, telemetry orbs, live `HH:MM:SS` clock), 3-column Bento Calendar Grid with Current Focus card & 7-segment progress bar, Game Hall Spotlight Stage & filter tabs, Tactile Bento App Cards with per-app color accents, and elevated 17-app visual system

## Phase 5: V3 Radical Consolidation & Core Workbench Rebuilds
- [x] T015 Archive `roommate-housekeeper`, `aipm-studio-dk`, and `ai-dev-collaboration-workbench` in `lib/hub/catalog.ts` and render collapsible archive drawer on homepage
- [x] T016 Redesign Homepage across all 4 themes with `.hub-spatial-hero` Next.js Minimalist Spatial Bento architecture (6 core workbenches + 1 Game Hall portal card + WorkspaceCalendar)
- [x] T017 Rebuild `知流` (`modules/zhiliu-radar/app/home.tsx` & `globals.css`) into a 3-tab minimalist Bento workbench (`情报流`, `每日简报`, `信源管理`)
- [x] T018 Rebuild `知证` (`modules/zhizheng-research/app/workbench.tsx` & `globals.css`) into a 3-step research workbench (`文献库与检索`, `精读与证据笔记`, `跨论文综述与 AI 问答`)
- [x] T019 Rebuild `Agent 架构实验室` (`public/apps/agent-architecture-journey/index.html`) into a 5-stage interactive architecture lab with live JSON execution trace sandbox
- [x] T020 Merge AI PM + EvoPM + AI Dev Collaboration into `SpecKit 研发工作台` (`modules/evopm-workbench/app/page.tsx` & `styles.css`) with embedded 5-lane SVG Architecture & Collaboration Canvas (`Stage 04 架构与协作画布`) and 1-click `spec.md` / `plan.md` / `tasks.md` export
- [x] T021 Rebuild `AI 小说工坊` (`public/apps/novel-studio/canvas.js` & `canvas.css`) into a distraction-free 3-column novel writing & worldbuilding workbench with switchable `沉浸正文` and `6 节点执行流程画布` views
