import { listProviderModels, ModelListError } from './models-list.mjs';

const unavailable = Symbol('provider-declined-this-model');
const reasons = {model_not_found:'所选模型不存在或无权使用',model_access:'当前连接不能使用所选模型',endpoint_incompatible:'所选模型不支持当前文字接口'};
const priorityId = /^gpt-5\.5(?:-(?:\d{4}-\d{2}-\d{2}|chat-latest))?$/;
const probeLimit = 3;
const completedProbeWithoutText = Symbol('completed-probe-without-text');

async function boundedJson(response, limit) {
  if(!response.body)return null;
  const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,body='';
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;
      if((bytes+=value.byteLength)>limit){await reader.cancel();return null}
      body+=decoder.decode(value,{stream:true});
    }
    return JSON.parse(body+decoder.decode());
  }catch{return null}finally{reader.releaseLock()}
}

function providerReason(e,status,model) {
  if(!e||typeof e!=='object'||Array.isArray(e)||![400,403,404,410].includes(status))return null;
  const code=e.code, param=e.param, m=typeof e.message==='string'?e.message.slice(0,2000).toLowerCase():'';
  if(param!=null&&param!=='model')return null;
  if(code==='model_not_found'||code==='model_deprecated')return 'model_not_found';
  if(code==='model_permission_denied'||code==='model_access_denied')return 'model_access';
  // Scope ambiguous provider codes to an explicit rejection of this model/endpoint.
  const named=typeof model==='string'&&m.includes(model.toLowerCase());
  if(status===403 && (named||param==='model') && /(?:no access to|not (?:have|permitted|authorized|allowed)|does not have access|do not have access|not available (?:to|for) (?:you|this|your))/.test(m))return 'model_access';
  if(status===400 && (code==='unsupported_model' || (
    /(?:chat\/completions|chat completions|not a chat model)/.test(m) &&
    /(?:not (?:a chat model|compatible with|supported (?:in|on|with|by|at|for)|available (?:in|on|for|at))|does not support (?:the )?(?:chat|this endpoint)|only (?:works|supports|supported) (?:with|the|in))/.test(m)
  )))return 'endpoint_incompatible';
  return null;
}
export async function providerModelError(response,model,ErrorClass=Error){
  const status=response.status;
  const data=[400,403,404,410].includes(status)?await boundedJson(response,16*1024):null;
  const reason=providerReason(data?.error,status,model);
  const diagnostic=reason?reasons[reason]:status===401?'模型服务拒绝凭据，请检查 API Key':status===429?'模型请求受限或额度不足，未自动切换模型':'模型服务请求失败';
  const error=new ErrorClass(diagnostic+'（HTTP '+status+'）。',502);
  if(reason)Object.defineProperty(error,unavailable,{value:{model,reason}});
  return error;
}

function serviceBase(raw){
  let u;try{u=new URL(raw||'https://api.openai.com/v1')}catch{return null}
  const h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.startsWith('[')||/^\d+\.\d+\.\d+\.\d+$/.test(h))return null;
  return u.toString().replace(/\/$/,'');
}
function candidates(result,current) {
  const names=[...new Set(result.writingModels.map(m=>m.id))].filter(id=>priorityId.test(id)&&id!==current);
  const dated=names.filter(id=>/^gpt-5\.5-\d/.test(id)).sort((a,b)=>b.localeCompare(a));
  return [names.includes('gpt-5.5')?'gpt-5.5':null,dated.shift(),names.includes('gpt-5.5-chat-latest')?'gpt-5.5-chat-latest':null,...dated].filter(Boolean).slice(0,probeLimit);
}
async function probe(id,{key,base,fetchImpl,ErrorClass}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetchImpl(base+'/chat/completions',{method:'POST',redirect:'manual',signal:controller.signal,headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({model:id,max_completion_tokens:64,...(id==='gpt-5.5-chat-latest'?{}:{reasoning_effort:'none'}),messages:[{role:'user',content:'Reply OK.'}]})});
    if(!response.ok)throw await providerModelError(response,id,ErrorClass);
    const data=await boundedJson(response,32*1024),choice=data?.choices?.[0];
    if(choice?.finish_reason!=='stop'||choice.message?.refusal||typeof choice.message?.content!=='string'||!choice.message.content.trim()){
      const e=new ErrorClass('GPT‑5.5 探测未返回完整文字。',502);
      // A known, completed probe with no usable text can be skipped. Network,
      // malformed provider envelopes and timeouts remain ambiguous: stop there.
      if(['stop','length','content_filter'].includes(choice?.finish_reason))e[completedProbeWithoutText]=true;
      throw e;
    }
  }catch(e){
    if(e instanceof ErrorClass && !controller.signal.aborted) {
      // Never surface network exception text when Error itself is the constructor.
      if(e[unavailable]||e[completedProbeWithoutText]||Object.hasOwn(e,'status')||ErrorClass!==Error)throw e;
    }
    throw new ErrorClass(controller.signal.aborted?'GPT‑5.5 探测超时，已停止。':'GPT‑5.5 探测未确认成功，已停止。',502);
  }finally{clearTimeout(timer)}
}

/** One request/run only. No process-wide cache or sharing of user keys or discovered access. */
export function createTextFallback({model,key,baseUrl,fetchImpl=fetch,checkBinding=async()=>true,onSwitch=async()=>{},ErrorClass=Error}) {
  const base=serviceBase(baseUrl);
  let current=model,info=null,list=null,used=new Set(),recoveryError=null;
  const bound=async Ctor=>{if(!await checkBinding())throw new Ctor('连接或密钥来源已更改，请重新预览；已停止后续模型调用。',409)};
  return {
    get currentModel(){return current},get switchInfo(){return info},
    async run(invoke){
      if(recoveryError)throw recoveryError;
      await bound(ErrorClass);
      try{return await invoke(current)}catch(original){
        const marker=original?.[unavailable];
        if(!marker||marker.model!==current||!base||!key)throw original;
        const Ctor=ErrorClass===Error && original.constructor!==Error?original.constructor:ErrorClass;
        used.add(current);
        try{
          await bound(Ctor);
          if(!list) {
            // Never send a custom provider's credential to OpenAI for discovery.
            let found;
            try{found=await listProviderModels(key,{fetchImpl:(_url,init)=>fetchImpl(base+'/models',init)})}
            catch(e){throw new Ctor('所选模型不可用。'+(e instanceof ModelListError?e.message:'未能读取当前连接的模型清单。'),e instanceof ModelListError?e.status:502)}
            list=candidates(found,current);
          }
          for(const id of list){
            if(used.has(id))continue;
            used.add(id);
            await bound(Ctor);
            try{await probe(id,{key,base,fetchImpl,ErrorClass:Ctor})}
            catch(e){if(e?.[unavailable]?.model===id||e?.[completedProbeWithoutText])continue;throw e}
            await bound(Ctor);
            let result;
            try{result=await invoke(id)}
            catch(e){if(e?.[unavailable]?.model===id||e?.[completedProbeWithoutText])continue;throw e}
            await bound(Ctor);
            current=id;
            info=Object.freeze({requestedModel:model,selectedModel:id,reason:marker.reason});
            await onSwitch(info);
            return result;
          }
          throw new Ctor('所选模型不可用；当前连接未找到通过实测的 GPT‑5.5 文字模型。',502);
        }catch(e){recoveryError=e;throw e}
      }
    },
  };
}
