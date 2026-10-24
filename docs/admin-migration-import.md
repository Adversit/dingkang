# Temporary business-data migration import

The endpoint is disabled unless the runtime secret `HUB_MIGRATION_IMPORT_TOKEN` contains at least 32 characters. Every request requires the exact value in the `X-Migration-Token` header. ChatGPT login or administrator status does not substitute for this capability token. Remove the secret and deploy the environment change after verification.

Endpoint: `/api/hub/admin-import`.

## Standard import

- `GET` returns `{tables:[{table,sourceProjectId,count}]}` for the 33 allowed business tables. It does not return private rows.
- `POST` accepts `{sourceProjectId,table,rows}`. `table` is the **prefixed destination table name** in `lib/hub/migration-manifest.ts`; `sourceProjectId` must match that entry.
- Every row must contain all source-schema columns, including nullable columns set to `null`. Unknown columns, missing columns and incorrect SQLite primitive types are rejected.
- Each request supports at most 100 rows and 2 MiB of UTF-8 JSON. Empty arrays are allowed.
- Existing primary keys are compared across every column. Identical rows are skipped; different rows return `409 migration_conflict` before writes. Compound primary keys are supported.
- New rows are inserted in one transactional D1 batch. A competing insertion, secondary unique conflict or foreign-key failure aborts the complete write batch. Standard import does not update, replace or delete existing rows.
- A standard receipt contains only `receiptId`, `sourceProjectId`, `table`, `received`, `inserted`, `skipped`, and `completedAt`. It never echoes row JSON.
- Import parent tables before tables with foreign-key references. Account IDs are preserved unless an authorized caller has independently verified and prepared a specific identity transformation. There is no general `map-owner` action.

## Guarded restoration of an empty workspace

The one explicit replacement path is limited to `ai_dev_collaboration_workbench__workspaces`. A caller may add `replaceEmptyWorkspace: {expectedExistingRow}` to a single-row import. It is not a general overwrite option.

The expected row must match the complete live row, contain an empty projects array and have the initial revision. The incoming row must contain a nonempty projects array and use the same target user key. Both rows must pass the full schema validation; backup keys cannot be used as target accounts.

The transaction first preserves the exact empty row under an internal backup key, then updates the original row only while every expected column still matches. The installed revision advances beyond both source and target revisions. A competing edit, conflicting backup or failed transaction stops the operation without discarding the original state. Repeating an already-completed identical operation is idempotent.

The special receipt adds replacement and backup counts, a backup digest, and source/installed revision metadata. These are operational receipts, not material for the public repository. Never commit a real receipt, row, account key or digest from a private migration.

## Scope and verification

The manifest includes only retained native business tables. `hub_states`, `hub_state_versions`, and `hub_files` are excluded; unified save imports use their own authenticated version-checking API. R2 object bytes are not imported by this endpoint. Platform project IDs identify deployment relationships and are not authentication credentials.

Run:

```sh
node --test lib/hub/migration.test.mjs
pnpm exec tsc --noEmit --pretty false
```

Tests cover disabled/token boundaries, identifier injection, source mismatch, idempotency, compound keys, transactional conflict handling, concurrent changes, UTF-8 limits, bounded table counting, metadata-only errors, and atomic empty-workspace restoration. Keep source exports, production rows, receipts and token values outside source control.
