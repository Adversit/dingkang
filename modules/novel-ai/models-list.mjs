/** Model discovery is metadata only; it never runs a completion or logs a key. */
// Codes and messages are fixed here. Upstream bodies, exceptions and headers are never reflected.
const FAILURES=Object.freeze({
  MODEL_NOT_CONFIGURED:{status:503,category:'configuration',message:'请先连接 OpenAI。'},
  MODEL_AUTH_FAILED:{status:401,category:'provider',message:'连接验证失败，请检查 API Key。'},
  MODEL_ACCESS_DENIED:{status:403,category:'provider',message:'此连接没有读取模型列表的权限。'},
  MODEL_REQUEST_LIMIT:{status:429,category:'provider',message:'OpenAI 暂时限制了请求，请稍后重试或检查账号限额。'},
  MODEL_PROVIDER_ERROR:{status:502,category:'provider',message:'OpenAI 未能返回模型列表，请稍后重试。'},
  MODEL_EMPTY_RESPONSE:{status:502,category:'malformed',message:'模型服务返回空响应，请稍后重试。'},
  MODEL_RESPONSE_TOO_LARGE:{status:502,category:'malformed',message:'模型列表超出处理限制，请稍后重试。'},
  MODEL_RESPONSE_INVALID:{status:502,category:'malformed',message:'模型服务返回格式无效，请稍后重试。'},
  MODEL_REQUEST_TIMEOUT:{status:504,category:'timeout',message:'读取模型列表超时，请重试。'},
  MODEL_NETWORK_ERROR:{status:502,category:'network',message:'站点暂时无法连接 OpenAI，请稍后重试。'},
  MODEL_RESPONSE_READ_ERROR:{status:502,category:'response_read',message:'模型列表传输中断，请重试。'},
  MODEL_RUNTIME_ERROR:{status:502,category:'runtime_api',message:'站点连接服务发生错误，请稍后重试。'},
});
export class ModelListError extends Error {
  constructor(code='MODEL_PROVIDER_ERROR',providerStatus=null){
    const spec=FAILURES[code]||FAILURES.MODEL_PROVIDER_ERROR;
    super(spec.message);this.status=spec.status;this.code=Object.hasOwn(FAILURES,code)?code:'MODEL_PROVIDER_ERROR';this.category=spec.category;
    this.providerStatus=Number.isInteger(providerStatus)&&providerStatus>=100&&providerStatus<=599?providerStatus:null;
  }
}
export function modelListFailure(error){
  if(!(error instanceof ModelListError))return null;
  const spec=FAILURES[error.code];
  return {error:spec.message,code:error.code,category:spec.category,providerStatus:error.providerStatus};
}
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,100}$/;
const bytesLimit=2*1024*1024, maxItems=2500;
/** /models has no capability schema. Exclude recognizable non-writing families only. */
export function isWritingCandidate(id){
  const name=String(id).toLowerCase();
  if(/(?:^|[.:-])(?:dall-e|whisper|tts|sora|text-embedding|text-moderation|omni-moderation|gpt-image|image|audio|video|babbage|davinci)(?:$|[.:-])/.test(name))return false;
  if(/(?:^|[-.:])(?:realtime|audio|transcribe|transcription|tts|embedding|moderation|image|video)(?:$|[-.:])/.test(name))return false;
  return true;
}
export async function listProviderModels(key,{fetchImpl=fetch,timeoutMs=10000}={}){
  if(typeof key!=='string'||!key.trim())throw new ModelListError('MODEL_NOT_CONFIGURED');
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  let providerStatus=null;
  try {
    const r=await fetchImpl('https://api.openai.com/v1/models',{method:'GET',headers:{Authorization:`Bearer ${key}`},redirect:'manual',signal:ctrl.signal});
    providerStatus=r.status;
    // Workers supports manual redirect handling; never forward the credential to a Location target.
    if(r.status>=300&&r.status<400)throw new ModelListError('MODEL_PROVIDER_ERROR',r.status);
    if(!r.ok){if(r.status===401)throw new ModelListError('MODEL_AUTH_FAILED',r.status);if(r.status===403)throw new ModelListError('MODEL_ACCESS_DENIED',r.status);if(r.status===429)throw new ModelListError('MODEL_REQUEST_LIMIT',r.status);throw new ModelListError('MODEL_PROVIDER_ERROR',r.status)}
    if(!r.body)throw new ModelListError('MODEL_EMPTY_RESPONSE',providerStatus);
    const reader=r.body.getReader(),decoder=new TextDecoder();let size=0,raw='';
    try {while(true){const c=await reader.read();if(c.done)break;size+=c.value.byteLength;if(size>bytesLimit){await reader.cancel();throw new ModelListError('MODEL_RESPONSE_TOO_LARGE',providerStatus)}raw+=decoder.decode(c.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
    let data;try{data=JSON.parse(raw)}catch{throw new ModelListError('MODEL_RESPONSE_INVALID',providerStatus)}
    if(!data||data.object!=='list'||!Array.isArray(data.data))throw new ModelListError('MODEL_RESPONSE_INVALID',providerStatus);
    const result=[],seen=new Set();let rejected=0;
    for(const item of data.data){if(!item||item.object!=='model'||typeof item.id!=='string'||!ID.test(item.id)||/^(sk-|sess-)/i.test(item.id)){rejected++;continue}if(seen.has(item.id))continue;seen.add(item.id);if(result.length===maxItems)continue;const owner=typeof item.owned_by==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(item.owned_by)&&!/^(sk-|sess-)/i.test(item.owned_by)?item.owned_by:null;const created=Number.isSafeInteger(item.created)&&item.created>=0?item.created:null;const date=typeof item.shutdown_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(item.shutdown_date)?item.shutdown_date:null;result.push({id:item.id,ownedBy:owner,created,shutdownDate:date})}
    result.sort((a,b)=>a.id.localeCompare(b.id));
    const models=result.map(model=>({...model,writingCandidate:isWritingCandidate(model.id)}));
    const writingModels=models.filter(model=>model.writingCandidate);
    return {models,writingModels,excludedCount:models.length-writingModels.length,truncated:seen.size>maxItems||data.has_more===true,rejected};
  }catch(e){
    if(e instanceof ModelListError)throw e;
    if(ctrl.signal.aborted)throw new ModelListError('MODEL_REQUEST_TIMEOUT',providerStatus);
    // Match in memory only; never log the exception, stack, URL, key or response body.
    const runtimeError=e instanceof Error&&/(?:is not a function|illegal invocation|incompatible receiver|incorrect.*this.*reference|invalid redirect value)/i.test(e.message);
    throw new ModelListError(runtimeError?'MODEL_RUNTIME_ERROR':providerStatus===null?'MODEL_NETWORK_ERROR':'MODEL_RESPONSE_READ_ERROR',providerStatus);
  }finally{clearTimeout(timer)}
}
