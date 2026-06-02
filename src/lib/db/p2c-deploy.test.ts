import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Phase 2-C — Deploy-time migrations + advisory lock.
//
// Two contract points covered:
//   1. `acquireMigrationAdvisoryLock(db)` — issues
//      `SELECT pg_advisory_lock(<deterministic key>)` on the postgres-js
//      path. Two concurrent deploy-time migrators serialize behind it.
//      Pglite (single-process dev) is exempt — `pg_advisory_lock` is a
//      no-op there at best, an error at worst, so the helper short-
//      circuits when it detects pglite.
//
//   2. `ensureDatabaseSeeded(db)` — when `DATABASE_URL` is set AND
//      `DB_MIGRATIONS_APPLIED=1` (or `=true`), the lazy migrate+seed
//      promise resolves immediately without touching the database. The
//      deploy-step `npm run db:migrate` is the canonical entry point in
//      that mode; `getRepositories()` should not race the deploy.
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetModules();
  delete process.env.DB_MIGRATIONS_APPLIED;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.DB_MIGRATIONS_APPLIED;
});

describe('runMigrations advisory-lock plumbing (Phase 2-C)', () => {
  it('runs the postgres-js path inside a transaction with pg_advisory_xact_lock', async () => {
    // Build a fake postgres-js Drizzle handle whose `transaction(cb)`
    // hands the callback a tx with the same execute spy. The xact_lock
    // SQL must land on the tx, not on the outer db, so we record both.
    const txExecuted: string[] = [];
    const fakeTx = {
      execute: vi.fn(async (q: unknown) => {
        const chunks = (q as { queryChunks?: Array<{ value?: string }> })
          .queryChunks;
        txExecuted.push(chunks?.map((c) => c?.value ?? '').join('') ?? String(q));
        return { rows: [] };
      }),
    };
    const fakePostgresJsDb = {
      // No $client.exec → not pglite.
      transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb(fakeTx);
      }),
      execute: vi.fn(),
    };

    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const emptyDir = mkdtempSync(join(tmpdir(), 'p2c-nomigrations-'));

    const { runMigrations } = await import('./migrate');
    // Empty dir → migration loop is a quick no-op; the test only
    // cares about the transaction + xact_lock plumbing.
    await runMigrations(fakePostgresJsDb as never, emptyDir);

    expect(fakePostgresJsDb.transaction).toHaveBeenCalledTimes(1);
    expect(fakePostgresJsDb.execute).not.toHaveBeenCalled();
    const joined = txExecuted.join(' | ');
    expect(joined).toMatch(/pg_advisory_xact_lock\b/);
  });
});

describe('acquireMigrationAdvisoryLock — standalone (Phase 2-C)', () => {
  it('issues pg_advisory_lock then pg_advisory_unlock on the postgres-js path', async () => {
    const executedSql: string[] = [];
    const fakePostgresJsDb = {
      // Distinguishing marker so the helper can tell us apart from pglite.
      $client: undefined,
      execute: vi.fn(async (sql: unknown) => {
        // Drizzle's `sql.raw(text)` returns an SQL object whose
        // queryChunks[0] is a `StringChunk` carrying `.value`. Walk
        // the structure defensively so a chunk shape change doesn't
        // silently strip the assertion.
        const chunks = (sql as { queryChunks?: Array<{ value?: string }> })
          .queryChunks;
        const text = chunks?.map((c) => c?.value ?? '').join('') ?? String(sql);
        executedSql.push(text);
        return { rows: [] };
      }),
    };

    const { acquireMigrationAdvisoryLock, releaseMigrationAdvisoryLock } =
      await import('./migrate');

    await acquireMigrationAdvisoryLock(fakePostgresJsDb as never);
    await releaseMigrationAdvisoryLock(fakePostgresJsDb as never);

    expect(fakePostgresJsDb.execute).toHaveBeenCalledTimes(2);
    const joined = executedSql.join(' | ');
    expect(joined).toMatch(/pg_advisory_lock\b/);
    expect(joined).toMatch(/pg_advisory_unlock\b/);
  });

  it('is a no-op on the pglite path (no SQL executed)', async () => {
    const fakePgliteDb = {
      // pglite exposes a `.$client` with `.exec` — the migrator already
      // sniffs this in `runMigrations` to choose multi-statement exec.
      $client: { exec: vi.fn() },
      execute: vi.fn(),
    };

    const { acquireMigrationAdvisoryLock, releaseMigrationAdvisoryLock } =
      await import('./migrate');

    await acquireMigrationAdvisoryLock(fakePgliteDb as never);
    await releaseMigrationAdvisoryLock(fakePgliteDb as never);

    expect(fakePgliteDb.execute).not.toHaveBeenCalled();
    expect(fakePgliteDb.$client.exec).not.toHaveBeenCalled();
  });
});

describe('ensureDatabaseSeeded — DB_MIGRATIONS_APPLIED short-circuit (Phase 2-C)', () => {
  it('skips migrate + seed when DB_MIGRATIONS_APPLIED=1 AND DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgres://stub/test';
    process.env.DB_MIGRATIONS_APPLIED = '1';

    // Importing fresh ensures the WeakMap memoisation table is empty
    // for the synthetic Db handle we pass below.
    const { ensureDatabaseSeeded } = await import('./bootstrap');

    const syntheticDb = {} as never;
    // If the short-circuit works, this resolves without touching the DB
    // or throwing on the synthetic handle.
    await expect(ensureDatabaseSeeded(syntheticDb)).resolves.toBeUndefined();

    // Cleanup — leaving DATABASE_URL set would break other tests.
    delete process.env.DATABASE_URL;
  });

  it('still runs migrate + seed when DB_MIGRATIONS_APPLIED is unset (dev / preview)', async () => {
    // Use the real pglite-backed registry; that path migrates + seeds
    // on first call and is the canonical dev behaviour.
    const { getRepositories } = await import('@/lib/repositories');
    const users = await getRepositories().users.list();
    // Seed users are present.
    expect(users.length).toBeGreaterThan(0);
  });

  it('still runs when DB_MIGRATIONS_APPLIED=1 but DATABASE_URL is unset (paranoia: opt-in needs prod signal)', async () => {
    process.env.DB_MIGRATIONS_APPLIED = '1';
    delete process.env.DATABASE_URL;

    // The opt-out is gated on BOTH env vars being present; without
    // DATABASE_URL, we're in dev pglite mode and must still seed so
    // local runs keep working.
    const { getRepositories } = await import('@/lib/repositories');
    const users = await getRepositories().users.list();
    expect(users.length).toBeGreaterThan(0);
  });
});

describe('runMigrationsAndSeedFromFixtures — script entry point (Phase 2-C)', () => {
  it('seeds the DB even when DB_MIGRATIONS_APPLIED=1 + DATABASE_URL=set', async () => {
    // The deploy-step `npm run db:seed` script calls this entry point
    // precisely BECAUSE the lazy `ensureDatabaseSeeded` opt-out short-
    // circuits when both env vars are set. The script must still seed
    // a real DB — otherwise the deploy ships an empty database.
    process.env.DATABASE_URL = 'pglite-stub-marker';
    process.env.DB_MIGRATIONS_APPLIED = '1';

    // Use pglite directly so the seed actually runs (the real
    // DATABASE_URL above is only a marker the opt-out checks for).
    const { createDbClient } = await import('./client');
    const { runMigrationsAndSeedFromFixtures } = await import('./bootstrap');
    delete process.env.DATABASE_URL; // back to pglite for createDbClient
    const db = createDbClient();
    process.env.DATABASE_URL = 'pglite-stub-marker';

    await runMigrationsAndSeedFromFixtures(db);

    // Verify the seed actually landed — projects table has the canonical
    // demo row.
    const { DatabaseProjectRepository } = await import('./repositories');
    const projects = await new DatabaseProjectRepository(db).list();
    expect(projects.length).toBeGreaterThan(0);

    delete process.env.DATABASE_URL;
  });
});
