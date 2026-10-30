import { json } from '@/lib/hub/server';
import { compileContext } from '@/modules/novel-ai/context.mjs';
import { archiveFor,config,inputFor,problem } from '@/modules/novel-ai/route-support';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{const {owner,input}=await inputFor(req);const archive=await archiveFor(owner);return json(await compileContext(input,archive,config('NOVEL_OPENAI_MODEL'),config('NOVEL_OPENAI_BASE_URL')||'https://api.openai.com/v1'))}catch(error){return problem(error)}}
