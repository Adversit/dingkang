import { selectModel } from './model-selection.mjs';
import { ContextError } from './context.mjs';
function validateModel(value){if(value===null)return null;if(typeof value!=='string'||!value.trim())throw new ContextError('请选择模型，或选择使用站点默认。',400);return selectModel(value,'')}
export async function readModelPreference(adapter,owner,currentSourceRevision){
  if(!Number.isSafeInteger(currentSourceRevision)||currentSourceRevision<0)throw new ContextError('连接状态不可读取。',500);
  const row=await adapter.load(owner);if(!row)return {model:null,revision:0,sourceRevision:currentSourceRevision,stale:false};
  if(!Number.isSafeInteger(row.revision)||row.revision<1||!Number.isSafeInteger(row.source_revision)||row.source_revision<0)throw new ContextError('模型设置不可读取。',500);
  const model=row.model_id===null?null:validateModel(row.model_id),stale=row.source_revision!==currentSourceRevision;
  return {model:stale?null:model,revision:row.revision,sourceRevision:currentSourceRevision,stale};
}
export async function saveModelPreference(adapter,owner,model,expectedRevision,expectedSourceRevision,currentSourceRevision,now=new Date().toISOString()){
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!Number.isSafeInteger(expectedSourceRevision)||expectedSourceRevision<0)throw new ContextError('模型设置版本无效，请刷新后重试。',400);
  if(expectedSourceRevision!==currentSourceRevision)throw new ContextError('连接已更改，请刷新模型列表后重试。',409);
  const validated=validateModel(model),current=await readModelPreference(adapter,owner,currentSourceRevision);
  if(current.revision!==expectedRevision)throw new ContextError('模型设置已变化，请刷新后重试。',409);
  const ok=await adapter.compareAndSwap(owner,expectedRevision,validated,expectedSourceRevision,now);
  if(!ok)throw new ContextError('模型设置已变化，请刷新后重试。',409);
  return {model:validated,revision:expectedRevision+1,sourceRevision:currentSourceRevision,stale:false};
}
