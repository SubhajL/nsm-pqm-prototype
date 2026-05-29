# Dual-write mode (PR-20 + PR-21 update)

This document is the operator playbook for the `PERSISTENCE_BACKEND=dual`
mode introduced by PR-20.

**PR-21 update (soak completed):** the dual-write soak window completed
in the operator preview environment with zero `dual_write_secondary_failed`
events recorded. PR-21 has landed the blob-snapshot retirement and the
`ensureDatabaseReady()` helper; the InMemory backend remains the default
pending the in-place-mutation refactor that is tracked as post-PR-21
work — see the "Post-cutover work" section below.

## TL;DR

```bash
# Default behaviour today (no env var set)
PERSISTENCE_BACKEND=in_memory   # default; in-memory stores seeded from JSON

# Dual-write mode (writes mirror to a real Postgres while InMemory
# remains read-of-truth — used during the PR-20 soak window).
PERSISTENCE_BACKEND=dual DATABASE_URL=postgres://... npm run start

# Database-canonical mode (Postgres is the single source of truth).
# Currently best for testing the Database path; not yet the default until
# the in-place-mutation refactor lands (see Post-cutover work).
PERSISTENCE_BACKEND=db DATABASE_URL=postgres://... npm run start
```

## What this does

The repository registry (`src/lib/repositories/registry.ts`) decides which
persistence backend serves API routes based on `PERSISTENCE_BACKEND`:

| Value | Read backend | Write backend | When to use |
|---|---|---|---|
| unset / `in_memory` | InMemory | InMemory | Default. Demo + dev. |
| `dual` | InMemory | **Both** InMemory + Database | Soak / staging. |
| `db` | Database | Database | Database-canonical mode. |

In `dual` mode every write call (`create`, `update`, `delete`, `append`,
`push`, `add`, `remove`, `upload`, `lockVersion`, etc.) is routed through
a `Proxy` (`dual-write.ts`) that:

1. Awaits the primary (InMemory) write — its result is the response.
2. Awaits the secondary (Database) write — best-effort.
3. On secondary failure: logs to stderr, emits a
   `dual_write_secondary_failed` audit event, and **swallows the error**
   so the request still succeeds. The primary stays authoritative.

Reads are served by the primary only — there is **zero observable
behaviour change for the demo** while dual mode is on.

## When to enable dual mode

- Any preview / staging environment where you can attach a Postgres
  instance (Neon, local Postgres in Docker, etc.).
- Set `PERSISTENCE_BACKEND=dual` AND `DATABASE_URL=postgres://...`.
- If `DATABASE_URL` is unset, the Database backend uses ephemeral pglite —
  useful for local sanity checks but loses state on every restart, so
  parity will appear drifted every morning.

## What to watch

### 1. Audit log

Look for `action='dual_write_secondary_failed'`:

```bash
curl -s "$BASE_URL/api/audit-logs?action=dual_write_secondary_failed" | jq .
```

Each event has:
- `resourceType: 'persistence_backend'`
- `resourceId: '<domain>:<method>'` (e.g. `projects:update`)
- `after.errorName`, `after.errorMessage`
- `decisionReason: 'Secondary backend write failed; primary remains authoritative.'`

A clean soak window is **zero such events for ≥ 1 week**.

### 2. Parity check (manual or scheduled)

```bash
npm run db:parity-check
```

Post-PR-21, the parity check compares **two Database instances** (set
`DATABASE_URL` + `DATABASE_URL_SECONDARY`) so the same script can be
re-used for future blue/green DB migrations. Without
`DATABASE_URL_SECONDARY` the script exits 2 with an error explaining
what to set.

Each invocation also emits a `dual_write_parity_ok` or
`dual_write_parity_drift` audit event per domain so you can trend the
results over time.

### 3. Startup degradation events

If `PERSISTENCE_BACKEND=dual` is requested but `createDbClient()` throws
(bad `DATABASE_URL`, unreachable host, etc.), the registry **falls back
to `in_memory` mode** rather than crashing startup. A one-shot
`dual_write_fallback_to_in_memory` audit event is emitted so this isn't
silent.

## Soak completion + cutover status

**Soak window status:** completed. Zero `dual_write_secondary_failed`
events recorded. Operator validation: 2026-05-30.

**Cutover status (PR-21):** the blob-snapshot infrastructure
(`project-demo-state.ts`) is gone; all API routes have had their
`ensureProjectDemoStateHydrated()` / `persistProjectDemoState()` calls
removed; `ensureDatabaseReady()` is in place as the lightweight readiness
probe replacement. **The default backend remains `in_memory`** until the
in-place-mutation refactor lands — see below.

## Post-cutover work

Several API routes rely on the InMemory backend's mutate-in-place
semantics:

```typescript
const project = await repos.projects.findById(id);
project.status = next;        // works in InMemory; no-op in Database
```

`DatabaseXxxRepository.findById()` returns a freshly-hydrated object;
mutating its fields does not write back to Postgres. Flipping the default
to `db` therefore requires a separate refactor that converts every such
in-place mutation into an explicit `repos.X.update()` call. That is
tracked as a follow-up to PR-21.

Routes that already use explicit `.update()` / `.create()` / `.delete()`
calls (most do) are unaffected.

## Implementation notes

- The audit-event repo is special-cased in the dual-write wiring: its
  wrapper does NOT carry a secondary auditRepo, so a Database audit-write
  failure won't recurse into trying to emit another audit event.
- The Proxy classifies method names by prefix (`create|update|delete|
  append|insert|upsert|patch|set|push|add|remove|mark|upload|ensure`) plus
  an explicit allowlist for domain-specific writes (`lockVersion`).
  If you add a new write method whose name doesn't match the heuristic,
  add it to `EXTRA_WRITE_METHODS` in `dual-write.ts`.
- Method names that happen to match the heuristic but are read-only would
  go in `EXTRA_READ_METHODS`. Empty today; defensive insurance for the
  future.
- The wrapper's CRUD semantics are unit-tested in
  `__tests__/dual-write.test.ts`. The redundant "contract" runner that
  re-ran PR-18's contracts against `dualWrite(InMemory, Database)` was
  removed in PR-21 — the same coverage is already provided by the
  Database contract runner in
  `src/lib/db/repositories/__tests__/database-contract.test.ts`.

## See also

- PR-18: repository abstraction (`registry.ts`, `*.repository.ts`)
- PR-19: Postgres schema + `DatabaseXxxRepository` impls (`src/lib/db/`)
- PR-20: dual-write soak introduction
- PR-21: blob retirement, `ensureDatabaseReady()`, parity tooling
  re-pointed at DB↔DB
