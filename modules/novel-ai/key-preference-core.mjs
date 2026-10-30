/** No credential value is persisted; only an owner-selected reference and revision. */
export const SOURCES=Object.freeze(['NOVEL_OPENAI_API_KEY','OPENAI_CHATGPT']);
export class KeyPreferenceError extends Error { constructor(message,status=400){super(message);this.status=status} }
export function parsePreference(row) {
  if (!row) return {source:SOURCES[0],revision:0};
  if (!SOURCES.includes(row.source) || !Number.isSafeInteger(row.revision) || row.revision<1) throw new KeyPreferenceError('密钥引用配置异常，已停止使用。',500);
  return {source:row.source,revision:row.revision};
}
export async function readPreference(adapter,owner) { return parsePreference(await adapter.load(owner)); }
export async function selectPreference(adapter,owner,source,expectedRevision,available) {
  if (!SOURCES.includes(source) || !Number.isSafeInteger(expectedRevision) || expectedRevision<0) throw new KeyPreferenceError('密钥引用或版本无效。');
  if (source!==SOURCES[0] && !available(source)) throw new KeyPreferenceError('所选 Secret 未配置，请先在站点设置中保存。',409);
  const old=await readPreference(adapter,owner);
  if(old.revision!==expectedRevision)throw new KeyPreferenceError('设置已发生变化，请刷新后重新选择。',409);
  const changed=await adapter.compareAndSwap(owner,expectedRevision,source,new Date().toISOString());
  if(!changed)throw new KeyPreferenceError('设置已发生变化，请刷新后重新选择。',409);
  return {source,revision:expectedRevision+1};
}
