import { createTextFallback } from './fallback-service.mjs';
import { ContextError } from './context.mjs';
import { getNovelKeyBinding } from './key-preference';
import { chooseModelSnapshot, rememberProbedModel } from './model-preference';

type Switch={requestedModel:string;selectedModel:string;reason:string};
export type SwitchNotice=Switch&{defaultUpdated:boolean};
type Binding=Awaited<ReturnType<typeof getNovelKeyBinding>>;

/** One session per authenticated run. No shared model, key or manuscript cache. */
export async function openTextRun(owner:string,requested:unknown,binding:Binding,baseUrl:string,
  checkCurrent:()=>Promise<boolean>=async()=>true,onSwitch?:(value:SwitchNotice)=>void){
 const {model,preference}=await chooseModelSnapshot(owner,requested,binding.revision);
 let notice:SwitchNotice|null=null, expectedPreference=preference,previousModel=model;
 const valid=async()=>{
   const active=await getNovelKeyBinding(owner);
   return active.source===binding.source&&active.revision===binding.revision&&active.key===binding.key&&await checkCurrent();
 };
 const session=createTextFallback({model,key:binding.key,baseUrl,ErrorClass:ContextError,checkBinding:valid,onSwitch:async(value:Switch)=>{
   if(!await valid())throw new ContextError('作品或模型连接已更改，请重新预览。',409);
   let defaultUpdated=false;
   try{defaultUpdated=await rememberProbedModel(owner,expectedPreference,previousModel,value.selectedModel);
     if(defaultUpdated){expectedPreference={...expectedPreference,model:value.selectedModel,revision:expectedPreference.revision+1,stale:false};previousModel=value.selectedModel}
   }catch{/* A preference write cannot discard paid-for prose. */}
   notice={...value,defaultUpdated};onSwitch?.(notice);
 }});
 return {model, valid, get notice(){return notice},get currentModel(){return session.currentModel},run:<T>(fn:(model:string)=>Promise<T>)=>session.run(fn) as Promise<T>};
}
