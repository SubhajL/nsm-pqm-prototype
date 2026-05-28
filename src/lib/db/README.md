# `src/lib/db` — Postgres persistence layer (PR-19)

This directory contains the Drizzle-ORM Postgres adapter that PR-19 introduces:

- `schema/` — table definitions (one file per domain) and shared `pgEnum`s
- `repositories/` — `DatabaseXxxRepository` impls satisfying the PR-18
  repository interfaces
- `client.ts` — singleton DB client (real Postgres when `DATABASE_URL` is set;
  in-memory pglite otherwise)
- `migrate.ts` — SQL migration runner (consumes `drizzle/migrations/*.sql`)

> **Status:** **NOT WIRED INTO ROUTES YET.** Per the MVP execution plan, PR-19
> adds the Postgres adapter capability; PR-20 introduces dual-write soak;
> PR-21 cuts reads. Until then `getRepositories()` returns the InMemory
> implementations.

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
`runXxxRepositoryContract` functions against fresh pglite instances. The
same contracts run against the InMemory impls in
`src/lib/repositories/__tests__/inmemory.test.ts`. Both runners must pass
on every PR — this proves the two backends are behaviourally equivalent
and unblocks the PR-21 cutover.
