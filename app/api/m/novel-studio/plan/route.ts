import { HubError, json } from '@/lib/hub/server';
import { config, inputFor, problem } from '@/modules/novel-ai/route-support';
import { openTextRun } from '@/modules/novel-ai/text-run';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { generatePlan, preparePlanPreview } from '@/modules/novel-orchestration/auto-run.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 try{
  const {owner,input}=await inputFor(req);if(!input||typeof input!=='object'||Array.isArray(input))throw new HubError('请求格式无效。',400);
  const data=input as Record<string,unknown>,baseUrl=config('NOVEL_OPENAI_BASE_URL')||'https://api.openai.com/v1';
  const b=await getNovelKeyBinding(owner),run=await openTextRun(owner,data.model,b,baseUrl,async()=>!req.signal.aborted);
  const p=await preparePlanPreview(data,run.model,baseUrl,{source:b.source,revision:b.revision});
  if(typeof data.previewHash!=='string'||data.previewHash!==p.previewHash)throw new HubError('规划输入或模型配置已变化，请重新预览。',409);
  const result=await run.run(model=>generatePlan({...p,model},{key:b.key,model,baseUrl}));
  if(!await run.valid())throw new HubError('密钥来源已变化，请重新预览。模型调用可能已计费。',409);
  return json({...result,previewHash:p.previewHash,requestedModel:run.model,modelFallback:run.notice});
 }catch(error){return problem(error)}
}
