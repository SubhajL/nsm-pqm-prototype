/**
 * Backfill the Postgres DB from the existing JSON fixtures.
 *
 * Run with:  `npm run db:seed`
 *
 * PR-21b: this script delegates to `ensureDatabaseSeeded()` which performs
 * idempotent migrations + per-domain seeding. Re-running is safe — every
 * insert is guarded by an existence check.
 *
 * The same helper is invoked automatically by `getRepositories()` on first
 * call against the active Db, so this script is primarily useful as a
 * deployment hook that pre-warms a real Postgres before any HTTP traffic
 * hits the app.
 */

import { getDb } from '@/lib/db/client';
import { ensureDatabaseSeeded } from '@/lib/db/bootstrap';

async function main() {
  const db = getDb();
  console.log(
    process.env.DATABASE_URL
      ? '[backfill] target: $DATABASE_URL'
      : '[backfill] target: ephemeral pglite (DATABASE_URL unset)',
  );
  await ensureDatabaseSeeded(db);
  console.log('[backfill] done.');
}

main().catch((err) => {
  console.error('[backfill] FAILED:', err);
  process.exit(1);
});
