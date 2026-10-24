# Product workspace migration

This migration preserves existing behavior. It does not implement new product features, add model calls, create credentials, or turn the previously empty 造物流程 repository into a separate app.

## Entrypoints

| Module | Page | API | Assets |
| --- | --- | --- | --- |
| EvoPM | `/m/evopm-workbench/` | `/api/m/evopm-workbench/workbench` | `/assets/evopm-workbench/` |
| AI Development Collaboration | `/m/ai-dev-collaboration-workbench/` | `/api/m/ai-dev-collaboration-workbench/*` | `/apps/ai-dev-collaboration-workbench/` |
| 造物流程 | `/m/ai-dev-collaboration-workbench/delivery` | AI Development delivery endpoints | AI Development assets |
| AI PM Studio | `/apps/aipm-studio-dk/index.html` | Shared hub storage bridge | `/apps/aipm-studio-dk/` |

The AI Development HTML is served through a retained Worker adapter. This preserves authenticated server-side `ACCOUNT_BOOTSTRAP` injection and administrative read access checks. Direct static index/delivery/admin HTML links redirect to their authenticated module routes. API requests use the hub's `getChatGPTUser()`; original authentication headers are replaced with this canonical identity before the retained handler executes. Both backends use the same `env.DB` binding.

EvoPM's CSS is scoped to `.evopm-module`, so its original global selectors do not affect neighboring modules.

## Tables and indexes

| Original database | Original table | Unified DB table |
| --- | --- | --- |
| EvoPM | workspaces | evopm_workbench__workspaces |
| EvoPM | action_receipts | evopm_workbench__action_receipts |
| EvoPM | analysis_leases | evopm_workbench__analysis_leases |
| AI Development | workspaces | ai_dev_collaboration_workbench__workspaces |
| AI Development | admin_reads | ai_dev_collaboration_workbench__admin_reads |
| AI Development | delivery_projects | ai_dev_collaboration_workbench__delivery_projects |
| AI Development | delivery_events | ai_dev_collaboration_workbench__delivery_events |
| AI Development | delivery_calls | ai_dev_collaboration_workbench__delivery_calls |

AI Development indexes have the same `ai_dev_collaboration_workbench__` prefix: `admin_reads_created_at`, `delivery_event_operation`, `delivery_event_revision`, `delivery_call_operation`.

Namespaced CREATE TABLE and CREATE INDEX SQL is in:

- `modules/evopm-workbench/migrations/0000_eager_magneto.sql`
- `modules/evopm-workbench/migrations/0001_clever_lester.sql`
- `modules/ai-dev-collaboration-workbench/migrations/0000_married_pride.sql`
- `modules/ai-dev-collaboration-workbench/migrations/0001_lumpy_mongu.sql`
- `modules/ai-dev-collaboration-workbench/migrations/0002_chubby_killer_shrike.sql`
- `modules/ai-dev-collaboration-workbench/migrations/0003_high_valeria_richards.sql`

The root integration should merge these SQL statements into the shared migration and export module schemas from the shared Drizzle schema with unique export names. These local module SQL files must not be applied a second time once incorporated into the shared migration.

Existing production rows are **not** copied by this source migration. When importing an authorized export from each old database, preserve all columns, account IDs, revisions, receipts and event history, and rewrite only the known table/index names using the mapping above. The two old `workspaces` tables have different schemas and must not be combined. Do not overwrite existing destination rows with `INSERT OR REPLACE`; a collision requires comparison before import. Existing browser saves on the old origin remain there until the user exports/imports them or an explicit migration mechanism is provided.

## Browser records

All retained HTML entrypoints load `/hub-storage.js` before application code, with `data-module` matching the module slug.

- AI Development uses `adc-language` and legacy `adc-projects-v2`; account workspace and delivery records remain authoritative in their namespaced SQL tables. No full-origin `localStorage.clear()` exists.
- AI PM Studio uses `aipm-studio.v1`; see `docs/aipm-migration.md`.
- EvoPM stores product state through its authenticated database API, not browser localStorage.

## Environment and dependencies

No additional npm dependencies are required beyond the hub starter. Model/engine code remains as it existed; no new model request was added or executed and no API key was created or updated. Existing optional bindings referenced by EvoPM are `ENGINE_URL`, `ENGINE_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`. AI Development retains `SITE_ADMIN_EMAIL`, `OPENAI_API_KEY`, `OPENAI_MODEL`; `DELIVERY_LOCAL_PREVIEW` is test/development-only. Secrets are not embedded in source or copied here.

## Verification

- AI Development: 37 retained regression tests passed against namespaced migrations, including isolation, stale revisions, origin checks, audit failures, delivery transitions and mocked model requests.
- EvoPM: 33 domain tests passed against the migrated source.
- AI PM Studio: 9 original validation tests and all 5 JavaScript syntax checks passed.
- AI Development: all 10 JavaScript syntax checks passed.
- The combined EvoPM + AI Development SQL created all 8 domain tables in one SQLite database without collisions.
- Root TypeScript check passed after this migration.
- The actual embedded HTML passed bootstrap ordering, static asset resolution, login return-path and administrator access checks.

Browser and deployed integration verification is owned by the root agent after all modules are combined.
