import pg from 'pg';
import type { DbClient, QueryResult } from './DbClient.ts';

/**
 * Production database client — real PostgreSQL via the `pg` driver (the one and only npm
 * dependency this backend actually needs at runtime; everything else — JWT, password hashing,
 * routing — is hand-rolled on Node built-ins specifically so the dependency surface stays this
 * small). Uses `$1, $2, ...` placeholders natively, matching pg's own convention, so no
 * translation layer is needed here (compare SqliteClient.ts, which does need one).
 */
export class PgClient implements DbClient {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const result = await this.pool.query(sql, params);
    return { rows: result.rows as T[] };
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txClient: DbClient = {
        query: async <U>(sql: string, params: unknown[] = []) => {
          const result = await client.query(sql, params);
          return { rows: result.rows as U[] };
        },
        transaction: () => {
          throw new Error('Nested transactions are not supported');
        },
        close: async () => {},
      };
      const result = await fn(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
