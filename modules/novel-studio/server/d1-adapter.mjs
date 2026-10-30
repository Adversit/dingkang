import { initialState, NovelError } from './domain.mjs';
export const LEGACY_MAX_BYTES=1800000;
export const EXPANDED_MAX_BYTES=6000000;
const CHUNK_BYTES=90000;
const encoder=new TextEncoder();
async function sha(bytes){const d=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(d)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
function fromBase64(s){try{let binary=atob(s),out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out}catch{throw new NovelError('扩容档案分片损坏，已停止读取。',500)}}
async function encode(state){let bytes=encoder.encode(state);if(bytes.length>EXPANDED_MAX_BYTES)throw new NovelError('作品库超过扩容存储 6 MB 上限，未写入。',413);let chunks=[];for(let i=0;i<bytes.length;i+=CHUNK_BYTES)chunks.push(toBase64(bytes.subarray(i,i+CHUNK_BYTES)));return {chunks,hash:await sha(bytes)}}
async function decode(rows,head){if(!Number.isSafeInteger(head.chunk_count)||head.chunk_count<1||head.chunk_count>Math.ceil(EXPANDED_MAX_BYTES/CHUNK_BYTES)||rows.length!==head.chunk_count)throw new NovelError('扩容档案分片缺失，已停止读取。',500);let parts=rows.map((r,i)=>{if(r.chunk_index!==i||typeof r.data!=='string'||r.data.length>Math.ceil(CHUNK_BYTES/3)*4)throw new NovelError('扩容档案分片顺序或大小无效。',500);return fromBase64(r.data)});let size=parts.reduce((n,p)=>n+p.length,0);if(size>EXPANDED_MAX_BYTES)throw new NovelError('扩容档案超过支持的容量。',500);let bytes=new Uint8Array(size),pos=0;for(let p of parts){bytes.set(p,pos);pos+=p.length}if(await sha(bytes)!==head.state_hash)throw new NovelError('扩容档案校验失败，已停止读取。',500);try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw new NovelError('扩容档案编码损坏。',500)}}
/** Every load uses one D1 transaction to avoid mixing a head with another write's chunks. */
export function d1ArchiveAdapter(db){
  const adapter={mode:'legacy',maxStateBytes:LEGACY_MAX_BYTES,
    async load(owner){
      let [h,c,l]=await db.batch([
        db.prepare('SELECT version, chunk_count, state_hash FROM novel_archive_heads WHERE owner_id = ?').bind(owner),
        db.prepare('SELECT chunk_index, data FROM novel_archive_chunks WHERE owner_id = ? ORDER BY chunk_index').bind(owner),
        db.prepare('SELECT version, state_json FROM novel_canon_states WHERE owner_id = ?').bind(owner),
      ]);
      const head=h.results?.[0],legacy=l.results?.[0];
      if(!head){adapter.mode='legacy';adapter.maxStateBytes=LEGACY_MAX_BYTES;return legacy||null}
      adapter.mode='expanded';adapter.maxStateBytes=EXPANDED_MAX_BYTES;
      return {version:head.version,state_json:await decode(c.results||[],head)};
    },
    async compareAndSwap(owner,version,state,now){
      if(adapter.mode==='legacy'){
        try{const result=version===0
          ?await db.prepare('INSERT INTO novel_canon_states (owner_id, state_json, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,state,now).run()
          :await db.prepare('UPDATE novel_canon_states SET state_json = ?, version = version + 1, updated_at = ? WHERE owner_id = ? AND version = ?').bind(state,now,owner,version).run();return result.meta.changes===1;
        }catch(error){const h=await db.prepare('SELECT version FROM novel_archive_heads WHERE owner_id = ?').bind(owner).first();if(h)return false;throw error}
      }
      const encoded=await encode(state),token=crypto.randomUUID(),next=version+1;
      let statements=[db.prepare('UPDATE novel_archive_heads SET version = ?, write_token = ?, chunk_count = ?, state_hash = ?, updated_at = ? WHERE owner_id = ? AND version = ?').bind(next,token,encoded.chunks.length,encoded.hash,now,owner,version),
        db.prepare('DELETE FROM novel_archive_chunks WHERE owner_id = ? AND EXISTS (SELECT 1 FROM novel_archive_heads WHERE owner_id = ? AND version = ? AND write_token = ?)').bind(owner,owner,next,token)];
      encoded.chunks.forEach((part,index)=>statements.push(db.prepare('INSERT INTO novel_archive_chunks (owner_id, chunk_index, data) SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM novel_archive_heads WHERE owner_id = ? AND version = ? AND write_token = ?)').bind(owner,index,part,owner,next,token)));
      const results=await db.batch(statements);return results[0].meta.changes===1;
    },
  };return adapter;
}
// Both guards are required before copying data: old deployed workers must fail closed.
const GUARDS=[
  ['novel_legacy_read_only_after_upgrade_update', "CREATE TRIGGER novel_legacy_read_only_after_upgrade_update BEFORE UPDATE ON novel_canon_states WHEN EXISTS (SELECT 1 FROM novel_archive_heads WHERE owner_id = OLD.owner_id) BEGIN SELECT RAISE(ABORT, 'novel archive migrated; legacy is read-only'); END"],
  ['novel_legacy_read_only_after_upgrade_insert', "CREATE TRIGGER novel_legacy_read_only_after_upgrade_insert BEFORE INSERT ON novel_canon_states WHEN EXISTS (SELECT 1 FROM novel_archive_heads WHERE owner_id = NEW.owner_id) BEGIN SELECT RAISE(ABORT, 'novel archive migrated; legacy is read-only'); END"],
];
const normalizeSQL=s=>s.toLowerCase().replace(/[`"\[\]]/g,'').replace(/\s+/g,'').replace(/;$/, '');
async function verifiedGuards(db){
  // SQL is returned only for this internal comparison; never returned to the browser.
  let [result]=await db.batch([db.prepare("SELECT name, tbl_name, sql FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'novel_canon_states' AND name IN (?, ?)").bind(GUARDS[0][0],GUARDS[1][0])]);
  let found=result.results||[];if(found.length!==GUARDS.length)throw new NovelError('旧档案写入保护未就绪，已停止扩容。',503);
  return GUARDS.map(([name,expected])=>{let row=found.find(x=>x.name===name);if(!row||row.tbl_name!=='novel_canon_states'||typeof row.sql!=='string'||normalizeSQL(row.sql)!==normalizeSQL(expected))throw new NovelError('旧档案写入保护校验失败，已停止扩容。',503);return row.sql});
}
/** User-authorized explicit copy to expanded storage; legacy row remains read-only and intact. */
export async function migrateToExpanded(db,owner,expectedVersion,now=new Date().toISOString()){
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw new NovelError('请先重新读取档案。',422);
  const adapter=d1ArchiveAdapter(db),old=await adapter.load(owner);if(adapter.mode==='expanded')throw new NovelError('档案已扩容，请重新读取。',409);
  const actual=old?.version??0;if(actual!==expectedVersion)throw new NovelError('旧档案已发生变化，请重新读取。',409);
  const state=old?.state_json??JSON.stringify({state:initialState(),receipts:{}});
  // Never freeze the only usable copy if the source cannot be read by the existing archive.
  let envelope;try{envelope=JSON.parse(state)}catch{throw new NovelError('旧档案损坏，已停止扩容。',500)}
  if(!envelope||!envelope.receipts||envelope.state?.schema!==1||!Array.isArray(envelope.state.projects)||!Array.isArray(envelope.state.imports)||!envelope.state.projects.every(p=>p&&Array.isArray(p.scenes)&&Array.isArray(p.facts)&&p.scenes.every(s=>s&&Array.isArray(s.revisions))))throw new NovelError('旧档案格式无效，已停止扩容。',500);
  const guards=await verifiedGuards(db);
  const encoded=await encode(state),token=crypto.randomUUID();
  const check=old?'EXISTS (SELECT 1 FROM novel_canon_states WHERE owner_id = ? AND version = ? AND state_json = ?)':'NOT EXISTS (SELECT 1 FROM novel_canon_states WHERE owner_id = ?)';
  const binds=old?[owner,expectedVersion,state]:[owner];
  const guardsStillExist="(SELECT count(*) FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'novel_canon_states' AND ((name = ? AND sql = ?) OR (name = ? AND sql = ?))) = 2";
  const sql=`INSERT INTO novel_archive_heads (owner_id,version,write_token,chunk_count,state_hash,updated_at,legacy_version) SELECT ?,?,?,?,?,?,? WHERE ${check} AND ${guardsStillExist} ON CONFLICT(owner_id) DO NOTHING`;
  let statements=[db.prepare(sql).bind(owner,expectedVersion,token,encoded.chunks.length,encoded.hash,now,expectedVersion,...binds,GUARDS[0][0],guards[0],GUARDS[1][0],guards[1])];
  encoded.chunks.forEach((part,index)=>statements.push(db.prepare('INSERT INTO novel_archive_chunks (owner_id,chunk_index,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM novel_archive_heads WHERE owner_id = ? AND version = ? AND write_token = ?)').bind(owner,index,part,owner,expectedVersion,token)));
  const results=await db.batch(statements);if(results[0].meta.changes!==1)throw new NovelError('档案已变化或已扩容，请重新读取。',409);
  return {version:expectedVersion};
}
