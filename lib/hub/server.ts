import { env } from 'cloudflare:workers';

export const HUB_MODULES = [
  'evopm-workbench', 'zhizheng-research', 'wandeng-evening', 'zhiliu-radar',
  'aipm-studio-dk', 'cloudrush-runner', 'starfall-creature-isles',
  'roommate-housekeeper', 'pocket-arcade-ten', 'yourwar-battle-forge',
  'mistbound-letters', 'moonlit-immortal-chronicle', 'yunque-sanguo',
  'agent-architecture-journey', 'ai-dev-collaboration-workbench', 'hub-preferences',
] as const;
const allowedModules = new Set<string>(HUB_MODULES);
export const MAX_STATE_BYTES = 2 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_VALUE_BYTES = 512 * 1024;
const MAX_KEYS = 200;
const encoder = new TextEncoder();
export type HubUser = { userId: string; displayName: string };
export type HubState = { values: Record<string, string>; revision: number; updatedAt: string | null };
type StateRow = { owner_id: string; module_id: string; values_json: string; revision: number; updated_at: string };
type FileRow = { id: string; owner_id: string; module_id: string; object_key: string; name: string; mime_type: string; size: number; created_at: string };

export class HubError extends Error {
  constructor(message: string, public status = 400, public details: Record<string, unknown> = {}) { super(message); }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function failure(error: unknown) {
  if (error instanceof HubError) return json({ error: error.message, ...error.details }, error.status);
  return json({ error: '操作未完成，请重试；当前内容尚未确认保存。' }, 500);
}
export function userFromRequest(req: Request): HubUser | null {
  const userId = req.headers.get('oai-authenticated-user-id');
  const email = req.headers.get('oai-authenticated-user-email');
  const claimed = req.headers.get('x-hub-user-id');
  if (claimed !== null && (!userId || claimed !== userId)) throw new HubError('账号已切换，请重新载入后再同步。', 401);
  if (!userId || !email) return null;
  let displayName = email;
  const encoded = req.headers.get('oai-authenticated-user-full-name');
  if (encoded && req.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { displayName = decodeURIComponent(encoded) || email; } catch { /* fall back to verified email */ }
  }
  return { userId, displayName };
}
export function requireUser(req: Request): HubUser {
  const user = userFromRequest(req);
  if (!user) throw new HubError('请先使用 ChatGPT 登录。', 401);
  return user;
}
export function requireMutation(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin) throw new HubError('请求来源不匹配。', 403);
}
export function moduleId(value: unknown): string {
  if (typeof value !== 'string' || !allowedModules.has(value)) throw new HubError('未知模块。', 404);
  return value;
}
export function database(): D1Database {
  if (!env.DB) throw new HubError('数据库尚未就绪。', 503);
  return env.DB;
}
export function bucket(): R2Bucket {
  if (!env.BUCKET) throw new HubError('文件存储尚未就绪。', 503);
  return env.BUCKET;
}
export async function readBoundedBody(req: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = req.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new HubError('请求内容过大。', 413);
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HubError('请求内容过大。', 413); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const bytes = await readBoundedBody(req, MAX_STATE_BYTES + 8192);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HubError('JSON 格式错误。'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HubError('请求必须是 JSON 对象。');
  return value as Record<string, unknown>;
}
export function validateStateInput(body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.expectedRevision) || (body.expectedRevision as number) < 0) throw new HubError('expectedRevision 必须是非负整数。');
  if (!body.values || typeof body.values !== 'object' || Array.isArray(body.values)) throw new HubError('values 必须是字符串键值对象。');
  const entries = Object.entries(body.values);
  if (entries.length > MAX_KEYS) throw new HubError(`最多保存 ${MAX_KEYS} 个存档键。`, 413);
  for (const [key, value] of entries) {
    if (!key || key.length > 200 || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new HubError('存档键名称无效。');
    if (typeof value !== 'string') throw new HubError('存档值必须是字符串。');
    if (encoder.encode(value).byteLength > MAX_VALUE_BYTES) throw new HubError('单条存档超过 512 KiB。', 413);
  }
  const values = Object.fromEntries(entries) as Record<string, string>;
  const serialized = JSON.stringify(values);
  if (encoder.encode(serialized).byteLength > MAX_STATE_BYTES) throw new HubError('模块存档超过 2 MiB。', 413);
  return { values, serialized, expectedRevision: body.expectedRevision as number };
}
function stateFromRow(row: StateRow | null): HubState {
  return row ? { values: JSON.parse(row.values_json), revision: row.revision, updatedAt: row.updated_at } : { values: {}, revision: 0, updatedAt: null };
}
export async function readState(owner: string, id: string): Promise<HubState> {
  moduleId(id);
  const row = await database().prepare('SELECT owner_id,module_id,values_json,revision,updated_at FROM hub_states WHERE owner_id=? AND module_id=?').bind(owner, id).first<StateRow>();
  return stateFromRow(row);
}
export async function stateHistory(owner: string, id: string) {
  moduleId(id);
  const result = await database().prepare('SELECT revision,updated_at FROM hub_state_versions WHERE owner_id=? AND module_id=? ORDER BY revision DESC LIMIT 20').bind(owner, id).all<{ revision: number; updated_at: string }>();
  const current = await readState(owner, id);
  return { history: result.results.map(row => ({ revision: row.revision, updatedAt: row.updated_at })), revision: current.revision };
}
export async function readStateRevision(owner: string, id: string, revision: number): Promise<HubState> {
  moduleId(id);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new HubError('版本号无效。');
  const current = await readState(owner, id);
  if (current.revision === revision) return current;
  const row = await database().prepare('SELECT owner_id,module_id,values_json,revision,updated_at FROM hub_state_versions WHERE owner_id=? AND module_id=? AND revision=?').bind(owner, id, revision).first<StateRow>();
  if (!row) throw new HubError('该历史版本不存在或已超过保留范围。', 404);
  return stateFromRow(row);
}
export async function writeState(owner: string, id: string, body: Record<string, unknown>): Promise<HubState> {
  moduleId(id);
  const { values, serialized, expectedRevision } = validateStateInput(body);
  const db = database(), updatedAt = new Date().toISOString();
  // D1 batch executes these statements in one transaction. The matching old
  // revision is archived only when this request is eligible for the CAS write.
  const archive = db.prepare('INSERT OR IGNORE INTO hub_state_versions(owner_id,module_id,revision,values_json,updated_at) SELECT owner_id,module_id,revision,values_json,updated_at FROM hub_states WHERE owner_id=? AND module_id=? AND revision=?').bind(owner, id, expectedRevision);
  const update = expectedRevision === 0
    ? db.prepare('INSERT OR IGNORE INTO hub_states(owner_id,module_id,values_json,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner, id, serialized, updatedAt)
    : db.prepare('UPDATE hub_states SET values_json=?,revision=revision+1,updated_at=? WHERE owner_id=? AND module_id=? AND revision=?').bind(serialized, updatedAt, owner, id, expectedRevision);
  const prune = db.prepare('DELETE FROM hub_state_versions WHERE owner_id=? AND module_id=? AND revision NOT IN (SELECT revision FROM hub_state_versions WHERE owner_id=? AND module_id=? ORDER BY revision DESC LIMIT 20)').bind(owner, id, owner, id);
  const results = await db.batch([archive, update, prune]);
  if (results[1].meta.changes !== 1) throw new HubError('存档已有更新，请先读取最新版本。', 409, { current: await readState(owner, id) });
  return { values, revision: expectedRevision + 1, updatedAt };
}
export function fileMetadata(row: FileRow) {
  return { id: row.id, moduleId: row.module_id, name: row.name, mimeType: row.mime_type, size: row.size, createdAt: row.created_at };
}
export async function ownedFile(owner: string, id: string): Promise<FileRow> {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new HubError('文件不存在。', 404);
  const row = await database().prepare('SELECT * FROM hub_files WHERE id=? AND owner_id=?').bind(id, owner).first<FileRow>();
  if (!row) throw new HubError('文件不存在或无访问权限。', 404);
  return row;
}
export async function listFiles(owner: string, id?: string) {
  if (id) moduleId(id);
  const query = id
    ? database().prepare('SELECT * FROM hub_files WHERE owner_id=? AND module_id=? ORDER BY created_at DESC LIMIT 201').bind(owner, id)
    : database().prepare('SELECT * FROM hub_files WHERE owner_id=? ORDER BY created_at DESC LIMIT 201').bind(owner);
  const result = await query.all<FileRow>();
  return { files: result.results.slice(0, 200).map(fileMetadata), hasMore: result.results.length > 200 };
}
export async function uploadFile(req: Request, owner: string) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data;')) throw new HubError('请使用 multipart/form-data 上传。');
  const body = await readBoundedBody(req, MAX_FILE_BYTES + 1024 * 1024);
  let form: FormData;
  try { form = await new Response(body as BodyInit, { headers: { 'content-type': contentType } }).formData(); } catch { throw new HubError('上传表单格式错误。'); }
  const id = moduleId(form.get('moduleId'));
  const file = form.get('file');
  if (!(file instanceof File) || file.size < 1) throw new HubError('请选择非空文件。');
  if (file.size > MAX_FILE_BYTES) throw new HubError('文件不能超过 25 MiB。', 413);
  const fileId = crypto.randomUUID();
  const name = file.name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || 'download';
  const row: FileRow = { id: fileId, owner_id: owner, module_id: id, object_key: `hub/${encodeURIComponent(owner)}/${id}/${fileId}`, name, mime_type: file.type.slice(0, 200) || 'application/octet-stream', size: file.size, created_at: new Date().toISOString() };
  const storage = bucket();
  await storage.put(row.object_key, file, { httpMetadata: { contentType: 'application/octet-stream' } });
  try {
    await database().prepare('INSERT INTO hub_files(id,owner_id,module_id,object_key,name,mime_type,size,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(row.id, row.owner_id, row.module_id, row.object_key, row.name, row.mime_type, row.size, row.created_at).run();
  } catch (error) { try { await storage.delete(row.object_key); } catch { /* preserve the database error */ } throw error; }
  return fileMetadata(row);
}
export async function downloadFile(owner: string, id: string) {
  const file = await ownedFile(owner, id);
  const object = await bucket().get(file.object_key);
  if (!object) throw new HubError('文件内容暂不可用。', 404);
  const encodedName = encodeURIComponent(file.name).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(object.body, { headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(file.size),
    'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox', 'Cache-Control': 'private, no-store',
  } });
}
export async function deleteFile(owner: string, id: string) {
  const file = await ownedFile(owner, id);
  await bucket().delete(file.object_key);
  await database().prepare('DELETE FROM hub_files WHERE id=? AND owner_id=?').bind(id, owner).run();
}
export async function exportStates(owner: string) {
  const rows = await database().prepare('SELECT owner_id,module_id,values_json,revision,updated_at FROM hub_states WHERE owner_id=? ORDER BY module_id').bind(owner).all<StateRow>();
  const selected = rows.results.filter(row => allowedModules.has(row.module_id));
  // Emit one module at a time to avoid constructing a second complete backup
  // object; file bytes and native module business tables are not part of this export.
  let position = -1;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (position === -1) {
        controller.enqueue(encoder.encode(`{"format":"dingkang-hub-state-backup","version":1,"exportedAt":${JSON.stringify(new Date().toISOString())},"modules":[`));
      } else if (position < selected.length) {
        const row = selected[position];
        controller.enqueue(encoder.encode(`${position ? ',' : ''}{"moduleId":${JSON.stringify(row.module_id)},"values":${row.values_json},"revision":${row.revision},"updatedAt":${JSON.stringify(row.updated_at)}}`));
      } else { controller.enqueue(encoder.encode(']}')); controller.close(); }
      position++;
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="dingkang-hub-state-backup.json"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
