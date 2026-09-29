/* Applies db/migrations/*.sql in order, each in its own transaction.
   Run:  npm run db:migrate */
import "./db-env.mjs";
import { ROOT } from "./db-env.mjs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         serial PRIMARY KEY,
    name       varchar(120) NOT NULL UNIQUE,
    applied_at timestamptz  NOT NULL DEFAULT now()
  )`);

const dir = path.join(ROOT, "db", "migrations");
const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
let applied = 0;

for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  const sql = await readFile(path.join(dir, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log("applied", file);
    applied++;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("failed ", file, "—", err.message);
    await client.end();
    process.exit(1);
  }
}

console.log(applied ? `${applied} migration(s) applied.` : "Database is up to date.");
await client.end();
