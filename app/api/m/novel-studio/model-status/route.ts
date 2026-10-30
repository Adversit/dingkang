import { env } from 'cloudflare:workers';
import { feedbackIdentity } from '@/lib/feedback/server';
import { HubError, failure, json, requireUser } from '@/lib/hub/server';

export const dynamic = 'force-dynamic';

function config(name: string): string {
  const value = (env as unknown as Record<string, unknown>)[name] ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
  return typeof value === 'string' ? value.trim() : '';
}

/** Reports only active configuration presence; never sends secrets or calls a provider. */
export async function GET(req: Request) {
  try {
    requireUser(req);
    const identity = feedbackIdentity(req, { FEEDBACK_OWNER_EMAIL: config('FEEDBACK_OWNER_EMAIL') });
    if (!identity.isOwner) throw new HubError('仅站点负责人可以查看模型配置状态。', 403);
    const model = config('NOVEL_OPENAI_MODEL');
    const modelSafe = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,100}$/.test(model) && !/^(sk-|sess-)/i.test(model);
    return json({ keyConfigured: !!config('NOVEL_OPENAI_API_KEY'), modelConfigured: !!model, model: modelSafe ? model : null, verified: false });
  } catch (error) { return failure(error); }
}
