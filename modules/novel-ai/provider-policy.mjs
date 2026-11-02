// All settings are chosen from app-owned tasks; client data cannot select a URL,
// disclose a provider response, or increase a model's timeout/arbitrary token cap.
const budgets={book:[8000,110000],plan:[3500,90000],chapter:[8000,150000],prose:[3000,90000],analysis:[3500,90000],longAnalysis:[5500,120000]};
export function providerPolicy(model,task){
 const [tokens,timeoutMs]=budgets[task];const json=['book','plan','analysis','longAnalysis'].includes(task);
 const gpt55=typeof model==='string'&&/^gpt-5\.5(?:-\d{4}-\d{2}-\d{2})?$/.test(model);
 return {timeoutMs,params:{max_completion_tokens:tokens,...(json?{response_format:{type:'json_object'}}:{}),...(json&&gpt55?{reasoning_effort:'low'}:{})}};
}
export function completionText(choice,label,ErrorClass) {
 const fail=(msg)=>{throw new ErrorClass(msg,502)};
 if(!choice)fail(`模型未返回${label}候选（空 choices）。`);
 if(choice.message?.refusal)fail(`模型拒绝生成本次${label}；请调整构思或指令。`);
 if(choice.finish_reason==='length')fail(`模型达到输出额度，${label}遭到截断，未采用不完整内容。可缩短要求或换用支持更长输出的模型。`);
 if(choice.finish_reason==='content_filter')fail(`模型服务过滤了本次${label}，未取得完整内容。`);
 if(choice.finish_reason!=='stop')fail(`模型异常结束，未返回完整${label}。`);
 const t=choice.message?.content;if(typeof t!=='string'||!t.trim())fail(`模型返回空的${label}内容。`);
 return t;
}
