import { ContextError } from './context.mjs';

// Model IDs are data, not URLs or credentials. Actual availability is decided by
// the provider for the selected project; no model is claimed to be available.
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,100}$/;
export function selectModel(requested, defaultModel) {
  if (requested !== undefined && requested !== null && typeof requested !== 'string') {
    throw new ContextError('模型名称格式无效。', 400);
  }
  const chosen = (typeof requested === 'string' ? requested.trim() : '') ||
    (typeof defaultModel === 'string' ? defaultModel.trim() : '');
  if (!chosen) throw new ContextError('未选择模型，站点也未配置默认模型。', 503);
  if (!MODEL_ID.test(chosen) || /^(?:sk-|sess-)/i.test(chosen)) {
    throw new ContextError('模型名称格式无效，请填写 OpenAI 模型 ID。', 400);
  }
  return chosen;
}
