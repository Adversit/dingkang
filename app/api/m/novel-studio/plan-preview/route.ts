import { HubError, json } from '@/lib/hub/server';
import { config, inputFor, problem } from '@/modules/novel-ai/route-support';
import { chooseModel } from '@/modules/novel-ai/model-preference';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { preparePlanPreview } from '@/modules/novel-orchestration/auto-run.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const {owner,input}=await inputFor(req);if(!input||typeof input!=='object'||Array.isArray(input))throw new HubError('请求格式无效。',400);const data=input as Record<string,unknown>;const {source,revision}=await getNovelKeyBinding(owner),binding={source,revision},model=await chooseModel(owner,data.model,revision);const p=await preparePlanPreview(data,model,config('NOVEL_OPENAI_BASE_URL')||'https://api.openai.com/v1',binding);return json({previewHash:p.previewHash,model,messages:p.messages,keyBinding:binding,notice:'规划预览不调用模型；作者应在模型生成后审阅和编辑，计划不会成为正式事实。'})}catch(error){return problem(error)}}
