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

## Phase 4: Verification
- [x] T012 Pass `pnpm exec tsc --noEmit --pretty false`, all 7 Node unit test suites (82 tests), and `pnpm build:vercel`
- [x] T013 Initialize local D1 migrations (51 tables) and verify D1-backed calendar persistence, `409` conflict, `/api/hub/health`, and `/api/games/jlu-campus/health` in live browser environment
