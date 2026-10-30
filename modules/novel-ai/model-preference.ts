import { database } from '@/lib/hub/server';
import { config } from './route-support';
import { getNovelKeyBinding } from './key-preference';
import { readModelPreference, saveModelPreference, type ModelPreferenceAdapter } from './model-preference-core.mjs';
import { selectModel } from './model-selection.mjs';
import { ContextError } from './context.mjs';
function adapter():ModelPreferenceAdapter{
 const db=database();return {
  load:async owner=>await db.prepare('SELECT model_id, source_revision, revision FROM novel_model_preferences WHERE owner_id = ?').bind(owner).first<{model_id:string|null;source_revision:number;revision:number}>(),
  compareAndSwap:async(owner,revision,model,sourceRevision,at)=>{const r=revision===0?await db.prepare('INSERT INTO novel_model_preferences (owner_id,model_id,source_revision,revision,updated_at) VALUES (?,?,?,1,?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,model,sourceRevision,at).run():await db.prepare('UPDATE novel_model_preferences SET model_id=?, source_revision=?, revision=revision+1, updated_at=? WHERE owner_id=? AND revision=?').bind(model,sourceRevision,at,owner,revision).run();return r.meta.changes===1}
 };
}
export async function getModelPreference(owner:string){
 const binding=await getNovelKeyBinding(owner),current=await readModelPreference(adapter(),owner,binding.revision),raw=config('NOVEL_OPENAI_MODEL');let fallbackModel:string|null=null;
 try{if(raw)fallbackModel=selectModel(raw,'')}catch{/* Do not expose a malformed runtime value. */}
 return {...current,fallbackModel};
}
export async function chooseModel(owner:string,requested:unknown,expectedSourceRevision?:number){const pref=await getModelPreference(owner);if(expectedSourceRevision!==undefined&&pref.sourceRevision!==expectedSourceRevision)throw new ContextError('连接已更改，请重新选择模型。',409);if(pref.stale && !(typeof requested==='string'&&requested.trim()))throw new ContextError('连接已更改，请先选择模型或重新设置默认模型。',409);return selectModel(requested,pref.model??pref.fallbackModel)}
export async function setModelPreference(owner:string,model:unknown,revision:unknown,sourceRevision:unknown){const binding=await getNovelKeyBinding(owner);await saveModelPreference(adapter(),owner,model,revision,sourceRevision,binding.revision);const current=await getModelPreference(owner);if(current.stale || current.sourceRevision!==sourceRevision)throw new ContextError('连接已更改，所选模型已失效，请刷新后重新选择。',409);return current}
