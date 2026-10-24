import { MIGRATION_TABLES, type MigrationTable } from './migration-manifest';

export const MAX_MIGRATION_BYTES = 2 * 1024 * 1024;
export const MAX_MIGRATION_ROWS = 100;
type Value = string | number | null;
type Row = Record<string, Value>;
export type MigrationEnvironment = { DB?: D1Database; HUB_MIGRATION_IMPORT_TOKEN?: unknown };
class MigrationError extends Error {
  status: number;
  constructor(code: string, status = 400) { super(code); this.status = status; }
}
const encode = new TextEncoder();
const quote = (name: string) => `"${name}"`; // Every identifier comes exclusively from the static manifest.
function response(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff'}});
}

export async function importTokenMatches(provided: unknown, expected: unknown): Promise<boolean> {
  if (typeof expected !== 'string' || expected.length < 32 || expected.length > 4096 ||
      typeof provided !== 'string' || provided.length < 32 || provided.length > 4096) return false;
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encode.encode(provided)),
    crypto.subtle.digest('SHA-256', encode.encode(expected)),
  ]);
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean };
  if (typeof subtle.timingSafeEqual === 'function') return subtle.timingSafeEqual(actualHash, expectedHash);
  const key = await crypto.subtle.importKey('raw', expectedHash, {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
  const signature = await crypto.subtle.sign('HMAC', key, expectedHash);
  return crypto.subtle.verify('HMAC', key, signature, actualHash);
}

async function readPayload(req: Request): Promise<unknown> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new MigrationError('json_required',415);
  const declared = req.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_MIGRATION_BYTES)) throw new MigrationError('migration_payload_too_large',413);
  if (!req.body) throw new MigrationError('json_required');
  const reader = req.body.getReader(); const decoder = new TextDecoder('utf-8',{fatal:true});
  let bytes = 0, raw = '';
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_MIGRATION_BYTES) { await reader.cancel(); throw new MigrationError('migration_payload_too_large',413); }
      raw += decoder.decode(chunk.value,{stream:true});
    }
    raw += decoder.decode();
  } catch (error) {
    if (error instanceof MigrationError) throw error;
    throw new MigrationError('invalid_json');
  } finally { reader.releaseLock(); }
  try { return JSON.parse(raw); } catch { throw new MigrationError('invalid_json'); }
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function keyOf(row: Row, table: MigrationTable) { return JSON.stringify(table.primaryKey.map(name => row[name])); }
function sameRow(a: Row, b: Row, table: MigrationTable) { return table.columns.every(column => a[column.name] === b[column.name]); }
const EMPTY_WORKSPACE_TABLE = 'ai_dev_collaboration_workbench__workspaces';
function validatedRow(input: unknown, table: MigrationTable): Row {
  if (!record(input) || Object.keys(input).length !== table.columns.length || table.columns.some(column => !Object.hasOwn(input,column.name))) throw new MigrationError('columns_must_match_source_schema');
  const row: Row = {};
  for (const column of table.columns) {
    const cell = input[column.name];
    if (cell === null) { if (column.notNull) throw new MigrationError('required_column_null'); row[column.name] = null; }
    else if (column.type === 'text' && typeof cell === 'string') row[column.name] = cell;
    else if (column.type === 'integer' && typeof cell === 'number' && Number.isSafeInteger(cell)) row[column.name] = cell;
    else throw new MigrationError('invalid_column_type');
  }
  return row;
}
function workspaceProjectCount(row: Row) {
  try { const data: unknown = JSON.parse(String(row.data)); return record(data) && Array.isArray(data.projects) ? data.projects.length : -1; }
  catch { return -1; }
}

export function validateImport(value: unknown) {
  if (!record(value)) throw new MigrationError('invalid_import');
  const allowedFields = new Set(['sourceProjectId','table','rows','replaceEmptyWorkspace']);
  if (Object.keys(value).some(key => !allowedFields.has(key))) throw new MigrationError('unsupported_import_fields');
  if (typeof value.table !== 'string' || !Object.hasOwn(MIGRATION_TABLES,value.table)) throw new MigrationError('table_not_allowed');
  const table = MIGRATION_TABLES[value.table];
  if (value.sourceProjectId !== table.sourceProjectId) throw new MigrationError('source_project_mismatch');
  if (!Array.isArray(value.rows) || value.rows.length > MAX_MIGRATION_ROWS) throw new MigrationError('migration_row_limit',413);
  const unique = new Map<string, Row>();
  for (const input of value.rows) {
    const row = validatedRow(input,table);
    const key = keyOf(row,table), prior = unique.get(key);
    if (prior && !sameRow(prior,row,table)) throw new MigrationError('migration_conflict',409);
    unique.set(key,row);
  }
  let expectedExistingRow: Row | null = null;
  if (Object.hasOwn(value,'replaceEmptyWorkspace')) {
    const option = value.replaceEmptyWorkspace;
    if (value.table !== EMPTY_WORKSPACE_TABLE || value.rows.length !== 1 || !record(option) ||
        Object.keys(option).length !== 1 || !Object.hasOwn(option,'expectedExistingRow')) throw new MigrationError('empty_workspace_replacement_not_allowed');
    expectedExistingRow = validatedRow(option.expectedExistingRow,table);
    const incoming = [...unique.values()][0];
    if (expectedExistingRow.revision !== 1 || workspaceProjectCount(expectedExistingRow) !== 0 ||
        workspaceProjectCount(incoming) <= 0 || typeof incoming.revision !== 'number' || incoming.revision < 1 || incoming.revision >= Number.MAX_SAFE_INTEGER ||
        incoming.user_id !== expectedExistingRow.user_id || typeof incoming.user_id !== 'string' || !incoming.user_id || incoming.user_id.startsWith('migration-backup:')) {
      throw new MigrationError('empty_workspace_replacement_not_allowed');
    }
  }
  return {tableName:value.table, sourceProjectId:table.sourceProjectId, table, rows:[...unique.values()], received:value.rows.length, expectedExistingRow};
}

async function countTables(db: D1Database) {
  const names = Object.keys(MIGRATION_TABLES);
  try {
    // A bounded D1 batch executes in one transaction. Each statement references
    // one allowlisted table, avoiding a large cross-table compound SELECT.
    const statements = names.map(name => db.prepare(`SELECT COUNT(*) AS row_count FROM ${quote(name)}`));
    const results = await db.batch<{row_count:number}>(statements);
    if (!Array.isArray(results) || results.length !== names.length || results.some(result =>
      result.success !== true || !Array.isArray(result.results) || result.results.length !== 1 ||
      !Number.isSafeInteger(result.results[0].row_count) || result.results[0].row_count < 0)) {
      console.error('[hub-migration]', {stage:'count',cause:'invalid_count_result',statementCount:names.length});
      throw new MigrationError('migration_count_failed',503);
    }
    return {tables:results.map((result,index)=>({table:names[index],sourceProjectId:MIGRATION_TABLES[names[index]].sourceProjectId,count:result.results[0].row_count}))};
  } catch(error) {
    if (error instanceof MigrationError) throw error;
    logFailure('count', error, names.length);
    throw new MigrationError('migration_count_failed',503);
  }
}

function logFailure(stage: string, error: unknown, statementCount?: number) {
  // Provider errors can contain SQL, bound values or user data. Inspect them only
  // to choose a fixed label; never send the error, its message or stack to logs.
  const message = error instanceof Error ? error.message : '';
  const cause = /no such table/i.test(message) ? 'missing_table'
    : /no such column/i.test(message) ? 'missing_column'
    : /expression tree is too large|parser stack overflow|maximum (?:expression )?depth/i.test(message) ? 'expression_limit'
    : /too many (?:terms|sql variables|statements)|statement.{0,30}limit|query.{0,30}too (?:large|long)|too many subrequests/i.test(message) ? 'query_limit'
    : /(?:not authorized|unauthorized|permission denied|SQLITE_AUTH)/i.test(message) ? 'database_authorization'
    : /(?:timeout|timed out|deadline)/i.test(message) ? 'timeout'
    : /(?:is not a function|illegal invocation|incompatible receiver)/i.test(message) ? 'runtime_api'
    : /(?:D1_ERROR|D1_EXEC_ERROR|SQLITE_)/i.test(message) ? 'database_error'
    : 'unexpected_error';
  console.error('[hub-migration]', {stage,cause,...(statementCount === undefined ? {} : {statementCount})});
}

export async function importRows(db: D1Database, payload: unknown) {
  const {tableName,sourceProjectId,table,rows,received,expectedExistingRow} = validateImport(payload);
  if (expectedExistingRow) return replaceEmptyWorkspace(db,sourceProjectId,table,rows[0],expectedExistingRow);
  const columnNames = table.columns.map(column=>column.name);
  const selectColumns = columnNames.map(quote).join(',');
  // D1's per-statement parameter limit is respected for both single and compound PKs.
  const lookups: D1PreparedStatement[] = [];
  const lookupBatch = Math.max(1,Math.floor(100/table.primaryKey.length));
  for (let offset=0; offset<rows.length; offset+=lookupBatch) {
    const part=rows.slice(offset,offset+lookupBatch);
    const keys=table.primaryKey.map(quote).join(',');
    const clause=table.primaryKey.length===1
      ? `${keys} IN (${part.map(()=>'?').join(',')})`
      : `(${keys}) IN (${part.map(()=>`(${table.primaryKey.map(()=>'?').join(',')})`).join(',')})`;
    lookups.push(db.prepare(`SELECT ${selectColumns} FROM ${quote(tableName)} WHERE ${clause}`).bind(...part.flatMap(row=>table.primaryKey.map(name=>row[name]))));
  }
  const existing = new Map<string,Row>();
  if (lookups.length) {
    try {
      const snapshots=await db.batch<Row>(lookups);
      if (!Array.isArray(snapshots) || snapshots.length!==lookups.length || snapshots.some(result=>result.success!==true || !Array.isArray(result.results))) throw new MigrationError('migration_lookup_failed',503);
      for (const result of snapshots) for (const row of result.results) existing.set(keyOf(row,table),row);
    } catch(error) {
      if (error instanceof MigrationError) throw error;
      logFailure('lookup',error,lookups.length);
      throw new MigrationError('migration_lookup_failed',503);
    }
  }
  const additions: Row[]=[];
  for (const row of rows) {
    const prior=existing.get(keyOf(row,table));
    if (prior) { if (!sameRow(prior,row,table)) throw new MigrationError('migration_conflict',409); }
    else additions.push(row);
  }
  if (additions.length) {
    const writes: D1PreparedStatement[]=[];
    const insertBatch=Math.max(1,Math.floor(100/columnNames.length));
    for(let offset=0;offset<additions.length;offset+=insertBatch){
      const part=additions.slice(offset,offset+insertBatch);
      const placeholders=part.map(()=>`(${columnNames.map(()=>'?').join(',')})`).join(',');
      writes.push(db.prepare(`INSERT INTO ${quote(tableName)} (${selectColumns}) VALUES ${placeholders}`).bind(...part.flatMap(row=>columnNames.map(name=>row[name]))));
    }
    try {
      // A concurrent insert or secondary unique constraint aborts the entire batch.
      // No REPLACE, UPDATE, DELETE, owner mapping or conflict-ignore statement exists.
      const result=await db.batch(writes);
      if(result.some(item=>item.success!==true)) throw new MigrationError('migration_write_failed',503);
    } catch(error) {
      if(error instanceof MigrationError) throw error;
      const message=error instanceof Error?error.message:'';
      if(/(?:UNIQUE|PRIMARY KEY|FOREIGN KEY|NOT NULL|CHECK) constraint failed/i.test(message)) throw new MigrationError('migration_conflict',409);
      throw new MigrationError('migration_write_failed',503);
    }
  }
  // Metadata-only receipt: never echo private row contents or persist them to source.
  return {receiptId:crypto.randomUUID(),sourceProjectId,table:tableName,received,inserted:additions.length,skipped:received-additions.length,completedAt:new Date().toISOString()};
}

async function replaceEmptyWorkspace(db: D1Database, sourceProjectId: string, table: MigrationTable, incoming: Row, expected: Row) {
  const snapshot = JSON.stringify(table.columns.map(column=>expected[column.name]));
  const hash = await crypto.subtle.digest('SHA-256',encode.encode(snapshot));
  const backupSha256 = [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');
  const backupId = `migration-backup:${expected.user_id}:${backupSha256}`;
  const backup: Row = {...expected,user_id:backupId};
  // A stale empty-workspace tab may still hold revision 1. Advance the installed
  // revision so its ordinary save cannot erase the restored source projects.
  const installed: Row = {...incoming,revision:Math.max(Number(expected.revision),Number(incoming.revision))+1};
  const receipt = (replaced: number, backupCreated: number) => ({receiptId:crypto.randomUUID(),sourceProjectId,table:EMPTY_WORKSPACE_TABLE,received:1,inserted:0,skipped:1-replaced,replaced,backupCreated,backupSha256,sourceRevision:incoming.revision,installedRevision:installed.revision,completedAt:new Date().toISOString()});
  const name = quote(EMPTY_WORKSPACE_TABLE);
  const columns = table.columns.map(column=>quote(column.name)).join(',');
  const found = await db.batch<Row>([db.prepare(`SELECT ${columns} FROM ${name} WHERE "user_id" IN (?,?)`).bind(expected.user_id,backupId)]);
  if (found.length!==1 || found[0].success!==true || !Array.isArray(found[0].results)) throw new MigrationError('migration_lookup_failed',503);
  const live=found[0].results.find(row=>row.user_id===expected.user_id), archived=found[0].results.find(row=>row.user_id===backupId);
  if (live && archived && sameRow(live,installed,table) && sameRow(archived,backup,table)) return receipt(0,0);
  if (!live || !sameRow(live,expected,table) || archived) throw new MigrationError('migration_conflict',409);
  const exact = '"user_id" = ? AND "data" = ? AND "revision" = ? AND "updated_at" = ?';
  const expectedValues = [expected.user_id,expected.data,expected.revision,expected.updated_at];
  try {
    // Both statements execute in one D1 transaction. A racing edit makes both
    // WHERE clauses false. A backup collision aborts the complete batch.
    const results = await db.batch([
      db.prepare(`INSERT INTO ${name} (${columns}) SELECT ?,"data","revision","updated_at" FROM ${name} WHERE ${exact}`).bind(backupId,...expectedValues),
      db.prepare(`UPDATE ${name} SET "data" = ?,"revision" = ?,"updated_at" = ? WHERE ${exact} AND EXISTS (SELECT 1 FROM ${name} WHERE ${exact})`).bind(installed.data,installed.revision,installed.updated_at,...expectedValues,backupId,expected.data,expected.revision,expected.updated_at),
    ]);
    if (results.length!==2 || results.some(result=>result.success!==true)) throw new MigrationError('migration_write_failed',503);
    const changes=results.map(result=>result.meta.changes);
    if (changes.every(value=>value===0)) throw new MigrationError('migration_conflict',409);
    if (!changes.every(value=>value===1)) throw new MigrationError('migration_write_failed',503);
    return receipt(1,1);
  } catch(error) {
    if (error instanceof MigrationError) throw error;
    const message=error instanceof Error?error.message:'';
    if (/(?:UNIQUE|PRIMARY KEY|FOREIGN KEY|NOT NULL|CHECK) constraint failed/i.test(message)) throw new MigrationError('migration_conflict',409);
    logFailure('replace_empty_workspace',error,2);
    throw new MigrationError('migration_write_failed',503);
  }
}

export async function handleMigrationRequest(req: Request, environment: MigrationEnvironment) {
  let stage = 'authenticate';
  try {
    if (!await importTokenMatches(req.headers.get('X-Migration-Token'),environment.HUB_MIGRATION_IMPORT_TOKEN)) return response({error:'migration_unauthorized'},401);
    if (req.method!=='GET' && req.method!=='POST') return response({error:'method_not_allowed'},405);
    if (!environment.DB) throw new MigrationError('migration_database_unavailable',503);
    if (req.method==='GET') { stage = 'count'; return response(await countTables(environment.DB)); }
    stage = 'read_payload';
    const payload = await readPayload(req);
    stage = 'import';
    return response(await importRows(environment.DB,payload));
  } catch(error) {
    if (!(error instanceof MigrationError)) logFailure(stage,error);
    return error instanceof MigrationError ? response({error:error.message},error.status) : response({error:'migration_unavailable'},503);
  }
}
