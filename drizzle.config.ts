import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit config — used by `npm run db:generate` to emit migrations
 * under `./drizzle/migrations`. The runtime DB client lives in
 * `src/lib/db/client.ts` and reads `DATABASE_URL` itself; this file is
 * config for the migration tool only.
 *
 * Defaults to a local pglite data dir when `DATABASE_URL` is unset so
 * `drizzle-kit push` / `studio` work without provisioning.
 */
const databaseUrl = process.env.DATABASE_URL ?? 'pglite://./.pglite-dev';

export default {
  dialect: 'postgresql',
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle/migrations',
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
} satisfies Config;
