/**
 * PR-19 — Drizzle DB client.
 *
 * Singleton lazily initialized on first call. Behaviour:
 *
 *   - `DATABASE_URL` set  → real Postgres via `postgres-js`. Suitable for
 *     Neon (default deploy target), any portable Postgres, or self-hosted
 *     GDCC on-prem.
 *   - `DATABASE_URL` unset → in-memory pglite, suitable for dev + tests.
 *     Data is lost on process exit; tests create a fresh client per suite
 *     so contract behaviour stays isolated.
 *
 * Schema is portable Postgres only — no Neon-specific extensions — per
 * MVP plan PR-19. On-prem / GDCC migration is a deployment swap.
 */

import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

type PgliteDb = ReturnType<typeof drizzlePglite<typeof schema>>;
type PostgresJsDb = ReturnType<typeof drizzlePg<typeof schema>>;

/**
 * Drizzle DB handle. Either flavour exposes the same query surface for
 * the table/schema combinations defined under `src/lib/db/schema`.
 */
export type Db = PgliteDb | PostgresJsDb;

let cached: Db | null = null;

/**
 * Build a fresh Drizzle client. Most code should call `getDb()` instead —
 * this helper exists so tests can spin up isolated pglite instances.
 */
export function createDbClient(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzlePg(postgres(url), { schema });
  }
  return drizzlePglite(new PGlite(), { schema });
}

/**
 * Returns the singleton DB client, constructing on first call.
 */
export function getDb(): Db {
  if (!cached) {
    cached = createDbClient();
  }
  return cached;
}

/**
 * Test-only: replace the cached client with the supplied one. Used by the
 * Database repository contract tests to inject a freshly-migrated pglite
 * instance per test run.
 *
 * @internal
 */
export function __setDbForTesting(db: Db | null): void {
  cached = db;
}
