import { json,HubError } from '@/lib/hub/server';
import { compileContext } from '@/modules/novel-ai/context.mjs';
import { archiveFor,config,inputFor,problem } from '@/modules/novel-ai/route-support';
import { selectModel } from '@/modules/novel-ai/model-selection.mjs';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const {owner,input}=await inputFor(req);if(!input||typeof input!=='object'||Array.isArray(input))throw new HubError('请求格式错误。',400);const archive=await archiveFor(owner),model=selectModel((input as Record<string,unknown>).model,config('NOVEL_OPENAI_MODEL')),binding=await getNovelKeyBinding(owner);return json(await compileContext(input,archive,model,config('NOVEL_OPENAI_BASE_URL')||'https://api.openai.com/v1',{source:binding.source,revision:binding.revision}))}catch(error){return problem(error)}}
