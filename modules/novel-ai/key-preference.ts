import { env } from 'cloudflare:workers';
import { database } from '@/lib/hub/server';
import { readPreference, selectPreference, testAndSelectPreference, KeyPreferenceError, type NovelKeySource, type Adapter } from './key-preference-core.mjs';
import { discoverConnectionSources, readConnectionSecret } from './connection-sources.mjs';
import { listProviderModels } from './models-list.mjs';

// Always server-side: never return these values in API responses or log output.
function runtimeBindings():Record<string,unknown> {
  const values={...(env as unknown as Record<string,unknown>)};
  // Compatibility for the documented local setup only. Never enumerate machine secrets.
  if(typeof process!=='undefined')for(const name of ['NOVEL_OPENAI_API_KEY','OPENAI_API_KEY','OPENAI_CHATGPT']){
    if(values[name]===undefined && process.env[name]!==undefined)values[name]=process.env[name];
  }
  return values;
}
function secret(source:NovelKeySource):string{return readConnectionSecret(runtimeBindings(),source)}
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
function assertOfficialProvider(){
    const configured=(env as unknown as Record<string,unknown>).NOVEL_OPENAI_BASE_URL ?? (typeof process!=='undefined'?process.env.NOVEL_OPENAI_BASE_URL:undefined);
    if(typeof configured==='string' && configured.trim()){
      let target:URL;try{target=new URL(configured.trim())}catch{throw new KeyPreferenceError('小说模型密钥仅允许连接 OpenAI 官方 API。',503)}
      if(target.protocol!=='https:' || target.hostname!=='api.openai.com' || target.port || target.username || target.password || target.search || target.hash || !['/v1','/v1/'].includes(target.pathname))throw new KeyPreferenceError('小说模型密钥仅允许连接 OpenAI 官方 API。',503);
    }
}
export async function getNovelKeyBinding(owner:string){
  const preference=await readPreference(adapter(),owner);
  assertOfficialProvider();
  return {...preference,key:secret(preference.source)};
}
export async function resolveNovelKey(owner:string){return (await getNovelKeyBinding(owner)).key}
export async function novelKeyStatus(owner:string){
  const preference=await readPreference(adapter(),owner),environmentVariables=discoverConnectionSources(runtimeBindings());
  const available:Record<string,boolean>=Object.fromEntries(environmentVariables.map(item=>[item.name,true]));
  return {...preference,available,environmentVariables};
}
export async function saveNovelKeyPreference(owner:string,source:unknown,expectedRevision:unknown){return selectPreference(adapter(),owner,source,expectedRevision,key=>!!secret(key))}
export async function testNovelConnection(owner:string,source:unknown,expectedRevision:unknown){
  assertOfficialProvider();
  const result=await testAndSelectPreference(adapter(),owner,source,expectedRevision,secret,key=>listProviderModels(key));
  const {source:selectedSource,revision:preferenceRevision,...list}=result;
  return {...list,connected:true,selectedSource,preferenceRevision,sourceRevision:preferenceRevision,fetchedAt:new Date().toISOString()};
}
