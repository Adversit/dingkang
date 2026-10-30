import { env } from 'cloudflare:workers';
import { feedbackIdentity } from '@/lib/feedback/server';
import { HubError, json, readBoundedBody, requireMutation,requireUser } from '@/lib/hub/server';
import { analyze, AnalysisError } from '@/modules/novel-ai/analysis.mjs';
import { chooseModel } from '@/modules/novel-ai/model-preference';
import { ContextError } from '@/modules/novel-ai/context.mjs';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { KeyPreferenceError } from '@/modules/novel-ai/key-preference-core.mjs';

export const dynamic = 'force-dynamic';
function config(name: string): string {
  const value = (env as unknown as Record<string, unknown>)[name] ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
  return typeof value === 'string' ? value.trim() : '';
}
export async function POST(req: Request) {
  try {
    requireMutation(req);
    const user = requireUser(req);
    const identity = feedbackIdentity(req, { FEEDBACK_OWNER_EMAIL: config('FEEDBACK_OWNER_EMAIL') });
    if (!identity.authenticated) throw new HubError('请先使用 ChatGPT 登录。', 401);
    if (!identity.isOwner) throw new HubError('AI 分析目前仅向站点负责人开放。', 403);
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HubError('请求须使用 JSON。', 415);
    const bytes = await readBoundedBody(req, 64 * 1024);
    let data: unknown;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HubError('请求 JSON 格式错误。', 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HubError('请求格式错误。',400);
    const binding = await getNovelKeyBinding(user.userId);
    const model = await chooseModel(user.userId,(data as Record<string, unknown>).model,binding.revision);
    const result = await analyze(data, { key:binding.key, model, baseUrl:config('NOVEL_OPENAI_BASE_URL') });
    const currentBinding = await getNovelKeyBinding(user.userId);
    if (currentBinding.source!==binding.source || currentBinding.revision!==binding.revision) throw new HubError('分析期间密钥配置发生变化，请重新分析。',409);
    return json(result);
  } catch (error) {
    if (error instanceof HubError || error instanceof AnalysisError || error instanceof ContextError || error instanceof KeyPreferenceError) return json({status:'ERROR', error:error.message}, error.status);
    return json({status:'ERROR',error:'分析未完成，请重试。'},500);
  }
}
