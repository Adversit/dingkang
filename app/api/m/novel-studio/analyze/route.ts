import { env } from 'cloudflare:workers';
import { feedbackIdentity } from '@/lib/feedback/server';
import { HubError, json, readBoundedBody, requireMutation } from '@/lib/hub/server';
import { analyze, AnalysisError } from '@/modules/novel-ai/analysis.mjs';

export const dynamic = 'force-dynamic';
function config(name: string): string {
  const value = (env as unknown as Record<string, unknown>)[name] ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
  return typeof value === 'string' ? value.trim() : '';
}
export async function POST(req: Request) {
  try {
    requireMutation(req);
    const identity = feedbackIdentity(req, { FEEDBACK_OWNER_EMAIL: config('FEEDBACK_OWNER_EMAIL') });
    if (!identity.authenticated) throw new HubError('请先使用 ChatGPT 登录。', 401);
    if (!identity.isOwner) throw new HubError('AI 分析目前仅向站点负责人开放。', 403);
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HubError('请求须使用 JSON。', 415);
    const bytes = await readBoundedBody(req, 64 * 1024);
    let data: unknown;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HubError('请求 JSON 格式错误。', 400); }
    const result = await analyze(data, { key:config('NOVEL_OPENAI_API_KEY'), model:config('NOVEL_OPENAI_MODEL'), baseUrl:config('NOVEL_OPENAI_BASE_URL') });
    return json(result);
  } catch (error) {
    if (error instanceof HubError || error instanceof AnalysisError) return json({status:'ERROR', error:error.message}, error.status);
    return json({status:'ERROR',error:'分析未完成，请重试。'},500);
  }
}
