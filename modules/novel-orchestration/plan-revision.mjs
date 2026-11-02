import { BOOK_TEMPLATE, normalizeOutline } from './book-outline.mjs';

/** A revision is planning material, never canon or input for the chapter writer.
 * The source is returned to the author's browser: these checks validate its
 * shape/round, not cryptographic provenance or the truth of its contents.
 */
export function preparePlanRevision(raw, ErrorClass=TypeError) {
  if(raw===undefined || raw===null)return null;
  const fail=message=>new ErrorClass(message);
  const validObject=x=>x!==null && typeof x==='object' && !Array.isArray(x);
  const string=(value,max,message)=>{
    if(typeof value!=='string'||!value.trim()||value.length>max)throw fail(message);
    return value.trim();
  };
  if(!validObject(raw))throw fail('请选择已返回的全书大纲再修订。');
  const s=raw.source;
  if(!validObject(s)||s.role!=='book-planner'||s.template!==BOOK_TEMPLATE||
     !Number.isSafeInteger(s.round)||s.round<1||s.round>=Number.MAX_SAFE_INTEGER||
     typeof s.model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,100}$/.test(s.model)||
     /^(sk-|sess-)/i.test(s.model)||typeof s.previewHash!=='string'||!/^[0-9a-f]{64}$/.test(s.previewHash))
    throw fail('前轮大纲的模型、轮次或预览标识不完整，请从规划结果发起修订。');
  const previousOutline=normalizeOutline(raw.previousOutline,fail);
  if(!Array.isArray(raw.previousChapters)||raw.previousChapters.length<1||raw.previousChapters.length>5)
    throw fail('前轮需有 1 至 5 张开篇章卡。');
  const previousChapters=raw.previousChapters.map(c=>{
    if(!validObject(c))throw fail('前轮章卡格式错误。');
    const title=string(c.title,100,'前轮章卡缺少有效标题。');
    const goal=string(c.goal,1500,'前轮章卡缺少有效目标。');
    if(title.length+goal.length>1500)throw fail('前轮章卡超过 1500 字符。');
    return {title,goal};
  });
  const out={round:s.round+1,feedback:string(raw.feedback,2000,'请填写 1 至 2000 字的修订意见。'),
             previousOutline,previousChapters,previousModel:s.model};
  if(new TextEncoder().encode(JSON.stringify(out)).byteLength>48*1024)
    throw fail('前轮修订资料过长，请缩短大纲或章卡后重试。');
  return out;
}
