/**
 * Backfill the Postgres DB from the existing JSON fixtures.
 *
 * Run with:  `npm run db:seed`
 *
 * Phase 2-C: this script calls `runMigrationsAndSeedFromFixtures()` —
 * the unconditional entry point that bypasses the runtime
 * `DB_MIGRATIONS_APPLIED` opt-out. The runtime's lazy seed
 * (`ensureDatabaseSeeded` via `getRepositories()`) short-circuits
 * when the operator sets that env var, so the seed script MUST go
 * through the unconditional helper or it would silently no-op.
 *
 * Idempotent: every insert is guarded by an existence check, so
 * re-running is safe.
 *
 * Use as a deployment hook to pre-warm a real Postgres before any
 * HTTP traffic hits the app.
 */

import { getDb } from '@/lib/db/client';
import { runMigrationsAndSeedFromFixtures } from '@/lib/db/bootstrap';

async function main() {
  const db = getDb();
  console.log(
    process.env.DATABASE_URL
      ? '[backfill] target: $DATABASE_URL'
      : '[backfill] target: ephemeral pglite (DATABASE_URL unset)',
  );
  // Phase 2-C — use the unconditional entry point so the script
  // continues to work after the operator sets `DB_MIGRATIONS_APPLIED`
  // (which makes the lazy runtime path no-op). The seed step itself
  // must NEVER no-op when invoked directly.
  await runMigrationsAndSeedFromFixtures(db);
  console.log('[backfill] done.');
}

main().catch((err) => {
  console.error('[backfill] FAILED:', err);
  process.exit(1);
});
