# Personal modules migration

The current migration preserves existing module behavior. It does not add product features or configure an AI provider.

## Runtime routes

| Module | User-facing route | API prefix | Persisted state |
|---|---|---|---|
| 晚灯 | `/m/wandeng-evening` | `/api/m/wandeng-evening/{state,action,chat}` | Existing conversations, messages, memories, pages, preferences, suppressions, runs in shared D1 |
| 同住 | `/apps/roommate-housekeeper/index.html` | `/api/m/roommate-housekeeper/{state,action,reset}` | Existing household demo state, now keyed to authenticated hub user |
| Agent learning | `/apps/agent-architecture-journey/index.html` | Shared hub state service | Reading route and position via the shared storage bridge |

All application files and assets run from the new Site. No live UI is embedded from the old origins.

## D1 mappings

Apply `modules/wandeng-evening/migration.sql` and `modules/roommate-housekeeper/migration.sql` once in the initial unified migration. The evening SQL preserves original migration order, including added columns and indexes.

| Original module/table | Unified table | User field |
|---|---|---|
| wandeng-evening / conversations | wandeng_evening__conversations | owner |
| wandeng-evening / memories | wandeng_evening__memories | owner |
| wandeng-evening / messages | wandeng_evening__messages | owner |
| wandeng-evening / pages | wandeng_evening__pages | owner |
| wandeng-evening / preferences | wandeng_evening__preferences | owner (primary key) |
| wandeng-evening / runs | wandeng_evening__runs | owner |
| wandeng-evening / suppressions | wandeng_evening__suppressions | owner |
| roommate-housekeeper / demo_households | roommate_housekeeper__demo_households | id |

Evening's runtime D1 wrapper rewrites only the seven known table identifiers. Its Drizzle schema declares the same prefixed names. JSON API field names remain unchanged. Existing per-owner checks remain active and get identity from the root ChatGPT authentication helper.

Roommate's original storage key was an anonymous browser `tongzhu` cookie. The new API requires authenticated hub identity and uses that ID as its record key. Its original demo-family behavior is preserved and remains explicitly labeled as a demo. A migration MUST NOT assign every legacy cookie-keyed household to the hub owner: migrate an identified browser's row only after verifying its relation to the user, or preserve unidentified rows in a restricted migration archive. This differs from evening's explicit owner field migration.

## Client state

- Roommate retains `tongzhu-role`, isolated and synchronized by the shared bridge.
- Learning retains `agent-reading-position` with path, scroll and update timestamp.
- Evening uses `wandeng-visual-motion` for its visual preference; the root ModuleStorageGate provides the shared bridge for this route.
- Static startup awaits `window.HubStorage.ready` before reading state or running application logic.
- Learning chapter/code links now use absolute module-scoped paths and explicit `index.html` directory pages.

## Assets and dependencies

Evening assets are under `/assets/wandeng-evening/`. Static files are under their `/apps/<slug>/` roots. No new packages are required beyond the root starter's `zod`, `lucide-react`, `drizzle-orm`, `react` and TypeScript. Existing `OPENAI_API_KEY` / `OPENAI_MODEL` reads remain in the provider runtime; no key was created, copied or configured and no external model request was made.

## Validation

`node --test tests/personal-storage.test.mjs` passes four tests:

1. Evening namespaced tables save/reload pages and isolate two authenticated users.
2. Roommate rejects anonymous access, isolates account state, persists versions and rejects stale writes.
3. Roommate's fully assembled inline JavaScript parses and waits for bridge hydration.
4. Learning code/chapters use the new module paths and reading-position storage.

Native browser verification and production-data migration are coordinated by the root agent. These local tests use synthetic records in in-memory SQLite only.
