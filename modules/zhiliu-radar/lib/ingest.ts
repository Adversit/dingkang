import { XMLParser } from 'fast-xml-parser';
import { CATALOG_HOSTS } from './source-catalog';
import { type Entry,type Source,normalizeUrl,stripHtml,validDate } from './domain';

// Explicit public-provider allowlist: an arbitrary input URL never becomes a general-purpose fetch proxy.
export const ALLOWED_HOSTS = [...CATALOG_HOSTS,'microsoft.com','mistral.ai','www.mistral.ai','technologyreview.com','www.technologyreview.com','www.langchain.com','langchain.com','openai.com','www.openai.com','blog.langchain.com','github.blog','github.com','api.github.com','blog.cloudflare.com','blog.google','deepmind.google','research.google','blogs.nvidia.com','huggingface.co','www.anthropic.com','anthropic.com','boards-api.greenhouse.io','boards.greenhouse.io','jobs.lever.co','api.lever.co','www.ycombinator.com','www.indiehackers.com','paulgraham.com','www.paulgraham.com','developer.chrome.com','engineering.fb.com','netflixtechblog.com'];
export function assertPublicUrl(raw:string,allowed?:string[]) {
 const u=new URL(raw);const host=u.hostname.toLowerCase().replace(/\.$/,'');
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port&&u.port!=='443'&&u.port!=='80')throw new Error('只允许标准端口、不含凭据的 HTTP(S) URL');
 if(host.includes(':')||/^\d+(?:\.\d+)*$/.test(host)||!host.includes('.')||/(^|\.)(localhost|local|internal|test|invalid|example|home|lan)$/.test(host)||host==='metadata.google.internal')throw new Error('拒绝本机、内网、IP 字面量或保留地址');
 if(allowed&&!allowed.includes(host))throw new Error(`域名 ${host} 尚未获准采集。请在偏好设置查看支持的信源域名。`);
 return u;
}
export async function fetchBounded(raw:string,headers:Record<string,string>={},maxBytes=5_000_000) {
 let url=raw;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 try {
  for(let hop=0;hop<5;hop++) {
   assertPublicUrl(url,ALLOWED_HOSTS);
   const res=await fetch(url,{headers:{'user-agent':'ZhiliuRadar/1.0 (+personal-feed-reader)','accept':'application/rss+xml, application/atom+xml, application/json, text/html;q=0.5',...headers},redirect:'manual',signal:controller.signal});
   if([301,302,303,307,308].includes(res.status)){const location=res.headers.get('location');if(!location)throw new Error('重定向缺少地址');await res.body?.cancel();url=new URL(location,url).toString();headers={};continue}
   if(res.status===304)return {text:'',res,url};
   if(!res.ok)throw new Error(`HTTP ${res.status}${res.status===429?'：信源限流，请稍后重试':''}`);
   if(Number(res.headers.get('content-length')||0)>maxBytes)throw new Error('信源响应超过 5 MB 限制');
   const reader=res.body?.getReader();if(!reader)throw new Error('信源返回空响应');let size=0;let text='';const decoder=new TextDecoder();
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new Error('信源响应超过 5 MB 限制')}text+=decoder.decode(value,{stream:true})}text+=decoder.decode();return {text,res,url};
  }throw new Error('重定向次数超过限制');
 }catch(e){if(controller.signal.aborted)throw new Error('采集超时（12 秒），可以重试');throw e}finally{clearTimeout(timeout)}
}
const arr=(x:any):any[]=>x==null?[]:Array.isArray(x)?x:[x];
const val=(x:any):string=>typeof x==='object'&&x?String(x['#text']||''):String(x||'');
function safeEntry(e:Entry,base:string):Entry|null{try{const u=assertPublicUrl(new URL(e.url,base).toString());if(!e.title)return null;return {...e,title:stripHtml(e.title,300),url:u.toString(),excerpt:stripHtml(e.excerpt,550)}}catch{return null}}
export function parseFeed(text:string,kind:string,base:string):Entry[] {
 if(kind==='json') {
  const doc=JSON.parse(text);const records=Array.isArray(doc)?doc:doc.items||doc.jobs||doc.results||[];
  if(!Array.isArray(records))throw new Error('JSON 应为数组或包含 items / jobs / results 数组');
  return records.slice(0,40).map((x:any)=>{
   const pub=x.date_published||x.published_at||x.published||x.pubDate;const body=x.summary||x.description||x.body||x.content_text||x.content_html||x.content||'';
   const isJob=!!x.absolute_url||!!x.hostedUrl;
   return safeEntry({title:x.title||x.name||x.text||x.tag_name||'',url:x.url||x.html_url||x.absolute_url||x.hostedUrl||x.external_url||'',excerpt:body,published:validDate(pub),rawPublished:pub?String(pub):null,scope:body?'公开 JSON 摘要（最多 550 字）':'仅标题',...(isJob?{job:{company:x.company?.name||x.company||'未知',city:x.location?.name||x.categories?.location||'未知',position:x.title||x.text||'未知',type:'未知',deadline:'未知',applyUrl:x.absolute_url||x.hostedUrl||'',status:'未知，需打开官方页面确认'}}:{})},base);
  }).filter(Boolean) as Entry[];
 }
 if(kind==='url') {
  const meta=(key:string)=>{const tags=text.match(/<meta\b[^>]*>/gi)||[];for(const tag of tags){if(new RegExp(`(?:name|property)=["']${key}["']`,'i').test(tag))return tag.match(/content=["']([^"']*)["']/i)?.[1]||''}return ''};
  const title=meta('og:title')||text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
  const description=meta('description')||meta('og:description');const pub=meta('article:published_time');
  const result=safeEntry({title,url:base,excerpt:description,published:validDate(pub),rawPublished:pub||null,scope:description?'网页 meta 摘要，未抓取全文':'仅网页标题'},base);return result?[result]:[];
 }
 if(/<!DOCTYPE|<!ENTITY/i.test(text.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g,'')))throw new Error('不处理包含 DTD 或自定义实体的 XML');
 const doc=new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false,trimValues:true}).parse(text);
 const records=arr(doc.rss?.channel?.item||doc.feed?.entry||doc['rdf:RDF']?.item);
 if(!records.length)throw new Error('没有找到 RSS/Atom 条目，请检查是否为订阅地址');
 return records.slice(0,40).map(x=>{
  const link=typeof x.link==='string'?x.link:arr(x.link).find(l=>!l['@_rel']||l['@_rel']==='alternate')?.['@_href'];
  const pub=val(x.pubDate||x.published||x['dc:date']);const updated=val(x.updated);const body=val(x.description||x.summary||x['content:encoded']||x.content);
  return safeEntry({title:val(x.title),url:link||val(x.guid)||val(x.id),excerpt:body,published:validDate(pub),rawPublished:pub||null,scope:body?`订阅摘要（最多 550 字）${!pub&&updated?`；源更新于 ${updated}，首发时间未知`:''}`:'仅标题'},base);
 }).filter(Boolean) as Entry[];
}
export async function collectSource(source:Source,conditional=true) {
 const headers:Record<string,string>={};if(conditional&&source.etag)headers['If-None-Match']=source.etag;if(conditional&&source.modified)headers['If-Modified-Since']=source.modified;
 let attempts=0;
 while(attempts<2){attempts++;try{const {text,res,url}=await fetchBounded(source.url,headers);return {entries:res.status===304?[]:parseFeed(text,source.kind,url),unchanged:res.status===304,etag:res.headers.get('etag'),modified:res.headers.get('last-modified'),attempts,finalUrl:url}}catch(e){const msg=e instanceof Error?e.message:'采集失败';if(attempts<2&&/HTTP 50[234]|fetch failed|network/i.test(msg))continue;throw new Error(`${msg}（尝试 ${attempts} 次）`)}}
 throw new Error('采集失败');
}
export async function fingerprint(title:string,excerpt:string,url:string) {const value=excerpt.length>=80?title.trim().toLowerCase()+'\n'+excerpt.trim().toLowerCase():normalizeUrl(url);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
