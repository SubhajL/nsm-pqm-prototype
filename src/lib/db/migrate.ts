/**
 * PR-19 — Schema migrator.
 *
 * Applies the SQL files in `drizzle/migrations` against the supplied DB.
 * Works for both pglite (test/dev) and real Postgres (production) because
 * the SQL is portable.
 *
 * Strategy: scan `drizzle/migrations/*.sql` in name-sorted order and
 * execute each statement. Statements are separated by Drizzle's
 * `--> statement-breakpoint` marker. We track applied migrations in a
 * dedicated `__drizzle_migrations` table so re-running is idempotent.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';

import type { Db } from './client';

interface PgliteExecutor {
  $client?: { exec(sql: string): Promise<unknown> };
}

const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * Phase 2-C — Deterministic 32-bit advisory-lock key for the migration
 * runner. Two concurrent deploy-time migrators will serialise behind
 * `pg_advisory_lock(<key>)`; whoever loses the race waits at the
 * second `SELECT`.
 *
 * The value is the sum of UTF-8 codepoints of `nsm-pqm-migrations`
 * folded into the 32-bit signed range. Stable across processes / hosts
 * because the input is a literal string, not a random seed.
 */
const MIGRATION_ADVISORY_LOCK_KEY = (() => {
  const tag = 'nsm-pqm-migrations';
  let hash = 0;
  for (const ch of tag) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0; // keep within int32
  }
  return hash;
})();

/**
 * Phase 2-C — true on pglite (which exposes `db.$client.exec(...)`),
 * false on the postgres-js path. Pglite is single-process so advisory
 * locks are meaningless there; calling `pg_advisory_lock` against
 * pglite either returns silently or errors depending on emulation
 * level. We skip it entirely.
 */
function isPglite(db: Db): boolean {
  const exec = (db as unknown as PgliteExecutor).$client;
  return Boolean(exec && typeof exec.exec === 'function');
}

/**
 * Phase 2-C — Acquire the migration advisory lock on `db`. Exposed for
 * the standalone deploy-step entry point and for the contract test;
 * the production `runMigrations` path uses the transaction-scoped
 * `pg_advisory_xact_lock` variant below which auto-releases on commit
 * and so does not need an explicit unlock.
 *
 * Blocks until available; no timeout. Use ONLY around the migration
 * runner; never wrap normal request work in this.
 *
 * IMPORTANT: postgres-js opens a connection pool. `pg_advisory_lock`
 * is SESSION-scoped, so any release MUST run on the same backend
 * connection. The safer pattern is `pg_advisory_xact_lock` inside a
 * single transaction (used by `runMigrations`), where the lock
 * auto-releases on commit.
 */
export async function acquireMigrationAdvisoryLock(db: Db): Promise<void> {
  if (isPglite(db)) return;
  await db.execute(
    sql.raw(`SELECT pg_advisory_lock(${MIGRATION_ADVISORY_LOCK_KEY})`),
  );
}

/**
 * Phase 2-C — Release the migration advisory lock. MUST be paired with
 * a preceding `acquireMigrationAdvisoryLock` on the SAME connection.
 * Prefer the `pg_advisory_xact_lock` variant inside a transaction —
 * `runMigrations` does this for you.
 */
export async function releaseMigrationAdvisoryLock(db: Db): Promise<void> {
  if (isPglite(db)) return;
  await db.execute(
    sql.raw(`SELECT pg_advisory_unlock(${MIGRATION_ADVISORY_LOCK_KEY})`),
  );
}

function defaultMigrationsDir(): string {
  // Primary: resolve relative to this module. Correct for the `db:migrate`
  // script and vitest (TS source under src/lib/db).
  const here =
    typeof __dirname === 'string'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  const fromModule = resolve(here, '../../../drizzle/migrations');
  if (existsSync(fromModule)) return fromModule;

  // Fallback: under `next dev` / `next start` this module is bundled, so
  // `__dirname` points inside `.next/` and the relative jump misses the
  // repo-root migrations folder — which broke the lazy
  // `ensureDatabaseSeeded()` path on a fresh (no DATABASE_URL) pglite.
  // `process.cwd()` is the app root in every runtime and
  // `drizzle/migrations` is committed there, so this resolves correctly.
  return resolve(process.cwd(), 'drizzle/migrations');
}

export async function runMigrations(db: Db, migrationsDir = defaultMigrationsDir()): Promise<void> {
  // Phase 2-C — serialise concurrent migrate-step invocations.
  //
  // On pglite (single-process dev) advisory locks are meaningless, so
  // we go straight to the migration runner.
  //
  // On postgres-js (Drizzle on a pooled client) `pg_advisory_lock` is
  // SESSION-scoped — the matching unlock has to run on the same
  // backend connection. Drizzle's `db.transaction(...)` binds a single
  // postgres-js reserved connection for the duration of the callback,
  // so we use `pg_advisory_xact_lock` instead: the lock is held for
  // the lifetime of the transaction and auto-released on commit or
  // rollback. No risk of a leaked lock on a separate connection.
  if (isPglite(db)) {
    await runMigrationsLocked(db, migrationsDir);
    return;
  }
  await db.transaction(async (tx) => {
    await tx.execute(
      sql.raw(`SELECT pg_advisory_xact_lock(${MIGRATION_ADVISORY_LOCK_KEY})`),
    );
    await runMigrationsLocked(tx as unknown as Db, migrationsDir);
  });
}

async function runMigrationsLocked(db: Db, migrationsDir: string): Promise<void> {
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id text PRIMARY KEY,
      applied_at text NOT NULL
    )`),
  );

  const applied = new Set<string>();
  const rows = await db.execute(
    sql.raw(`SELECT id FROM ${MIGRATIONS_TABLE}`),
  );
  // Drizzle's `execute` returns a result with .rows for pglite, or array
  // directly for postgres-js. Handle both shapes defensively.
  const rowList = Array.isArray(rows) ? rows : (rows as { rows?: unknown[] }).rows ?? [];
  for (const row of rowList) {
    const id = (row as { id: string }).id;
    if (typeof id === 'string') applied.add(id);
  }

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const fullPath = join(migrationsDir, file);
    const contents = readFileSync(fullPath, 'utf-8');
    const statements = contents
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // For pglite, run the whole file via $client.exec to get implicit
    // multi-statement transaction semantics. For postgres-js, fall back
    // to executing each statement via db.execute.
    const pglite = (db as unknown as PgliteExecutor).$client;
    if (pglite && typeof pglite.exec === 'function') {
      await pglite.exec(contents);
    } else {
      for (const statement of statements) {
        await db.execute(sql.raw(statement));
      }
    }

    await db.execute(
      sql.raw(
        `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES ('${file}', '${new Date().toISOString()}')`,
      ),
    );
  }
}
