import { env } from 'cloudflare:workers';
import { feedbackIdentity } from '@/lib/feedback/server';
import { HubError, failure, json, requireUser, requireMutation, readBoundedBody } from '@/lib/hub/server';
import { novelKeyStatus, saveNovelKeyPreference } from '@/modules/novel-ai/key-preference';
import { KeyPreferenceError } from '@/modules/novel-ai/key-preference-core.mjs';

export const dynamic = 'force-dynamic';
function config(name: string): string {
  const value = (env as unknown as Record<string, unknown>)[name] ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
  return typeof value === 'string' ? value.trim() : '';
}
function owner(req:Request) {
  const user=requireUser(req);
  const identity=feedbackIdentity(req,{ FEEDBACK_OWNER_EMAIL:config('FEEDBACK_OWNER_EMAIL') });
  if(!identity.isOwner)throw new HubError('仅站点负责人可以管理模型配置。',403);
  return user.userId;
}
function problem(e:unknown){return e instanceof KeyPreferenceError?json({error:e.message},e.status):failure(e)}
/** Presence and allowed source names only. No secret is returned or validated. */
export async function GET(req: Request) {
  try {
    const status=await novelKeyStatus(owner(req));
    const model=config('NOVEL_OPENAI_MODEL');
    const safe=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,100}$/.test(model) && !/^(sk-|sess-)/i.test(model);
    return json({keyConfigured:!!status.available[status.source],sources:status.available,environmentVariables:status.environmentVariables,selectedSource:status.source,preferenceRevision:status.revision,modelConfigured:!!model,model:safe?model:null,verified:false});
  } catch(error){return problem(error)}
}
/** Only changes an allowlisted reference; no secret values accepted. */
export async function POST(req: Request){
  try {
    requireMutation(req);const user=owner(req);
    if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);
    let parsed:unknown;
    try{parsed=JSON.parse(new TextDecoder().decode(await readBoundedBody(req,4096)))}catch{throw new HubError('请求格式不正确。',400)}
    if(!parsed || typeof parsed!=='object'||Array.isArray(parsed))throw new HubError('请求格式不正确。',400);
    const body=parsed as Record<string,unknown>;
    if(Object.keys(body).some(key=>!['source','expectedRevision'].includes(key)))throw new HubError('只能选择站点已配置的环境变量。',400);
    return json(await saveNovelKeyPreference(user,body.source,body.expectedRevision));
  }catch(error){return problem(error)}
}
