import { sourceCatalogEntry } from './source-catalog';
export const CATEGORIES = ['AI 产品','Agent 工程','软件工程','北京招聘','一人公司'] as const;
export type Category = typeof CATEGORIES[number];
export const FEEDBACK = ['read','saved','useful','irrelevant','duplicate','error'] as const;
export const FEEDBACK_LABELS: Record<string,string> = {read:'已读',saved:'收藏',useful:'有用',irrelevant:'无关',duplicate:'重复',error:'错误'};
export const DEFAULT_PREFS = {weights: {'AI 产品':3,'Agent 工程':5,'软件工程':3,'北京招聘':4,'一人公司':2}, keywords:'agent,评测,多智能体,observability,LangGraph,北京,实习,校招',minutes:10};
export type Prefs = {weights: Record<string,number>; keywords:string; minutes:number};
export const DEFAULT_SOURCES = [
 {id:'openai',name:'OpenAI News',url:'https://openai.com/news/rss.xml',kind:'rss',category:'AI 产品',quality:30,official:1},
 {id:'langchain',name:'LangChain Blog',url:'https://www.langchain.com/blog/rss.xml',kind:'rss',category:'Agent 工程',quality:29,official:1},
 {id:'github',name:'GitHub Changelog',url:'https://github.blog/changelog/feed/',kind:'rss',category:'软件工程',quality:28,official:1},
 {id:'cloudflare',name:'Cloudflare Blog',url:'https://blog.cloudflare.com/rss/',kind:'rss',category:'软件工程',quality:28,official:1},
];
export type Source = {id:string;name:string;url:string;kind:string;category:string;quality:number;official:number;enabled:number;etag?:string;modified?:string;last_success?:string;last_error?:string;last_attempt?:string;failures:number};
export type Entry = {title:string;url:string;excerpt:string;published:string|null;rawPublished:string|null;scope:string;job?:Record<string,string>};
export type Item = {id:string;source_id:string;raw_url:string;canonical_url:string;title:string;excerpt:string;published_at:string|null;ingested_at:string;scope:string;category:string;job:string|null;model_summary?:string;model_title?:string;model_status?:string;model_name?:string;manual:number;relation:string;sources:Source[]};
export type Event = {id:string;title:string;category:string;manual_title:string|null;manual_summary:string|null;locked:number;created_at:string;updated_at:string;items:Item[];feedback:string[];score:number;parts:Record<string,number>;reason:string;latest:string|null;sourceCount:number;summary:string;summaryMode:string;displayTitle:string;officialSource?:Source};
export function shanghaiDate(date:Date|string = new Date()) {return new Date(new Date(date).getTime()+8*3600_000).toISOString().slice(0,10)}
export function dateRange(day:string) {if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('日期格式应为 YYYY-MM-DD');const start=new Date(day+'T00:00:00+08:00');if(Number.isNaN(+start)||shanghaiDate(start)!==day)throw new Error('日期无效');return [start.toISOString(),new Date(+start+86400_000).toISOString()]}
export function normalizeUrl(value:string,base?:string) {
 const u=new URL(value,base);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('只支持不含凭据的 HTTP(S) 链接');
 u.hash='';u.hostname=u.hostname.toLowerCase();for(const key of [...u.searchParams.keys()])if(/^(utm_.*|fbclid|gclid|mc_cid|mc_eid|ref_src|ref_url|igshid)$/i.test(key))u.searchParams.delete(key);
 u.searchParams.sort();if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,'');return u.toString();
}
export function stripHtml(value:unknown,limit=550) {
 const s=typeof value==='string'?value:'';
 const entities:Record<string,string>={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'\"',apos:"'",'#39':"'"};
 return s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return c>0&&c<=0x10ffff?String.fromCodePoint(c):''}).replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g,(_,n:string)=>entities[n]||'').replace(/\s+/g,' ').trim().slice(0,limit);
}
export function validDate(input:unknown) {if(typeof input!=='string'||!input.trim())return null;const d=new Date(input);return Number.isFinite(+d)&&+d<=Date.now()+3600000?d.toISOString():null}
export function classify(title:string,excerpt:string,fallback:string) {
 const s=title+' '+excerpt;if(/招聘|校招|实习|recruit|hiring|careers|job opening/i.test(s))return '北京招聘';
 if(/agent|langgraph|langchain|multi.agent|智能体|observability|tool.call|checkpoint|rag\b|evaluation|evals/i.test(s))return 'Agent 工程';
 if(/indie|bootstrapp|solopreneur|一人公司|独立开发/i.test(s))return '一人公司';return CATEGORIES.includes(fallback as Category)?fallback:'软件工程';
}
function tokens(s:string){const latin=s.toLowerCase().match(/[a-z0-9][a-z0-9.+-]{1,}/g)||[];const cn=s.match(/[\u4e00-\u9fff]+/g)||[];return new Set([...latin.filter(x=>!['the','and','for','with','how','from','new','introducing','announcing','release','update','this','your','now','are','you','our','can','using'].includes(x)),...cn.flatMap(x=>Array.from({length:Math.max(0,x.length-1)},(_,i)=>x.slice(i,i+2)))])}
export function sameEvent(a:string,b:string) {
 const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g,'');if(norm(a)===norm(b)&&norm(a).length>16)return true;
 const versions=(s:string)=>(s.toLowerCase().match(/\b(?:v?\d+\.\d+(?:\.\d+)?|gpt-?\d+(?:\.\d+)?|claude-?[\w-]*\d[\w.-]*)\b/g)||[]).sort().join('|');
 if(versions(a)!==versions(b)&&(versions(a)||versions(b)))return false;
 const A=tokens(a),B=tokens(b),over=[...A].filter(x=>B.has(x)).length;return over>=4&&over/Math.max(A.size,B.size)>=0.83;
}
export function rankEvent(event:Event,prefs:Prefs,feedbackByCategory:Record<string,number>,now=Date.now()):Event {
 const items=event.items;const latest=items.map(x=>x.published_at).filter(Boolean).sort().at(-1)||null;
 const independent=new Map<string,Source>();items.flatMap(x=>x.sources).forEach(s=>{let host='';try{host=new URL(s.url).hostname.replace(/^www\./,'')}catch{};if(host==='github.com'){host=new URL(s.url).pathname.split('/')[1]||host;if(host==='langchain-ai')host='langchain';if(host==='anthropics')host='anthropic'}else if(/(^|\.)(langchain.com)$/.test(host))host='langchain';else if(/(^|\.)(google|google.com)$/.test(host))host='google';else if(host==='github.blog')host='github';else if(host==='openai.com')host='openai';else if(/(^|\.)anthropic.com$/.test(host))host='anthropic';independent.set(sourceCatalogEntry(s.url)?.owner||host,s)});
 const quality=Math.max(0,...[...independent.values()].map(s=>s.quality));const keys=prefs.keywords.split(/[,，\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,30);
 const hay=(event.manual_title||event.title)+' '+items.map(i=>i.title+' '+i.excerpt).join(' ');const matched=keys.filter(x=>hay.toLowerCase().includes(x));
 const relevance=Math.min(30,(prefs.weights[event.category]??3)*4+Math.min(10,matched.length*3));const hours=latest?Math.max(0,(now-new Date(latest).getTime())/3600000):Infinity;
 const recency=Number.isFinite(hours)?Math.round(20*Math.pow(0.5,hours/72)):0;const novelty=event.feedback.includes('read')?2:event.feedback.includes('duplicate')?0:10;
 const corroboration=Math.min(10,Math.max(0,independent.size-1)*3);const learned=Math.max(-10,Math.min(10,feedbackByCategory[event.category]||0));
 const personal=event.feedback.includes('irrelevant')?-25:event.feedback.includes('error')?-35:event.feedback.includes('useful')?8:0;
 const parts={相关性:relevance,来源质量:quality,时效性:recency,未读增量:novelty,独立来源:corroboration,反馈调整:learned+personal};
 const first=items.find(i=>i.model_status==='success')||items[0];const summary=event.manual_summary||first?.model_summary||first?.excerpt||'信源没有提供摘要，请打开原文核实内容。';
 return {...event,latest,sourceCount:independent.size,parts,score:Math.max(0,Math.min(100,Object.values(parts).reduce((a,b)=>a+b,0))),summary,summaryMode:event.manual_summary?'人工修订':first?.model_status==='success'?'模型摘要':'原始摘要 · 规则精选',displayTitle:event.manual_title||first?.model_title||event.title,officialSource:[...independent.values()].find(s=>s.official),reason:`${matched.length?`匹配「${matched.slice(0,2).join('、')}」；`:''}${event.category}关注权重 ${prefs.weights[event.category]??3}/5${quality>=28?'，优先一手信源':''}${learned?`；历史反馈${learned>0?'提升':'降低'}此类推荐`:''}。`};
}
export function digestMarkdown(date:string,events:Event[]) {
 let s=`# 知流 · ${date} 每日简报\n\n> 按北京时间的来源发布时间选取；抓取时间不代表发布时间。\n\n`;
 if(!events.length)return s+'今天尚无已核实发布时间的新内容。可以查看历史日期，或稍后再次采集。\n';
 for(const [index,e] of events.entries()) {s+=`## ${index+1}. ${e.displayTitle.replace(/[\r\n]/g,' ')}\n\n${e.summary}\n\n**为什么值得读：** ${e.reason}\n\n*${e.summaryMode} · ${e.category} · ${e.score} 分*\n\n`;for(const i of e.items)s+=`- [${i.sources.map(x=>x.name).join(' / ').replace(/[\[\]]/g,'')}](${i.canonical_url.replace(/\)/g,'%29')}) · ${i.published_at?shanghaiDate(i.published_at):'发布时间未知'} · ${i.scope}\n`;s+='\n'}return s;
}
