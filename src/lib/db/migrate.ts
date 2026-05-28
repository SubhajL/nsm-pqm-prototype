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

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';

import type { Db } from './client';

interface PgliteExecutor {
  $client?: { exec(sql: string): Promise<unknown> };
}

const MIGRATIONS_TABLE = '__drizzle_migrations';

function defaultMigrationsDir(): string {
  // Resolve relative to this file. In dev/test (TS source), this lives in
  // src/lib/db. The compiled JS lives in .next/... but we only call this
  // from scripts/tests, not from runtime API routes.
  const here =
    typeof __dirname === 'string'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../drizzle/migrations');
}

export async function runMigrations(db: Db, migrationsDir = defaultMigrationsDir()): Promise<void> {
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
