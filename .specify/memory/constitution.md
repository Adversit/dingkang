# 丁康的工作空间 (Dingkang Workspace) Constitution

## Core Principles

### I. One Implementation, Four Presentations
- `lib/hub/catalog.ts` is the single authoritative registry for all 17 modules.
- `lib/hub/theme.ts` defines the four themes (`classic`, `night-harbor`, `kinetic`, `cozy`) and `HubSceneProps`.
- `app/page.tsx` owns account session, navigation, preferences, calendar orchestration, and backup import/export.
- Scene components receive callbacks only; never introduce theme-specific business APIs, save formats, or duplicate modules.
- Opening or switching themes MUST preserve the active module, selected calendar date, and in-progress drafts; `flushHubModule()` MUST run before leaving a module.

### II. Authoritative Server Identity & Atomic CAS Persistence
- Server identity (`oai-authenticated-user-id` / `/auth/workspace`) is authoritative; `X-Hub-User-Id` is only for client-side account-switch detection.
- All unified-state writes (`hub_states`, `/api/hub/state/*`, `/api/games/*/state`) MUST enforce `Origin` checks, key/size bounds, and `expectedRevision` CAS with `409` conflict recovery.
- Native module business tables and storage boundaries (`zhiliu-radar`, `zhizheng-research`, `evopm-workbench`, `ai-dev-collaboration-workbench`, `novel-studio`, `wandeng-evening`, `roommate-housekeeper`, `jlu-campus`) MUST remain isolated from `hub_states`.

### III. Readability, Accessibility & Reduced Motion
- Chinese body text MUST be at least `16px` and supporting text at least `14px`.
- Keep hub themes and application screens free of decorative small copy (no slogan subtitles, duplicate category eyebrows, English kickers, or routine card descriptions).
- Respect `prefers-reduced-motion: reduce`, pause/stop background rendering when `document.hidden` or WebGL is unavailable, and dispose Three.js renderers/geometries/materials/textures on unmount.

### IV. Dual-Runtime Compatibility & Packed Assets
- Preserve compatibility with both Vinext (`pnpm dev` / `pnpm build`) and Vercel Next.js 16 (`pnpm build:vercel`).
- Large static resources tracked in `asset-pack/manifest.json` MUST be restored via `pnpm assets:restore` before editing and repacked via `pnpm assets:pack` after intentional changes.

### V. Verification & Preview Gate
- Every change MUST pass `pnpm exec tsc --noEmit --pretty false`, Node unit tests (`--experimental-strip-types --test`), and `pnpm build:vercel`.
- UI changes MUST be verified at desktop (`1440px`) and mobile (`375px` / `390px`) viewports without horizontal overflow or overlapping panels.

## Governance

- This constitution supersedes ad-hoc conventions and aligns with `AGENTS.md`.
- Feature specifications, plans, and task trackers live under `specs/` (Spec Kit) and module-level handoff docs under `docs/spec-plan-task/`.

**Version**: 1.0.0 | **Ratified**: 2026-11-25 | **Last Amended**: 2026-11-25
