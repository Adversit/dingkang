import { modules } from '../hub/catalog';

export type FeedbackEnvironment = { DB?: D1Database; FEEDBACK_OWNER_EMAIL?: unknown; FEEDBACK_RATE_SALT?: unknown };
type FeedbackRow = {
  id: string; request_id: string; request_hash: string; module_id: string; category: string;
  title: string; content: string; expected: string; contact: string; page_path: string;
  reporter_id: string | null; created_at: string; status: string; version: number;
  review_note: string; reviewed_by: string | null; reviewed_at: string | null;
};
const encoder = new TextEncoder();
const statuses = ['all', 'new', 'pending_review', 'approved', 'rejected', 'needs_evidence'];
const validModules = new Set(['hub', ...modules.map(item => item.id)]);
class FeedbackError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function response(value: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
function database(env: FeedbackEnvironment) {
  if (!env.DB) throw new FeedbackError('反馈服务尚未就绪，请稍后再试。', 503);
  return env.DB;
}
export function feedbackIdentity(req: Request, env: FeedbackEnvironment) {
  const id = req.headers.get('oai-authenticated-user-id');
  const email = req.headers.get('oai-authenticated-user-email');
  const ownerEmail = typeof env.FEEDBACK_OWNER_EMAIL === 'string' ? env.FEEDBACK_OWNER_EMAIL.trim().toLowerCase() : '';
  return { authenticated: !!id && !!email, isOwner: !!id && !!email && !!ownerEmail && email.toLowerCase() === ownerEmail, id };
}
function requireOwner(req: Request, env: FeedbackEnvironment) {
  const user = feedbackIdentity(req, env);
  if (!user.authenticated) throw new FeedbackError('请使用站点负责人的 ChatGPT 账号登录。', 401);
  if (!user.isOwner) throw new FeedbackError('只有站点负责人可以查看和审阅反馈。', 403);
  return user.id!;
}
function requireOrigin(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin) throw new FeedbackError('请通过本站的反馈入口提交。', 403);
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
async function body(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new FeedbackError('请使用 JSON 提交反馈。', 415);
  const max = 32 * 1024, length = req.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new FeedbackError('反馈内容过长。', 413);
  if (!req.body) throw new FeedbackError('请填写反馈。');
  const reader = req.body.getReader(), decoder = new TextDecoder();
  let size = 0, raw = '';
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > max) { await reader.cancel(); throw new FeedbackError('反馈内容过长。', 413); }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
  } finally { reader.releaseLock(); }
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new FeedbackError('反馈格式不正确。'); }
  if (!record(value)) throw new FeedbackError('反馈格式不正确。');
  return value;
}
function field(value: unknown, label: string, max: number, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new FeedbackError(`${label}格式不正确或超过 ${max} 字。`);
  const text = value.trim();
  if (required && !text) throw new FeedbackError(`请填写${label}。`);
  return text;
}
function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new FeedbackError('提交包含不支持的字段。');
}
async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function rateKey(req: Request, env: FeedbackEnvironment, day: string) {
  if (typeof env.FEEDBACK_RATE_SALT !== 'string' || env.FEEDBACK_RATE_SALT.length < 32) throw new FeedbackError('反馈服务正在配置，请稍后再试。', 503);
  // Trusted platform headers only. Do not accept caller-provided forwarding IDs.
  const identity = feedbackIdentity(req, env);
  const address = req.headers.get('cf-connecting-ip') || 'anonymous-unavailable';
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.FEEDBACK_RATE_SALT), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${day}:${identity.authenticated ? identity.id : address}`));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}
function publicRow(row: FeedbackRow) {
  const { request_id: _request, request_hash: _hash, ...data } = row;
  return { ...data, analysis: null };
}
async function submit(req: Request, env: FeedbackEnvironment) {
  requireOrigin(req);
  const input = await body(req);
  onlyKeys(input, ['requestId', 'moduleId', 'category', 'title', 'content', 'expected', 'contact', 'pagePath']);
  const requestId = field(input.requestId, '请求编号', 100, true);
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)) throw new FeedbackError('请求编号无效，请重新打开反馈表单。');
  const moduleId = field(input.moduleId, '应用', 100, true);
  if (!validModules.has(moduleId)) throw new FeedbackError('请选择有效应用。');
  const category = field(input.category, '反馈类型', 30, true);
  if (!['bug', 'feature', 'experience', 'other'].includes(category)) throw new FeedbackError('请选择有效反馈类型。');
  const title = field(input.title, '标题', 120, true), content = field(input.content, '问题描述', 4000, true);
  const expected = field(input.expected, '期望结果', 2000), contact = field(input.contact, '联系方式', 180);
  const rawPath = field(input.pagePath, '来源页面', 300) || '/';
  if (!rawPath.startsWith('/') || rawPath.startsWith('//') || rawPath.includes('\\')) throw new FeedbackError('来源页面无效。');
  const pagePath = new URL(rawPath, 'https://feedback.invalid').pathname;
  const requestHash = await digest(JSON.stringify({ moduleId, category, title, content, expected, contact, pagePath }));
  const db = database(env);
  const existing = await db.prepare('SELECT id,request_hash FROM hub_feedback WHERE request_id=?').bind(requestId).first<{id:string;request_hash:string}>();
  if (existing) {
    if (existing.request_hash !== requestHash) throw new FeedbackError('这次提交已保存其他内容，请重新提交。', 409);
    return response({ id: existing.id, receipt: existing.id, status: 'received', duplicate: true });
  }
  const now = new Date().toISOString(), day = now.slice(0, 10), hour = now.slice(0, 13);
  const fingerprint = await rateKey(req, env, day), hourKey = `hour:${hour}:${fingerprint}`, dayKey = `day:${day}`;
  // Some hosting paths omit network identity. In that case rely on the site-wide
  // guard instead of accidentally limiting every anonymous visitor to eight.
  const hourlyLimit = feedbackIdentity(req, env).authenticated || req.headers.get('cf-connecting-ip') ? 8 : 2000;
  const expiresAt = new Date(Date.now() + 48 * 3600_000).toISOString();
  const id = crypto.randomUUID(), reporterId = feedbackIdentity(req, env).authenticated ? req.headers.get('oai-authenticated-user-id') : null;
  // Both limit counters and the receipt are handled in a single transaction.
  // Repeated parallel requests with the same ID cannot consume extra quota.
  const result = await db.batch([
    db.prepare('DELETE FROM hub_feedback_limits WHERE expires_at < ?').bind(now),
    db.prepare('INSERT OR IGNORE INTO hub_feedback_limits(key,count,expires_at) VALUES(?,0,?)').bind(hourKey, expiresAt),
    db.prepare('INSERT OR IGNORE INTO hub_feedback_limits(key,count,expires_at) VALUES(?,0,?)').bind(dayKey, expiresAt),
    db.prepare("INSERT OR IGNORE INTO hub_feedback(id,request_id,request_hash,module_id,category,title,content,expected,contact,page_path,reporter_id,created_at,status,version,review_note) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,'pending_review',1,'' WHERE (SELECT count FROM hub_feedback_limits WHERE key=?) < ? AND (SELECT count FROM hub_feedback_limits WHERE key=?) < 2000").bind(id, requestId, requestHash, moduleId, category, title, content, expected, contact, pagePath, reporterId, now, hourKey, hourlyLimit, dayKey),
    db.prepare('UPDATE hub_feedback_limits SET count=count+1 WHERE key IN (?,?) AND EXISTS(SELECT 1 FROM hub_feedback WHERE id=?)').bind(hourKey, dayKey, id),
  ]);
  if (result[3].meta.changes !== 1) {
    const saved = await db.prepare('SELECT id,request_hash FROM hub_feedback WHERE request_id=?').bind(requestId).first<{id:string;request_hash:string}>();
    if (saved?.request_hash === requestHash) return response({ id: saved.id, receipt: saved.id, status: 'received', duplicate: true });
    if (saved) throw new FeedbackError('这次提交已保存其他内容，请重新提交。', 409);
    return response({ error: '提交较频繁，请稍后再试。', retryAfter: 3600 }, 429, { 'Retry-After': '3600' });
  }
  return response({ id, receipt: id, status: 'received', duplicate: false }, 201);
}
async function list(req: Request, env: FeedbackEnvironment, approvedOnly = false) {
  requireOwner(req, env);
  const url = new URL(req.url), status = approvedOnly ? 'approved' : url.searchParams.get('status') || 'all';
  if (!statuses.includes(status)) throw new FeedbackError('筛选状态无效。');
  const offset = Number(url.searchParams.get('offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new FeedbackError('分页无效。');
  const db = database(env);
  const feedbackId = !approvedOnly ? url.searchParams.get('id') : null;
  if (feedbackId && !/^[a-zA-Z0-9_-]{1,100}$/.test(feedbackId)) throw new FeedbackError('反馈编号无效。');
  const result = feedbackId
    ? await db.prepare('SELECT * FROM hub_feedback WHERE id=?').bind(feedbackId).all<FeedbackRow>()
    : status === 'all'
    ? await db.prepare('SELECT * FROM hub_feedback ORDER BY created_at DESC,id DESC LIMIT 101 OFFSET ?').bind(offset).all<FeedbackRow>()
    : await db.prepare('SELECT * FROM hub_feedback WHERE status=? ORDER BY created_at DESC,id DESC LIMIT 101 OFFSET ?').bind(status, offset).all<FeedbackRow>();
  const counts = await db.prepare('SELECT status,COUNT(*) AS count FROM hub_feedback GROUP BY status').all();
  return response({ isOwner: true, feedback: result.results.slice(0, 100).map(publicRow), reports: [], counts: counts.results, hasMore: result.results.length > 100, nextOffset: result.results.length > 100 ? offset + 100 : null });
}
async function review(req: Request, env: FeedbackEnvironment) {
  requireOrigin(req);
  const actor = requireOwner(req, env), input = await body(req);
  onlyKeys(input, ['id', 'expectedVersion', 'decision', 'note']);
  const id = field(input.id, '反馈编号', 100, true), note = field(input.note, '审核备注', 2000, true);
  const decision = field(input.decision, '审核决定', 30, true);
  if (!['approved', 'rejected', 'needs_evidence'].includes(decision)) throw new FeedbackError('审核决定无效。');
  const version = input.expectedVersion;
  if (!Number.isSafeInteger(version) || (version as number) < 1) throw new FeedbackError('审核版本无效，请刷新。');
  const db = database(env), now = new Date().toISOString();
  const result = await db.batch([
    db.prepare('UPDATE hub_feedback SET status=?,review_note=?,reviewed_by=?,reviewed_at=?,version=version+1 WHERE id=? AND version=?').bind(decision, note, actor, now, id, version),
    db.prepare('INSERT INTO hub_feedback_reviews(id,feedback_id,decision,note,actor_id,version,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(), id, decision, note, actor, (version as number) + 1, now),
  ]);
  if (result[0].meta.changes !== 1) throw new FeedbackError('反馈不存在或已在另一处审阅，请刷新后再决定。', 409);
  const row = await db.prepare('SELECT * FROM hub_feedback WHERE id=?').bind(id).first<FeedbackRow>();
  return response({ feedback: row ? publicRow(row) : null, developmentStarted: false });
}
export async function handleFeedbackRequest(req: Request, env: FeedbackEnvironment): Promise<Response> {
  try {
    const path = new URL(req.url).pathname.replace(/\/$/, '');
    if (path === '/api/hub/feedback/session' && req.method === 'GET') return response(feedbackIdentity(req, env));
    if (path === '/api/hub/feedback' && req.method === 'POST') return await submit(req, env);
    if (path === '/api/hub/feedback/review' && req.method === 'GET') return await list(req, env);
    if (path === '/api/hub/feedback/review' && req.method === 'POST') return await review(req, env);
    if (path === '/api/hub/feedback/review/approved' && req.method === 'GET') return await list(req, env, true);
    return response({ error: '此反馈接口不支持该操作。' }, 405);
  } catch (error) {
    if (error instanceof FeedbackError) return response({ error: error.message }, error.status);
    return response({ error: '反馈操作未完成，请重试。请保留已填写内容。' }, 500);
  }
}
