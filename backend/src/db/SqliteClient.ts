import { DatabaseSync } from 'node:sqlite';
import type { DbClient, QueryResult } from './DbClient.ts';

/**
 * Converts Postgres-style `$1, $2, ...` placeholders to SQLite's `?` placeholders, and expands
 * the params array to match — correctly handling a placeholder used more than once in the same
 * query (e.g. `$5` appearing twice), unlike a naive positional replace would.
 */
function toSqliteQuery(sql: string, params: unknown[]): { sql: string; params: unknown[] } {
  const expandedParams: unknown[] = [];
  const convertedSql = sql.replace(/\$(\d+)/g, (_match, n: string) => {
    expandedParams.push(params[Number(n) - 1]);
    return '?';
  });
  return { sql: convertedSql, params: expandedParams };
}

export class SqliteClient implements DbClient {
  private readonly db: DatabaseSync;

  constructor(location: string = ':memory:') {
    this.db = new DatabaseSync(location);
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const { sql: sqliteSql, params: sqliteParams } = toSqliteQuery(sql, params);
    const stmt = this.db.prepare(sqliteSql);
    // .all() is safe to call even for statements with no result set (verified: returns []),
    // so every query — SELECT, INSERT/UPDATE/DELETE with or without RETURNING — goes through
    // the same code path.
    const rows = stmt.all(...(sqliteParams as never[])) as T[];
    return { rows };
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }

  /** Test-only convenience: runs a raw migration file's contents (DDL) directly. */
  execRaw(sql: string): void {
    this.db.exec(sql);
  }
}
