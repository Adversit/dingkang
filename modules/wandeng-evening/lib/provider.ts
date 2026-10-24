export type ProviderConfig = { key?: string; model?: string };
export function providerStatus(c:ProviderConfig){return {configured:!!(c.key&&c.model),provider:'OpenAI',model:c.model||null,status:c.key&&c.model?'configured_unverified':'not_connected'};}
export async function* streamReply(c:ProviderConfig, input:unknown[], instructions:string, signal:AbortSignal, fetcher:typeof fetch=fetch) {
  if(!c.key||!c.model) throw new Error('MODEL_NOT_CONNECTED');
  let response:Response|undefined;
  for(let attempt=0;attempt<2;attempt++){
    response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${c.key}`},body:JSON.stringify({model:c.model,instructions,input,stream:true,store:false,max_output_tokens:1000})});
    if(response.ok) break;
    if(attempt===0&&(response.status===429||response.status>=500)){
      await response.body?.cancel();
      await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,700);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('CANCELED'));},{once:true});});
      continue;
    }
    throw new Error(response.status===429?'RATE_LIMITED':response.status===401?'PROVIDER_AUTH':'PROVIDER_ERROR');
  }
  if(!response?.body) throw new Error('PROVIDER_EMPTY');
  const reader=response.body.getReader();const decoder=new TextDecoder();let pending='';let chars=0;let completed=false;
  try { while(true){const {done,value}=await reader.read();if(done) break;pending=(pending+decoder.decode(value,{stream:true})).replace(/\r\n/g,'\n');
    let split:number;while((split=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,split);pending=pending.slice(split+2);for(const line of block.split('\n')){
      if(!line.startsWith('data: '))continue; const raw=line.slice(6);if(raw==='[DONE]')continue;
      let event:any;try{event=JSON.parse(raw);}catch{throw new Error('PROVIDER_PROTOCOL');}
      if(event.type==='response.output_text.delta'){const delta=String(event.delta||'');chars+=delta.length;if(chars>6000)throw new Error('OUTPUT_LIMIT');yield {type:'delta',delta};}
      if(event.type==='response.completed'){completed=true;yield {type:'usage',model:event.response?.model||c.model,usage:event.response?.usage||null};}
      if(['error','response.failed','response.incomplete'].includes(event.type))throw new Error(event.type==='response.incomplete'?'OUTPUT_LIMIT':'PROVIDER_ERROR');
    }}
  } if(!completed)throw new Error('STREAM_INTERRUPTED'); } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
