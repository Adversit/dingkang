# AI PM Studio migration

- Source: `unified-inspection/aipm-studio-dk/dist`.
- Destination: `public/apps/aipm-studio-dk/`.
- Entry URL: `/apps/aipm-studio-dk/index.html` (or the containing directory with a trailing slash).
- Preserved all 12 original distribution files and their relative module/asset/method-pack paths.
- Added `/hub-storage.js` with `data-module="aipm-studio-dk"` in the document head, before application scripts. The application awaits `window.HubStorage.ready` before its first retained-key read. The shared bridge owns authentication and server persistence.
- Preserved the existing localStorage key `aipm-studio.v1`, containing project records, active project, validation flow, decisions, evidence and notes. The application uses only getItem/setItem for this key; it has no localStorage.clear or removeItem behavior.
- No database schema, API routes, API credentials or new model calls are introduced by this module.
- Cross-origin browser storage from the original Site is not readable on the hub origin. Existing project export/import remains available for migrating such data.
- Storage labels follow the actual `HubStorage.status` and `hub-storage-status` event; a local setItem alone never displays cloud confirmation. Offline, pending, conflict and unavailable states remain distinct.
- No new dependencies are required.

Validation:

- All five JavaScript modules passed `node --check`.
- `tests/aipm-storage.test.mjs` verifies startup waits for restored account state and pending/offline/conflict/saved labels track bridge events.
- The existing validation model test suite passed unchanged.
- Static references and module imports were checked for destination existence; external links and hash routes remain unchanged.
