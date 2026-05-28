/**
 * PR-19 — Apply pending migrations against the active DB.
 *
 * Reads `DATABASE_URL` (real Postgres) or falls back to an ephemeral pglite
 * — useful for smoke-testing the migrator without provisioning a database.
 *
 * Run with: `npm run db:migrate`
 */

import { getDb } from '@/lib/db/client';
import { runMigrations } from '@/lib/db/migrate';

async function main() {
  const db = getDb();
  console.log(
    process.env.DATABASE_URL
      ? '[migrate] target: $DATABASE_URL'
      : '[migrate] target: ephemeral pglite (DATABASE_URL unset)',
  );
  await runMigrations(db);
  console.log('[migrate] done.');
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err);
  process.exit(1);
});
