import { feedbackIdentity } from '@/lib/feedback/server';
import { requireUser, HubError, json } from '@/lib/hub/server';
import { config, problem } from '@/modules/novel-ai/route-support';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { listProviderModels, ModelListError } from '@/modules/novel-ai/models-list.mjs';
export const dynamic='force-dynamic';
export async function GET(req:Request){
  try {
    const user=requireUser(req), identity=feedbackIdentity(req,{FEEDBACK_OWNER_EMAIL:config('FEEDBACK_OWNER_EMAIL')});
    if(!identity.isOwner)throw new HubError('仅站点负责人可以读取模型列表。',403);
    const before=await getNovelKeyBinding(user.userId);
    const list=await listProviderModels(before.key);
    const after=await getNovelKeyBinding(user.userId);
    if(before.source!==after.source||before.revision!==after.revision)throw new HubError('连接已更改，请重新刷新模型列表。',409);
    return json({...list,sourceRevision:before.revision,fetchedAt:new Date().toISOString()});
  } catch(error) {if(error instanceof ModelListError)return json({error:error.message},error.status);return problem(error)}
}
