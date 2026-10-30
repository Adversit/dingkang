import { initialState, applyCommand, NovelError } from './domain.mjs';
// D1 limits a single row to 2,000,000 bytes; leave room for owner and metadata.
const MAX_STATE_BYTES=1800000;
const ID=/^[A-Za-z0-9_-]{1,80}$/;
const byteLength=s=>new TextEncoder().encode(s).byteLength;
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'}
async function hash(value){let bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}
function parsed(row){if(!row)return {version:0,envelope:{state:initialState(),receipts:{}}};let data;try{data=JSON.parse(row.state_json)}catch{throw new NovelError('存档损坏；已停止操作。',500)}if(!data||!data.state||!data.receipts||data.state.schema!==1)throw new NovelError('存档格式无效；已停止操作。',500);return {version:row.version,envelope:data}}
// Derived status is computed from current author draft + latest immutable revision; it is never persisted as canon.
function present(state){let copy=structuredClone(state);for(const p of copy.projects){const current=(sceneId,revisionId,evidence)=>{const s=p.scenes.find(x=>x.id===sceneId),r=s?.revisions.at(-1);return !!(r&&r.id===revisionId&&s.title===r.title&&s.draft===r.body&&r.body.includes(evidence))};for(const f of p.facts)f.sourceStatus=current(f.sceneId,f.revisionId,f.evidence)?'current':'stale';for(const d of p.dependencies||[]){d.sourceStatus=current(d.sourceSceneId,d.sourceRevisionId,d.sourceEvidence)?'current':'stale';d.targetStatus=current(d.targetSceneId,d.targetRevisionId,d.targetEvidence)?'current':'stale';d.impacted=!d.retiredAt&&(d.sourceStatus==='stale'||d.targetStatus==='stale')}}return copy}
export async function readArchive(adapter,owner){let row=await adapter.load(owner),v=parsed(row);return {version:v.version,state:present(v.envelope.state),storageMode:adapter.mode||'legacy',maxStateBytes:adapter.maxStateBytes||MAX_STATE_BYTES}}
/** The adapter must perform one atomic compare-and-swap of the entire serialized envelope. */
export async function executeCommand(adapter,owner,request,now=new Date().toISOString()){
  if(!request||typeof request!=='object'||!ID.test(request.commandId??'')||!Number.isSafeInteger(request.expectedVersion)||request.expectedVersion<0||!request.command||typeof request.command!=='object'||Array.isArray(request.command))throw new NovelError('命令、幂等标识或版本无效。');
  let digest=await hash(canonical({expectedVersion:request.expectedVersion,command:request.command}));
  let current=parsed(await adapter.load(owner)),prior=Object.hasOwn(current.envelope.receipts,request.commandId)?current.envelope.receipts[request.commandId]:undefined;
  if(prior){if(prior.hash!==digest)throw new NovelError('幂等标识已用于不同命令。',409);return {version:current.version,state:present(current.envelope.state),storageMode:adapter.mode||'legacy',maxStateBytes:adapter.maxStateBytes||MAX_STATE_BYTES,receipt:{...prior.receipt,committedVersion:prior.version,replayed:true}}}
  if(current.version!==request.expectedVersion)throw new NovelError('数据已在其他窗口更新，请重新加载。',409);
  let result=applyCommand(current.envelope.state,request.command,now),version=current.version+1;
  let envelope={state:result.state,receipts:{...current.envelope.receipts,[request.commandId]:{hash:digest,version,receipt:result.receipt}}};let serialized=JSON.stringify(envelope);
  const limit=adapter.maxStateBytes||MAX_STATE_BYTES;
  if(byteLength(serialized)>limit)throw new NovelError(`作品库已超过约 ${(limit/1000000).toFixed(1)} MB 上限，请先导出备份；本次操作未写入。`,413);
  const ok=await adapter.compareAndSwap(owner,current.version,serialized,now);
  if(!ok){current=parsed(await adapter.load(owner));prior=Object.hasOwn(current.envelope.receipts,request.commandId)?current.envelope.receipts[request.commandId]:undefined;if(prior&&prior.hash===digest)return {version:current.version,state:present(current.envelope.state),storageMode:adapter.mode||'legacy',maxStateBytes:adapter.maxStateBytes||MAX_STATE_BYTES,receipt:{...prior.receipt,committedVersion:prior.version,replayed:true}};throw new NovelError('数据已在其他窗口更新，请重新加载。',409)}
  return {version,state:present(result.state),storageMode:adapter.mode||'legacy',maxStateBytes:adapter.maxStateBytes||MAX_STATE_BYTES,receipt:{...result.receipt,committedVersion:version,replayed:false}};
}
