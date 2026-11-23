import { Pool, types, type PoolClient } from 'pg';
import { postgresQuery } from './sqlite-query';

type Argument = string | number | boolean | null | Uint8Array;
type Row = Record<string, unknown>;

const parsers: typeof types = {
  ...types,
  getTypeParser(oid, format) {
    if (oid !== 20 || format === 'binary') return types.getTypeParser(oid, format);
    return (value: string) => {
      const numeric = Number(value);
      if (!Number.isSafeInteger(numeric)) throw new Error('Integer outside safe range.');
      return numeric;
    };
  },
};

export class PostgresStatement {
  constructor(
    private readonly pool: Pool,
    private readonly statement: string,
    private readonly args: Argument[] = [],
  ) {}

  bind(...args: Argument[]) {
    return new PostgresStatement(this.pool, this.statement, args);
  }

  async execute<T>(client: Pool | PoolClient, previousChanges = 0) {
    const query = postgresQuery(this.statement, this.args, previousChanges);
    const result = await client.query(query);
    return {
      success: true,
      results: result.rows as T[],
      meta: { changes: result.command === 'SELECT' ? 0 : (result.rowCount ?? 0) },
    };
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = (await this.execute<Row>(this.pool)).results[0];
    if (!row) return null;
    if (column && !(column in row)) throw new Error('D1-compatible query column not found.');
    return (column ? row[column] : row) as T | null;
  }

  all<T = Row>() {
    return this.execute<T>(this.pool);
  }

  run<T = Row>() {
    return this.all<T>();
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
    const result = await this.pool.query({
      ...postgresQuery(this.statement, this.args, 0),
      rowMode: 'array',
    });
    const rows = options?.columnNames
      ? [result.fields.map(field => field.name), ...result.rows]
      : result.rows;
    return rows as T[];
  }
}

let pool: Pool | undefined;

function databasePool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.WORKSPACE_DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      types: parsers,
    });
    pool.on('error', () => console.error('Workspace database idle connection failed.'));
  }
  return pool;
}

export async function withPostgresObjectLock<T>(key: string, write: () => Promise<T>): Promise<T> {
  const client = await databasePool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
    const result = await write();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export function postgresBinding() {
  const db = databasePool();
  return {
    prepare(statement: string) {
      return new PostgresStatement(db, statement);
    },
    async batch<T>(statements: PostgresStatement[]) {
      for (let attempt = 1; ; attempt += 1) {
        const client = await db.connect();
        try {
          await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
          let previousChanges = 0;
          const results = [];
          for (const statement of statements) {
            const result = await statement.execute<T>(client, previousChanges);
            previousChanges = result.meta.changes;
            results.push(result);
          }
          await client.query('COMMIT');
          return results;
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          const code = (error as {code?: string}).code;
          if (attempt >= 3 || (code !== '40001' && code !== '40P01')) throw error;
        } finally {
          client.release();
        }
      }
    },
  };
}
