import { HubError, json } from '@/lib/hub/server';
import { config, inputFor, problem } from '@/modules/novel-ai/route-support';
import { selectModel } from '@/modules/novel-ai/model-selection.mjs';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { generatePlan, preparePlanPreview } from '@/modules/novel-orchestration/auto-run.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const {owner,input}=await inputFor(req);if(!input||typeof input!=='object'||Array.isArray(input))throw new HubError('请求格式无效。',400);const data=input as Record<string,unknown>,model=selectModel(data.model,config('NOVEL_OPENAI_MODEL')),baseUrl=config('NOVEL_OPENAI_BASE_URL')||'https://api.openai.com/v1';const {key,source,revision}=await getNovelKeyBinding(owner);const p=await preparePlanPreview(data,model,baseUrl,{source,revision});if(typeof data.previewHash!=='string'||data.previewHash!==p.previewHash)throw new HubError('规划输入或模型配置已变化，请重新预览。',409);const result=await generatePlan(p,{key,model,baseUrl});const latest=await getNovelKeyBinding(owner);if(latest.source!==source||latest.revision!==revision)throw new HubError('密钥来源已变化，请重新预览。模型调用可能已计费。',409);return json({...result,previewHash:p.previewHash})}catch(error){return problem(error)}}
