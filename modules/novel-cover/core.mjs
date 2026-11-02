export const MAX_BYTES=6*1024*1024;
export class CoverError extends Error {constructor(message,status=400){super(message);this.status=status}}
export function isImageModel(id){return typeof id==='string'&&/^gpt-image-[1-9]\d*(?:\.\d+)?(?:-[a-z0-9]+)*$/.test(id)&&id.length<=100&&!/(?:-edit|-inpaint|-preview-only)$/.test(id)}
export function projectId(v){if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(v))throw new CoverError('请选择有效作品。');return v}
export async function coverKey(owner,id){if(!owner)throw new CoverError('请先登录。',401);projectId(id);const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([owner,id])));return 'novel-covers/v1/'+Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
const invalid=()=>{throw new CoverError('请上传有效的 PNG 或 JPEG 图片。',415)};
export function inspectCover(bytes,type) {
  if(!(bytes instanceof Uint8Array)||bytes.length<12)invalid();
  if(bytes.length>MAX_BYTES)throw new CoverError('封面最大为 6 MB。',413);
  const n=bytes.length,v=new DataView(bytes.buffer,bytes.byteOffset,n),int=(p)=>v.getUint32(p),short=p=>v.getUint16(p);
  let mime,w=0,h=0;
  if(n>=45&&int(0)===0x89504e47&&int(4)===0x0d0a1a0a){
    mime='image/png';let pos=8,data=false,ended=false;
    while(pos+12<=n){const len=int(pos),kind=int(pos+4);if(len>n-pos-12)invalid();if(pos===8){if(kind!==0x49484452||len!==13)invalid();w=int(pos+8);h=int(pos+12)}
      if(kind===0x49444154&&len>0)data=true;
      if(kind===0x49454e44){ended=len===0&&pos+12===n;break}pos+=len+12}
    if(!data||!ended)invalid();
  }else if(n>20&&short(0)===0xffd8&&short(n-2)===0xffd9){
    mime='image/jpeg';let pos=2,scan=false;
    while(pos<n-2){if(bytes[pos]!==255)invalid();while(bytes[pos]===255)pos++;const mark=bytes[pos++];if(pos+2>n)invalid();const len=short(pos);if(len<2||pos+len>n-2)invalid();
      if([0xc0,0xc1,0xc2].includes(mark)){if(len<8)invalid();h=short(pos+3);w=short(pos+5)}
      if(mark===0xda){scan=pos+len<n-2;break}pos+=len}
    if(!scan)invalid();
  }else invalid();
  if(type?.split(';')[0]?.trim().toLowerCase()!==mime)invalid();
  if(!w||!h||w>8192||h>8192||w*h>24000000)throw new CoverError('封面图像尺寸无效或过大，最多 2400 万像素。',422);
  return {mime,width:w,height:h,size:n};
}
export function condition(token){
  if(token==='none')return new Headers({'If-None-Match':'*'});
  if(typeof token!=='string'||!/^"[a-zA-Z0-9._-]{1,120}"$/.test(token))throw new CoverError('请先刷新封面版本。',428);
  return new Headers({'If-Match':token});
}
export async function saveCover(store,key,bytes,mime,token){const details=inspectCover(bytes,mime);const obj=await store.put(key,bytes,{onlyIf:condition(token),httpMetadata:{contentType:details.mime},customMetadata:{width:String(details.width),height:String(details.height)}});if(!obj)throw new CoverError('另一个窗口已修改这本书的封面，请刷新后再决定是否替换。',409);return {etag:obj.httpEtag,...details}}
export async function generateCover({key,model,prompt,models,fetchImpl=fetch,timeoutMs=210000}){
  if(!key)throw new CoverError('请先连接站点模型。',503);
  if(!isImageModel(model)||!models.some(m=>m.id===model))throw new CoverError('请从当前连接的图像模型列表中选择。',422);
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1800)throw new CoverError('封面描述应为 1 至 1800 字。',422);
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetchImpl('https://api.openai.com/v1/images/generations',{method:'POST',redirect:'manual',signal:c.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model,prompt:prompt.trim(),size:'1024x1536',n:1,output_format:'jpeg',quality:'medium'})});
    if(!r.ok)throw new CoverError(r.status===429?'图像请求受限或额度不足。':'图像服务未能生成封面（HTTP '+r.status+'）。',502);
    if(!r.body)throw new CoverError('图像服务返回空响应。',502);
    const reader=r.body.getReader(),decoder=new TextDecoder();let raw='',count=0;
    try{for(;;){const p=await reader.read();if(p.done)break;count+=p.value.byteLength;if(count>MAX_BYTES*4/3+81920){await reader.cancel();throw new CoverError('返回图像超过封面大小限制。',502)}raw+=decoder.decode(p.value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}
    const data=JSON.parse(raw),b64=data?.data?.[0]?.b64_json;if(typeof b64!=='string'||b64.length>MAX_BYTES*4/3+4)throw new CoverError('没有收到可使用的封面图片。',502);const binary=atob(b64),bytes=Uint8Array.from(binary,x=>x.charCodeAt(0));inspectCover(bytes,'image/jpeg');return bytes;
  }catch(e){if(e instanceof CoverError)throw e;throw new CoverError(c.signal.aborted?'等待图像超时，请先检查用量，不会自动重试。':'图像服务未能返回有效封面，不会自动重试。',502)}
  finally{clearTimeout(t)}
}
