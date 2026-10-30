/** Model discovery is metadata only; it never runs a completion or logs a key. */
export class ModelListError extends Error { constructor(message,status=502){super(message);this.status=status} }
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,100}$/;
const bytesLimit=2*1024*1024, maxItems=2500;
export async function listProviderModels(key,{fetchImpl=fetch,timeoutMs=10000}={}){
  if(typeof key!=='string'||!key.trim())throw new ModelListError('请先连接 OpenAI。',503);
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try {
    const r=await fetchImpl('https://api.openai.com/v1/models',{method:'GET',headers:{Authorization:`Bearer ${key}`},redirect:'error',signal:ctrl.signal});
    if(!r.ok){if(r.status===401)throw new ModelListError('连接验证失败，请检查密钥。',401);if(r.status===403)throw new ModelListError('此连接没有读取模型列表的权限。',403);if(r.status===429)throw new ModelListError('模型列表请求过于频繁，请稍后重试。',429);throw new ModelListError('无法读取模型列表，请稍后重试。',502)}
    if(!r.body)throw new ModelListError('模型服务返回空响应。');
    const reader=r.body.getReader(),decoder=new TextDecoder();let size=0,raw='';
    try {while(true){const c=await reader.read();if(c.done)break;size+=c.value.byteLength;if(size>bytesLimit){await reader.cancel();throw new ModelListError('模型列表超出处理限制，请稍后重试。')}raw+=decoder.decode(c.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
    let data;try{data=JSON.parse(raw)}catch{throw new ModelListError('模型服务返回格式无效。')}
    if(!data||data.object!=='list'||!Array.isArray(data.data))throw new ModelListError('模型服务返回格式无效。');
    const result=[],seen=new Set();let rejected=0;
    for(const item of data.data){if(!item||item.object!=='model'||typeof item.id!=='string'||!ID.test(item.id)||/^(sk-|sess-)/i.test(item.id)){rejected++;continue}if(seen.has(item.id))continue;seen.add(item.id);if(result.length===maxItems)continue;const owner=typeof item.owned_by==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(item.owned_by)?item.owned_by:null;const created=Number.isSafeInteger(item.created)&&item.created>=0?item.created:null;const date=typeof item.shutdown_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(item.shutdown_date)?item.shutdown_date:null;result.push({id:item.id,ownedBy:owner,created,shutdownDate:date})}
    result.sort((a,b)=>a.id.localeCompare(b.id));
    return {models:result,truncated:seen.size>maxItems||data.has_more===true,rejected};
  }catch(e){if(e instanceof ModelListError)throw e;if(ctrl.signal.aborted)throw new ModelListError('读取模型列表超时，请重试。',504);throw new ModelListError('无法连接模型服务，请稍后重试。',502)}finally{clearTimeout(timer)}
}
