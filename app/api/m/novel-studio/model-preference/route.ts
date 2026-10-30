import { feedbackIdentity } from '@/lib/feedback/server';
import { requireUser,requireMutation,HubError,readBoundedBody,json } from '@/lib/hub/server';
import { config,problem } from '@/modules/novel-ai/route-support';
import { getModelPreference,setModelPreference } from '@/modules/novel-ai/model-preference';
export const dynamic='force-dynamic';
function owner(req:Request){const user=requireUser(req),identity=feedbackIdentity(req,{FEEDBACK_OWNER_EMAIL:config('FEEDBACK_OWNER_EMAIL')});if(!identity.isOwner)throw new HubError('仅站点负责人可以管理模型设置。',403);return user.userId}
export async function GET(req:Request){try{return json(await getModelPreference(owner(req)))}catch(error){return problem(error)}}
export async function POST(req:Request){try{requireMutation(req);const id=owner(req);if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HubError('请求须使用 JSON。',415);let body:unknown;try{body=JSON.parse(new TextDecoder().decode(await readBoundedBody(req,4096)))}catch{throw new HubError('请求格式不正确。',400)}if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['model','expectedRevision','expectedSourceRevision'].includes(k))||!('model' in body))throw new HubError('请求格式不正确。',400);const b=body as Record<string,unknown>;return json(await setModelPreference(id,b.model,b.expectedRevision,b.expectedSourceRevision))}catch(error){return problem(error)}}
