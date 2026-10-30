import { HubError } from '@/lib/hub/server';
import { archiveFor, config, inputFor, problem } from '@/modules/novel-ai/route-support';
import { chooseModel } from '@/modules/novel-ai/model-preference';
import { getNovelKeyBinding } from '@/modules/novel-ai/key-preference';
import { prepareRun, runPrepared } from '@/modules/novel-orchestration/auto-run.mjs';

export const dynamic='force-dynamic';
export async function POST(req: Request) {
  try {
    const { owner, input }=await inputFor(req);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HubError('请求格式无效。',400);
    const data=input as Record<string, unknown>;
    const baseUrl=config('NOVEL_OPENAI_BASE_URL')||'https://api.openai.com/v1';
    const initial=await getNovelKeyBinding(owner);
    const {key,source,revision}=initial;
    const model=await chooseModel(owner,data.model,revision);
    const binding={source,revision};
    const archive=data.mode==='scene'?await archiveFor(owner):null;
    const {preview,prompts,sceneCount,scenePlans,firstMessages,previewHash}=await prepareRun(data,archive,model,baseUrl,key,binding);
    if(typeof data.previewHash!=='string'||data.previewHash!==previewHash)throw new HubError('写作要求、模型、资料或密钥来源已变化，请重新预览后开始。',409);
    let cancelled=false;
    const encoder=new TextEncoder();
    const stream=new ReadableStream<Uint8Array>({
      async start(controller) {
        const write=(type:string, payload:unknown)=>controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`));
        const heartbeat=setInterval(()=>{if(!cancelled){try{controller.enqueue(encoder.encode(': keepalive\n\n'))}catch{cancelled=true}}},12000);
        try {
          for await (const event of runPrepared({input:data,preview,prompts,sceneCount,scenePlans,firstMessages,previewHash,key,model,baseUrl,loadArchive:()=>archiveFor(owner),checkBinding:async()=>{const next=await getNovelKeyBinding(owner);return next.source===source&&next.revision===revision},isCancelled:()=>cancelled||req.signal.aborted})) {
            if(cancelled||req.signal.aborted) break;
            write(event.type,event.data);
          }
          if(!cancelled)controller.close();
        } catch {
          if(!cancelled){try{write('error',{stage:'stream',error:'连接中断，执行结果未知。',uncertain:true,notice:'不会自动重试；模型可能已产生费用。'});controller.close()}catch{/* receiver closed */}}
        } finally {clearInterval(heartbeat)}
      },
      cancel(){cancelled=true},
    });
    return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff'}});
  } catch(error) {return problem(error)}
}
