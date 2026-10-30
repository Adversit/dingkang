import { HubError, json } from '@/lib/hub/server';
import { archiveFor, config, inputFor, problem } from '@/modules/novel-ai/route-support';
import { selectModel } from '@/modules/novel-ai/model-selection.mjs';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { preparePreview } from '@/modules/novel-orchestration/auto-run.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 try{
  const {owner,input}=await inputFor(req);
  if(!input||typeof input!=='object'||Array.isArray(input))throw new HubError('请求格式无效。',400);
  const data=input as Record<string,unknown>,model=selectModel(data.model,config('NOVEL_OPENAI_MODEL'));
  const {source,revision}=await getNovelKeyBinding(owner),binding={source,revision};
  const archive=data.mode==='scene'?await archiveFor(owner):null;
  const p=await preparePreview(data,archive,model,config('NOVEL_OPENAI_BASE_URL')||'https://api.openai.com/v1',binding);
  return json({previewHash:p.previewHash,mode:data.mode,model,keyBinding:binding,messages:p.firstMessages,analysisTemplates:p.analysisTemplates,included:p.preview.included,excluded:p.preview.excluded,temporalProjection:p.preview.temporalProjection,sceneCount:p.sceneCount,notice:'第一幕显示真实起草消息；抽取和检查的候选正文是占位符，运行后各阶段会展示实际消息。后续幕依赖未确认草稿，实际消息在运行中展示。预览不调用模型。'});
 }catch(error){return problem(error)}
}
