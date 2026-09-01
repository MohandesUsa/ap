import mysql from 'mysql2/promise';
import type { DbClient, QueryResult } from './DbClient.ts';

/**
 * Converts Postgres-style `$1, $2, ...` placeholders to MySQL's `?` placeholders, expanding the
 * params array to match — correctly handles a placeholder used more than once in the same
 * fragment (e.g. `$5` appearing twice), unlike a naive positional replace would. Operates on
 * arbitrary SQL *fragments*, not just whole statements: `$N` always means "the Nth value in the
 * ORIGINAL params array passed to query()", so this is safe to call on a substring (see the
 * RETURNING emulation below, which converts the WHERE clause alone while still indexing into the
 * full params array). Identical approach to SqliteClient.ts's toSqliteQuery — same problem, same
 * fix, different placeholder character.
 */
function toMysqlFragment(sqlFragment: string, params: unknown[]): { sql: string; params: unknown[] } {
  const expandedParams: unknown[] = [];
  const convertedSql = sqlFragment.replace(/\$(\d+)/g, (_match, n: string) => {
    expandedParams.push(params[Number(n) - 1]);
    return '?';
  });
  return { sql: convertedSql, params: expandedParams };
}

/** Parsed shape of a `... RETURNING <cols>` statement — everything the emulation below needs,
 *  pulled out once instead of re-matching per branch. */
interface ReturningStatement {
  kind: 'insert' | 'update';
  table: string;
  /** The SQL with `RETURNING ...` stripped off (still has $N placeholders, still has the table
   *  name, column list, VALUES/SET clause and WHERE clause as originally written). */
  bodySql: string;
  returningCols: string;
}

function parseReturning(sql: string): ReturningStatement | null {
  const returningMatch = sql.match(/\sRETURNING\s+([\s\S]+)$/i);
  if (!returningMatch) return null;
  const bodySql = sql.slice(0, returningMatch.index).trim();
  const returningCols = returningMatch[1].trim();

  const insertMatch = bodySql.match(/^\s*INSERT\s+INTO\s+(\S+)/i);
  if (insertMatch) return { kind: 'insert', table: insertMatch[1], bodySql, returningCols };

  const updateMatch = bodySql.match(/^\s*UPDATE\s+(\S+)/i);
  if (updateMatch) return { kind: 'update', table: updateMatch[1], bodySql, returningCols };

  throw new Error(`MySqlClient: RETURNING is only emulated for INSERT/UPDATE, got: ${sql}`);
}

/**
 * Production database client — real MySQL/MariaDB via `mysql2` (Phase 3.1: this project moved
 * off PostgreSQL specifically so it can run on ordinary shared hosting, where MySQL/MariaDB is
 * usually the only database on offer and PostgreSQL usually isn't installable at all).
 *
 * MySQL has no `RETURNING` clause (unlike Postgres and, as it happens, SQLite — see
 * SqliteClient.ts, which gets RETURNING for free from SQLite itself and never needed this). Every
 * repository in this codebase was written against Postgres's RETURNING and is exactly what Phase
 * 3.1's "don't touch business logic" rule means to leave alone, so the emulation lives entirely
 * here instead of in each repository:
 *   - `INSERT ... (id, ...) VALUES (...) RETURNING <cols>` — the id is already one of the
 *     INSERT's own params (every id in this codebase is an app-generated UUID, never
 *     DB-generated), so: run the INSERT, find "id"'s position in the column list, and
 *     `SELECT <cols> FROM <table> WHERE id = ?` using that same value.
 *   - `UPDATE ... SET ... WHERE <cond> RETURNING <cols>` — cannot simply re-run <cond> as a
 *     SELECT afterward: several of these conditions are no longer true once the UPDATE has run
 *     (`WHERE status = 'pending'` after the UPDATE just changed status away from 'pending' — see
 *     invitation.repository.ts's expireOldInvitations, and the same shape is exactly what
 *     acceptInTransaction's race-safety relies on for a DIFFERENT column). The safe general
 *     emulation captures which rows match <cond> and updates/re-selects THOSE ids specifically,
 *     all inside one dedicated transaction so it's atomic even when the caller's own query() call
 *     isn't already inside a `.transaction()` block:
 *       BEGIN; SELECT id FROM <table> WHERE <cond>  (0 rows -> done, return { rows: [] })
 *       UPDATE <table> SET <same SET clause> WHERE id IN (captured ids)
 *       SELECT <cols> FROM <table> WHERE id IN (captured ids); COMMIT
 *     This preserves the exact race-safety property the conditional UPDATE exists for (the
 *     UPDATE itself still only touches rows that matched <cond> at the moment of the capturing
 *     SELECT, run inside the same transaction) while correctly returning post-update state even
 *     when <cond> mentions the very column being changed.
 */
export class MySqlClient implements DbClient {
  private readonly pool: mysql.Pool;

  constructor(connectionUri: string) {
    this.pool = mysql.createPool(connectionUri);
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const parsed = parseReturning(sql);
    if (!parsed) {
      const { sql: mysqlSql, params: mysqlParams } = toMysqlFragment(sql, params);
      const [rows] = await this.pool.query(mysqlSql, mysqlParams);
      return { rows: rows as T[] };
    }
    return this.runWithReturning(this.pool, parsed, params);
  }

  private async runWithReturning<T>(
    runner: mysql.Pool | mysql.PoolConnection,
    parsed: ReturningStatement,
    params: unknown[],
  ): Promise<QueryResult<T>> {
    if (parsed.kind === 'insert') {
      const colListMatch = parsed.bodySql.match(/INSERT\s+INTO\s+\S+\s*\(([^)]+)\)/i);
      if (!colListMatch) throw new Error(`MySqlClient: cannot find column list in: ${parsed.bodySql}`);
      const columns = colListMatch[1].split(',').map((c) => c.trim());
      const idIndex = columns.indexOf('id');
      if (idIndex === -1) {
        throw new Error(`MySqlClient: RETURNING emulation for INSERT requires an "id" column: ${parsed.bodySql}`);
      }
      const idValue = params[idIndex];

      const { sql: insertSql, params: insertParams } = toMysqlFragment(parsed.bodySql, params);
      await runner.query(insertSql, insertParams);
      const [rows] = await runner.query(
        `SELECT ${parsed.returningCols} FROM ${parsed.table} WHERE id = ?`,
        [idValue],
      );
      return { rows: rows as T[] };
    }

    // UPDATE — split into the SET clause and WHERE clause so each can be converted/re-used
    // independently (see the class doc comment for why a naive re-run of WHERE doesn't work).
    const whereSplit = parsed.bodySql.match(/^([\s\S]+?)\sWHERE\s([\s\S]+)$/i);
    if (!whereSplit) {
      throw new Error(`MySqlClient: RETURNING emulation for UPDATE requires a WHERE clause: ${parsed.bodySql}`);
    }
    const [, setPortion, wherePortion] = whereSplit;

    const ownsConnection = 'getConnection' in runner;
    const conn = ownsConnection ? await (runner as mysql.Pool).getConnection() : (runner as mysql.PoolConnection);
    try {
      if (ownsConnection) await conn.beginTransaction();

      // FOR UPDATE is not optional here: a plain SELECT would just read a snapshot, leaving a
      // window between "capture matching ids" and "update them" where a concurrent transaction
      // could capture the SAME ids before either commits — exactly the race
      // acceptInTransaction's "WHERE id = $2 AND status = 'pending'" exists to prevent (see the
      // class doc comment). The row lock makes a second concurrent caller block here until the
      // first commits, then re-evaluate <cond> against the now-committed row — which by then no
      // longer matches (status isn't 'pending' anymore) — so it correctly captures zero rows
      // instead of double-accepting.
      const { sql: whereSql, params: whereParams } = toMysqlFragment(wherePortion, params);
      const [idRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT id FROM ${parsed.table} WHERE ${whereSql} FOR UPDATE`,
        whereParams,
      );
      const ids = idRows.map((r) => r.id);

      if (ids.length === 0) {
        if (ownsConnection) await conn.commit();
        return { rows: [] as T[] };
      }

      const { sql: setSql, params: setParams } = toMysqlFragment(setPortion.replace(/^UPDATE\s+\S+\s+/i, ''), params);
      const idPlaceholders = ids.map(() => '?').join(', ');
      await conn.query(`UPDATE ${parsed.table} ${setSql} WHERE id IN (${idPlaceholders})`, [...setParams, ...ids]);

      const [rows] = await conn.query(
        `SELECT ${parsed.returningCols} FROM ${parsed.table} WHERE id IN (${idPlaceholders})`,
        ids,
      );
      if (ownsConnection) await conn.commit();
      return { rows: rows as T[] };
    } catch (err) {
      if (ownsConnection) await conn.rollback();
      throw err;
    } finally {
      if (ownsConnection) conn.release();
    }
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const txClient: DbClient = {
        query: async <U>(sql: string, params: unknown[] = []) => {
          const parsed = parseReturning(sql);
          if (!parsed) {
            const { sql: mysqlSql, params: mysqlParams } = toMysqlFragment(sql, params);
            const [rows] = await conn.query(mysqlSql, mysqlParams);
            return { rows: rows as U[] };
          }
          // Already inside this transaction's connection — runWithReturning must NOT open a
          // second nested one, so pass the connection itself (ownsConnection becomes false).
          return this.runWithReturning<U>(conn, parsed, params);
        },
        transaction: () => {
          throw new Error('Nested transactions are not supported');
        },
        close: async () => {},
      };
      const result = await fn(txClient);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
