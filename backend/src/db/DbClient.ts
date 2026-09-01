/**
 * Minimal database abstraction the whole backend codes against. Two implementations exist:
 *   - MySqlClient  (production — talks to real MySQL/MariaDB via the `mysql2` driver; see its
 *                    doc comment for why it also emulates `RETURNING`, which MySQL lacks)
 *   - SqliteClient (this project's own automated tests — Node's built-in node:sqlite,
 *                    zero extra dependencies, lets tests actually run in any environment)
 *
 * Every module (auth, trucks, invitations, ...) depends on this interface, never on `mysql2` or
 * `node:sqlite` directly — that's what makes it possible to swap the implementation for tests
 * without touching a single line of business logic (same principle as Phase 1 §9's Repository
 * Pattern on the Android side).
 */
export interface QueryResult<T> {
  rows: T[];
}

export interface DbClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Runs `fn` inside a transaction; commits on success, rolls back if `fn` throws. */
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
