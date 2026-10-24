import {moduleById} from './catalog';
import {convertLegacyGameImport} from './legacy-import';

export type BackupEntry = {moduleId:string;values:Record<string,string>};
export type BackupPreview = BackupEntry & {mergedValues:Record<string,string>;expectedRevision:number};
type StoredState = {values:Record<string,string>;revision:number};
const isObject = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);
const bytes = (value:string) => new TextEncoder().encode(value).byteLength;

/** Match the shared state endpoint before presenting an import for confirmation. */
export function validateBackupValues(value:unknown):Record<string,string> {
  if(!isObject(value)) throw Error('备份内容格式不正确。');
  const entries=Object.entries(value);
  if(entries.length>200) throw Error('每个应用最多导入 200 项存档。');
  for(const [key,item] of entries){
    if(!key||key.length>200||['__proto__','constructor','prototype'].includes(key)) throw Error('备份含不支持的存档键。');
    if(typeof item!=='string') throw Error('备份中的存档内容必须保留原始字符串。');
    if(bytes(item)>512*1024) throw Error('单项存档超过 512 KiB，请保留原文件。');
  }
  const values=Object.fromEntries(entries) as Record<string,string>;
  if(bytes(JSON.stringify(values))>2*1024*1024) throw Error('此应用合并后的存档超过 2 MiB，请保留原文件。');
  return values;
}

export function parseBackup(data:unknown,selectedGame?:string):{entries:BackupEntry[];warnings:string[]} {
  if(!isObject(data)) throw Error('这份文件没有可识别的存档内容。');
  let entries:unknown[],warnings:string[]=[];
  if('format' in data&&['dingkang-hub-state-backup','dingkang-hub-backup'].includes(String(data.format))){
    if(data.version!==1||!Array.isArray(data.modules)) throw Error('这份备份版本或内容格式不受支持。');
    entries=data.modules;
  }else if(typeof data.moduleId==='string'&&'values' in data){
    // A tagged current backup already identifies its module. The legacy game
    // picker only disambiguates untagged old files and never changes this target.
    entries=[data];
  }else{
    const converted=convertLegacyGameImport(data,selectedGame);
    entries=[converted];warnings=converted.warnings;
  }
  if(!entries.length) throw Error('这份备份没有可导入的存档。');
  const seen=new Set<string>();
  const normalized=entries.map(item=>{
    if(!isObject(item)||typeof item.moduleId!=='string') throw Error('备份中的应用记录格式不正确。');
    const id=item.moduleId;
    if(id!=='hub-preferences'&&!moduleById(id)) throw Error('备份包含未识别的应用，暂时不能导入。');
    if(seen.has(id)) throw Error('备份包含同一应用的多份存档，请先保留要导入的一份。');
    seen.add(id);
    return {moduleId:id,values:validateBackupValues(item.values)};
  });
  return {entries:normalized,warnings};
}

/** Freeze the destination revision and merged values at preview time. */
export async function prepareBackupPreview(entries:BackupEntry[],loadState:(id:string)=>Promise<StoredState>):Promise<BackupPreview[]> {
  return Promise.all(entries.map(async item=>{
    const current=await loadState(item.moduleId);
    if(!Number.isSafeInteger(current.revision)||current.revision<0) throw Error('无法确认当前存档版本，请重新连接后再试。');
    const previous=validateBackupValues(current.values);
    return {...item,mergedValues:validateBackupValues({...previous,...item.values}),expectedRevision:current.revision};
  }));
}
