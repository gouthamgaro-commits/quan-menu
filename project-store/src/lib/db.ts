import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";
import { SEED_PROJECTS } from "./seed";

export type Row = Record<string, unknown>;
export type Query = <T = Row>(text: string, params?: unknown[]) => Promise<T[]>;
type Exec = (sql: string) => Promise<void>;
type Conn = {
  kind: "postgres" | "local";
  query: Query;
  exec: Exec;
  tx: <T>(fn: (query: Query, exec: Exec) => Promise<T>) => Promise<T>;
};

/**
 * Where data lives:
 * - "postgres": DATABASE_URL is set (Supabase or any Postgres). Use this in production.
 * - "local": no DATABASE_URL during development. A built-in Postgres (PGlite) keeps data in .data/.
 * - "missing": a production build with no DATABASE_URL. Pages show setup steps instead.
 */
export function dbMode(): "postgres" | "local" | "missing" {
  if (process.env.DATABASE_URL) return "postgres";
  if (process.env.NODE_ENV !== "production" || process.env.LOCAL_DB === "1") return "local";
  return "missing";
}

async function connectPostgres(url: string): Promise<Conn> {
  const { Pool } = await import("pg");
  // `ssl` below decides encryption; an sslmode in the string would override it and reject Supabase's certificate.
  const connectionString = url.replace(/([?&])sslmode=[^&]*(&|$)/, "$1").replace(/[?&]$/, "");
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: local ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (e) => console.error("[db] idle connection error:", e.message));
  const query = (async (text: string, params?: unknown[]) => (await pool.query(text, params)).rows) as Query;
  return {
    kind: "postgres",
    query,
    exec: async (sql) => {
      await pool.query(sql);
    },
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const q = (async (text: string, params?: unknown[]) => (await client.query(text, params)).rows) as Query;
        const result = await fn(q, async (sql) => {
          await client.query(sql);
        });
        await client.query("commit");
        return result;
      } catch (e) {
        await client.query("rollback").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

async function connectLocal(): Promise<Conn> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.LOCAL_DB_DIR || path.join(process.cwd(), ".data", "db");
  await mkdir(path.dirname(dir), { recursive: true });
  const pg = await PGlite.create(dir);
  const query = (async (text: string, params?: unknown[]) => (await pg.query(text, params)).rows) as Query;
  return {
    kind: "local",
    query,
    exec: async (sql) => {
      await pg.exec(sql);
    },
    tx: (fn) =>
      pg.transaction((tx) =>
        fn(
          (async (text: string, params?: unknown[]) => (await tx.query(text, params)).rows) as Query,
          async (sql) => {
            await tx.exec(sql);
          },
        ),
      ),
  };
}

/** Creates the tables on first run (and after updates), and fills the catalogue with sample projects once. */
async function migrate(conn: Conn) {
  const current = await conn
    .query<{ value: string }>("select value from store.meta where key = 'schema_version'")
    .catch(() => []);
  if (Number(current[0]?.value) >= SCHEMA_VERSION) return;

  await conn.tx(async (query, exec) => {
    // Two servers starting at once must not both create tables.
    await query("select pg_advisory_xact_lock(4419020)");
    await exec(SCHEMA_SQL);
    const seeded = await query("select 1 from store.meta where key = 'seeded'");
    if (!seeded.length) {
      for (const p of SEED_PROJECTS) {
        await query(
          `insert into store.projects (slug, title, summary, description, features, branches, category, level,
             difficulty, price, tech, includes, delivery_days, featured)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           on conflict (slug) do nothing`,
          [
            p.slug, p.title, p.summary, p.description, p.features, p.branches, p.category, p.level,
            p.difficulty, p.price, p.tech, p.includes, p.days, !!p.featured,
          ],
        );
      }
      await query("insert into store.meta (key, value) values ('seeded', now()::text) on conflict (key) do nothing");
    }
    await query(
      "insert into store.meta (key, value) values ('schema_version', $1) on conflict (key) do update set value = excluded.value",
      [String(SCHEMA_VERSION)],
    );
  });
}

async function open(): Promise<Conn> {
  const mode = dbMode();
  if (mode === "missing") throw new Error("DATABASE_URL is not set. See README → Deploy.");
  const conn = mode === "postgres" ? await connectPostgres(process.env.DATABASE_URL!) : await connectLocal();
  await migrate(conn);
  return conn;
}

// One connection pool per server process (kept on globalThis so development reloads reuse it).
const g = globalThis as unknown as { __storeDb?: Promise<Conn> };

export function db(): Promise<Conn> {
  if (!g.__storeDb) {
    g.__storeDb = open().catch((e) => {
      g.__storeDb = undefined;
      throw e;
    });
  }
  return g.__storeDb;
}

/** Runs one parameterised SQL statement and returns its rows. */
export const sql = (async (text: string, params?: unknown[]) => (await db()).query(text, params)) as Query;

/** Runs several statements in one transaction. */
export async function transaction<T>(fn: (query: Query) => Promise<T>) {
  return (await db()).tx((query) => fn(query));
}
