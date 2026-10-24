import upstream from '../data/aihot-sources.json';
import discovered from '../data/aihot-discovered-sources.json';

export const AIHOT_REVISION = 'e47bf83fdab9a33af2d9a1cb425385b179d7e141';
export const AIHOT_CONFIG_URL = `https://github.com/KKKKhazix/AIHOT/blob/${AIHOT_REVISION}/industry/sources.json`;
export type CatalogSource = {id:string;name:string;url:string;kind:string;category:string;quality:number;official:number;origin:string;upstreamId:string;owner:string;tags:string[];evidence?:string;originalUrl?:string};
export const AIHOT_SOURCES:CatalogSource[] = upstream.sources.map(s=>({
 id:'aihot-'+s.id,name:s.name,url:s.config.feedUrl,kind:'rss',
 category:s.id==='rss-github-ai'?'软件工程':s.id==='rss-latent-space'?'Agent 工程':'AI 产品',
 quality:s.tier==='T1'?29:25,official:s.tags.includes('官方')||s.id==='rss-bair'?1:0,
 origin:'AIHOT 公开配置',upstreamId:s.id,owner:s.owner_entity_id||'',tags:s.tags,
 evidence:AIHOT_CONFIG_URL,
}));
export const DISCOVERED_SOURCES = discovered as CatalogSource[];
export const SOURCE_CATALOG = [...AIHOT_SOURCES,...DISCOVERED_SOURCES];
const canonical=(value:string)=>{const u=new URL(value);u.hash='';u.pathname=u.pathname.replace(/\/+$/,'');return u.toString()};
const catalogByUrl=new Map(SOURCE_CATALOG.map(s=>[canonical(s.url),s]));
export function sourceCatalogEntry(url:string){try{return catalogByUrl.get(canonical(url))}catch{return undefined}}
export const CATALOG_HOSTS=[...new Set(SOURCE_CATALOG.map(s=>new URL(s.url).hostname))];
