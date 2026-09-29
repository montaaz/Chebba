import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// numeric columns (money, km) come back as numbers instead of strings
types.setTypeParser(1700, (v) => parseFloat(v));

const globalForDb = globalThis as unknown as { __chebbaPool?: Pool };

/* One pool per server process, reused across hot reloads in dev. */
const pool =
  globalForDb.__chebbaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
  });
globalForDb.__chebbaPool = pool;

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return (await query<T>(text, params))[0] as T | undefined;
}

export async function transaction<T>(run: (db: PoolClient) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const out = await run(db);
    await db.query("COMMIT");
    return out;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  } finally {
    db.release();
  }
}

export const isUniqueViolation = (err: unknown, constraint?: string) =>
  typeof err === "object" &&
  err !== null &&
  (err as { code?: string }).code === "23505" &&
  (!constraint || (err as { constraint?: string }).constraint === constraint);
