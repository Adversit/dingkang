import { feedbackIdentity } from '@/lib/feedback/server';
import { HubError, json, readBoundedBody, requireMutation, requireUser } from '@/lib/hub/server';
import { config, problem } from '@/modules/novel-ai/route-support';
import { testNovelConnection } from '@/modules/novel-ai/key-preference';
import { ModelListError, modelListFailure } from '@/modules/novel-ai/models-list.mjs';

export const dynamic='force-dynamic';
/** Tests metadata access before changing the active connection; never runs generation. */
export async function POST(req:Request){
  try {
    requireMutation(req);
    const user=requireUser(req),identity=feedbackIdentity(req,{FEEDBACK_OWNER_EMAIL:config('FEEDBACK_OWNER_EMAIL')});
    if(!identity.isOwner)throw new HubError('仅站点负责人可以管理模型连接。',403);
    if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);
    let body:unknown;
    try{body=JSON.parse(new TextDecoder().decode(await readBoundedBody(req,4096)))}catch{throw new HubError('请求格式不正确。',400)}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['source','expectedRevision'].includes(k)))throw new HubError('请选择站点环境变量。',400);
    const input=body as Record<string,unknown>;
    return json(await testNovelConnection(user.userId,input.source,input.expectedRevision));
  }catch(error){
    if(error instanceof ModelListError){
      const failure=modelListFailure(error)!;
      // A model-list failure can only occur before the preference CAS in testAndSelectPreference.
      // Do not extend this assertion to storage failures, where commit acknowledgement may be lost.
      console.warn('[novel-model-connection]',{code:failure.code,category:failure.category,providerStatus:failure.providerStatus});
      return json({...failure,connectionUnchanged:true},error.status);
    }
    return problem(error);
  }
}
