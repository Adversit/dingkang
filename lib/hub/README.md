# Unified storage API

This layer stores bridge/legacy browser state and user-uploaded attachments. It does not replace native module business tables, copy original production databases, or include attachments in state backups.

All endpoints use Sites-injected `oai-authenticated-user-id` and `oai-authenticated-user-email`. If `X-Hub-User-Id` is supplied, it must match the verified user ID or the request returns 401. POST, PUT and DELETE require an Origin equal to the current request origin. No client-supplied owner ID controls a database query.

| Endpoint | Contract |
| --- | --- |
| `GET /api/hub/session` | `{authenticated,userId,displayName}`; anonymous reads return false/null/null. |
| `GET /api/hub/state/:moduleId` | `{values,revision,updatedAt}`; no saved state returns `{values:{},revision:0,updatedAt:null}`. |
| `PUT /api/hub/state/:moduleId` | `{values,expectedRevision}`; successful response is the saved state. Stale writes return 409 with `{error,current}`. |
| `GET /api/hub/state/:moduleId?history=1` | `{history:[{revision,updatedAt}],revision}`. Up to 20 prior snapshots, newest first. |
| `GET /api/hub/state/:moduleId?revision=N` | Read current or retained historical revision, without mutation. Missing revision returns 404. |
| `GET /api/hub/files?moduleId=...` | Optional module filter. `{files:[{id,moduleId,name,mimeType,size,createdAt}],hasMore}`; capped at 200. |
| `POST /api/hub/files` | Multipart `file` plus `moduleId`. 201 `{file:{id,moduleId,name,mimeType,size,createdAt}}`. |
| `GET /api/hub/files/:id` | Owner-only attachment download, always `application/octet-stream`, `nosniff` and CSP `sandbox`. HTML/SVG never execute as a public asset. |
| `DELETE /api/hub/files/:id` | Owner-only delete, `{ok:true}`. |
| `GET /api/hub/export` | JSON attachment `{format:"dingkang-hub-state-backup",version:1,exportedAt,modules:[{moduleId,values,revision,updatedAt}]}`. Includes only this user's unified current states. |
| `POST /api/hub/import` | One module `{moduleId,values,expectedRevision}`. Same CAS behavior as PUT; never silently overwrites a newer revision. |
| `GET /api/hub/health` | Authenticated D1 table/read and R2 head checks; `{ok,database,storage}`, HTTP 503 when a check fails. |

The fixed allowlist contains the 15 published source module slugs and `hub-preferences`; the unpublished `zaowu-flow` placeholder is not a storage module.

Limits: 200 keys per module, 200 characters per key, string values only, 512 KiB per value, 2 MiB serialized values per module, 25 MiB per nonempty attachment. Request bodies are read with byte caps even if Content-Length is absent. JSON metadata adds an 8 KiB allowance; multipart overhead adds a 1 MiB allowance.

Storage: `hub_states` and `hub_state_versions` use owner/module composite keys. D1 batch atomically archives the matching previous revision, performs a compare-and-swap write, and retains the latest 20 prior versions. `hub_files` stores metadata; objects use `hub/<encodedUserId>/<moduleId>/<uuid>` in the shared BUCKET. A metadata insertion failure triggers best-effort object cleanup; deletion removes object data before deleting its metadata so a failed deletion is retryable.

Run `node --test lib/hub/server.test.mjs` from the repository root. Tests execute the actual handlers against SQLite and an in-memory R2 adapter; they exercise anonymous/authenticated boundaries, account switch guards, origin restrictions, CAS conflicts, history retention, cross-user isolation, limits, backup/import behavior, safe attachment downloads/deletion and health checks. They do not make model, network or production storage calls.
