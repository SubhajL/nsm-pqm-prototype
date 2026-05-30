# `src/lib/db` — Postgres persistence layer

This directory contains the Drizzle-ORM Postgres adapter introduced by PR-19:

- `schema/` — table definitions (one file per domain) and shared `pgEnum`s
- `repositories/` — `DatabaseXxxRepository` impls satisfying the PR-18
  repository interfaces
- `client.ts` — singleton DB client (real Postgres when `DATABASE_URL` is set;
  in-memory pglite otherwise) + `ensureDatabaseReady()` readiness probe
- `migrate.ts` — SQL migration runner (consumes `drizzle/migrations/*.sql`)

> **Status (post-PR-21):** the Database backend is fully functional behind
> `PERSISTENCE_BACKEND=db` (and `dual`). The blob-snapshot infrastructure
> (`project-demo-state.ts`) has been retired. **The default backend remains
> `in_memory`** until the in-place-mutation refactor lands — see
> `src/lib/repositories/DUAL_WRITE.md` "Post-cutover work" for details.

## Hosting target (stakeholder decision)

- **Demoable MVP:** Neon Postgres (managed Postgres, free tier).
- **On-prem / GDCC migration later:** schema is portable Postgres only — no
  Neon-specific extensions per PR-19 spec. Migration is a deployment swap.
- **Dev + tests:** pglite (in-memory). No credential provisioning needed.

## Switching to a real Postgres database

```bash
export DATABASE_URL=postgres://user:pass@host:5432/dbname   # Neon URL or self-hosted
npm run db:migrate    # applies drizzle/migrations/*.sql
npm run db:seed       # backfills DB from src/data/*.json fixtures (idempotent)
```

Without `DATABASE_URL`, all of the above target an ephemeral pglite instance
— useful for smoke-testing the scripts.

## Adding a new table

1. Add a `*.schema.ts` file under `src/lib/db/schema/` and re-export from
   `schema/index.ts`.
2. If you reference a new RID vocabulary union, mirror it as a `pgEnum` in
   `schema/enums.ts`.
3. Add a matching `DatabaseXxxRepository` under `repositories/` that
   implements the PR-18 interface.
4. Wire the contract test in `repositories/__tests__/database-contract.test.ts`.
5. `npm run db:generate` to emit a new migration file under
   `drizzle/migrations/`.
6. Commit the migration file alongside the schema change.

## Testing strategy

`repositories/__tests__/database-contract.test.ts` re-uses the PR-18
`runXxxRepositoryContract` functions against fresh pglite instances. This
is the authoritative behavioural test for the Database backend.

The old in-memory contract runner (`src/lib/repositories/__tests__/inmemory.test.ts`)
and the dual-write contract runner (`dual-write-contract.test.ts`) were
removed in PR-21 — they were redundant once the Database backend became
the soak target. The CRUD wrapper unit tests
(`src/lib/repositories/__tests__/dual-write.test.ts`) and the parity
helper tests (`dual-write-parity.test.ts`) remain useful.

## Readiness probe

Routes that used to call `ensureProjectDemoStateHydrated()` before reading
from the in-memory stores can now call `ensureDatabaseReady()`:

```ts
import { ensureDatabaseReady } from '@/lib/db/client';

export async function GET() {
  await ensureDatabaseReady();
  const repos = getRepositories();
  // ...
}
```

`ensureDatabaseReady()` issues a memoised `SELECT 1` against the DB
client. It is a no-op after the first successful call (per process).
Routes that don't need a startup-time DB check can skip it — Drizzle's
lazy connection handles the first real query just fine.
