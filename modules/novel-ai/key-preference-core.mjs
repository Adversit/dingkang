/** No credential value is persisted; only an owner-selected reference and revision. */
import { validSourceName } from './connection-sources.mjs';
export const SOURCES=Object.freeze(['NOVEL_OPENAI_API_KEY','OPENAI_CHATGPT']);
export class KeyPreferenceError extends Error { constructor(message,status=400){super(message);this.status=status} }
export function parsePreference(row) {
  if (!row) return {source:SOURCES[0],revision:0};
  if (!validSourceName(row.source) || !Number.isSafeInteger(row.revision) || row.revision<1) throw new KeyPreferenceError('连接配置异常，请重新选择环境变量。',500);
  return {source:row.source,revision:row.revision};
}
export async function readPreference(adapter,owner) { return parsePreference(await adapter.load(owner)); }
export async function selectPreference(adapter,owner,source,expectedRevision,available) {
  if (!validSourceName(source) || !Number.isSafeInteger(expectedRevision) || expectedRevision<0) throw new KeyPreferenceError('环境变量或设置版本无效。');
  if (source!==SOURCES[0] && !available(source)) throw new KeyPreferenceError('所选环境变量未配置可用的 API Key，请在 Sites 设置中检查。',409);
  const old=await readPreference(adapter,owner);
  if(old.revision!==expectedRevision)throw new KeyPreferenceError('设置已发生变化，请刷新后重新选择。',409);
  const changed=await adapter.compareAndSwap(owner,expectedRevision,source,new Date().toISOString());
  if(!changed)throw new KeyPreferenceError('设置已发生变化，请刷新后重新选择。',409);
  return {source,revision:expectedRevision+1};
}

/** A failed test never changes the active connection. Re-testing it preserves its revision. */
export async function testAndSelectPreference(adapter,owner,source,expectedRevision,readSecret,testConnection) {
  if (!validSourceName(source) || !Number.isSafeInteger(expectedRevision) || expectedRevision<0) throw new KeyPreferenceError('环境变量或设置版本无效。');
  const before=await readPreference(adapter,owner);
  if(before.revision!==expectedRevision)throw new KeyPreferenceError('连接设置已变化，请刷新后重试。',409);
  const key=readSecret(source);
  if(!key)throw new KeyPreferenceError('所选环境变量未包含有效格式的 OpenAI API Key，请在 Sites 设置中检查。',422);
  const result=await testConnection(key);
  // A deployment or concurrent settings change must not bind the previous test to a new value.
  if(readSecret(source)!==key)throw new KeyPreferenceError('环境变量已变化，请重新测试连接。',409);
  const after=await readPreference(adapter,owner);
  if(after.revision!==expectedRevision || after.source!==before.source)throw new KeyPreferenceError('连接设置已变化，请刷新后重试。',409);
  if(after.source===source)return {...result,source,revision:after.revision};
  if(!await adapter.compareAndSwap(owner,expectedRevision,source,new Date().toISOString()))throw new KeyPreferenceError('连接设置已变化，请刷新后重试。',409);
  return {...result,source,revision:expectedRevision+1};
}
