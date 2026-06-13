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
import { sql } from 'drizzle-orm';
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
 * `next dev` evaluates this module once per compiled route graph, so a
 * module-scope cache leaks one postgres-js pool (up to 10 connections)
 * per graph — a long e2e run walks enough routes to exhaust Postgres'
 * max_connections and every subsequent API call 500s. Real-Postgres
 * clients are therefore cached on `globalThis` (one pool per process).
 * pglite stays module-scoped so vitest's `vi.resetModules()` keeps its
 * fresh-instance-per-import isolation.
 */
const globalDbCache = globalThis as unknown as { __nsmPgDb?: PostgresJsDb };

/**
 * Build a fresh Drizzle client. Most code should call `getDb()` instead —
 * this helper exists so tests can spin up isolated pglite instances.
 *
 * Phase 0 hardening: silently falling back to in-process pglite in a
 * hosted deployment is almost always an env-misconfig — writes evaporate
 * on the next cold start. Refuse the fallback unless `ALLOW_EPHEMERAL_DB`
 * is set OR the runtime is clearly local development (`NODE_ENV !==
 * 'production'` AND no hosted-platform signal). Covers Vercel
 * (`VERCEL=1`) and any portable Postgres / GDCC / on-prem deploy that
 * sets `NODE_ENV=production` per the PR-19 deployment model.
 */
export function createDbClient(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzlePg(postgres(url), { schema });
  }
  const isProduction = process.env.NODE_ENV === 'production';
  const isHosted = process.env.VERCEL === '1';
  const ephemeralOptIn =
    (process.env.ALLOW_EPHEMERAL_DB ?? '').toLowerCase() === 'true' ||
    process.env.ALLOW_EPHEMERAL_DB === '1';
  if ((isProduction || isHosted) && !ephemeralOptIn) {
    throw new Error(
      'DATABASE_URL is required when NODE_ENV=production or VERCEL=1. ' +
        'Refusing to fall back to in-process pglite — writes would be lost on next cold start. ' +
        'Set ALLOW_EPHEMERAL_DB=true to opt in for ephemeral previews.',
    );
  }
  return drizzlePglite(new PGlite(), { schema });
}

/**
 * Returns the singleton DB client, constructing on first call.
 */
export function getDb(): Db {
  if (cached) return cached;
  if (process.env.DATABASE_URL) {
    if (!globalDbCache.__nsmPgDb) {
      globalDbCache.__nsmPgDb = createDbClient() as PostgresJsDb;
    }
    cached = globalDbCache.__nsmPgDb;
    return cached;
  }
  cached = createDbClient();
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
  if (db === null) {
    globalDbCache.__nsmPgDb = undefined;
  }
  databaseReadyPromise = null;
}

let databaseReadyPromise: Promise<void> | null = null;

/**
 * Lazily verifies the Database is reachable + responsive. Used by routes
 * that previously called `ensureProjectDemoStateHydrated()` to surface
 * connection problems before the first real query.
 *
 * Memoised: only the first caller pays the cost. Subsequent calls await
 * the cached promise. If the probe fails, the promise rejects and the
 * cache is cleared so the next call retries.
 *
 * Schema migrations are NOT this helper's job — `getRepositories()`
 * schedules them on construction. This is a quick "are you alive?" probe.
 */
export async function ensureDatabaseReady(): Promise<void> {
  if (databaseReadyPromise) return databaseReadyPromise;

  databaseReadyPromise = (async () => {
    const db = getDb();
    try {
      await db.execute(sql.raw('SELECT 1'));
    } catch (err) {
      databaseReadyPromise = null;
      throw err;
    }
  })();

  return databaseReadyPromise;
}
