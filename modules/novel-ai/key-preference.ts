import { env } from 'cloudflare:workers';
import { database } from '@/lib/hub/server';
import { readPreference, selectPreference, KeyPreferenceError, type NovelKeySource, type Adapter } from './key-preference-core.mjs';

// Always server-side: never return these values in API responses or log output.
function secret(source:NovelKeySource):string {
  const raw=(env as unknown as Record<string,unknown>)[source] ?? (typeof process!=='undefined' ? process.env[source] : undefined);
  return typeof raw==='string' ? raw.trim() : '';
}
function adapter():Adapter {
  const db=database();
  return {
    load:async owner=>await db.prepare('SELECT source, revision FROM novel_model_secret_preferences WHERE owner_id = ?').bind(owner).first<{source:string;revision:number}>(),
    compareAndSwap:async (owner,revision,source,at)=>{
      const r=revision===0
        ? await db.prepare('INSERT INTO novel_model_secret_preferences (owner_id,source,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,source,at).run()
        : await db.prepare('UPDATE novel_model_secret_preferences SET source=?,revision=revision+1,updated_at=? WHERE owner_id=? AND revision=?').bind(source,at,owner,revision).run();
      return r.meta.changes===1;
    }
  };
}
export async function getNovelKeyBinding(owner:string){
  const preference=await readPreference(adapter(),owner);
  {
    const configured=(env as unknown as Record<string,unknown>).NOVEL_OPENAI_BASE_URL ?? (typeof process!=='undefined'?process.env.NOVEL_OPENAI_BASE_URL:undefined);
    if(typeof configured==='string' && configured.trim()){
      let target:URL;try{target=new URL(configured.trim())}catch{throw new KeyPreferenceError('小说模型密钥仅允许连接 OpenAI 官方 API。',503)}
      if(target.protocol!=='https:' || target.hostname!=='api.openai.com' || target.port || target.username || target.password || target.search || target.hash || !['/v1','/v1/'].includes(target.pathname))throw new KeyPreferenceError('小说模型密钥仅允许连接 OpenAI 官方 API。',503);
    }
  }
  return {...preference,key:secret(preference.source)};
}
export async function resolveNovelKey(owner:string){return (await getNovelKeyBinding(owner)).key}
export async function novelKeyStatus(owner:string){const preference=await readPreference(adapter(),owner);return {...preference,available:{NOVEL_OPENAI_API_KEY:!!secret('NOVEL_OPENAI_API_KEY'),OPENAI_CHATGPT:!!secret('OPENAI_CHATGPT')}}}
export async function saveNovelKeyPreference(owner:string,source:unknown,expectedRevision:unknown){return selectPreference(adapter(),owner,source,expectedRevision,key=>!!secret(key))}
