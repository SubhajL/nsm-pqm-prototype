# Dual-write soak mode (PR-20)

This document is the operator playbook for the `PERSISTENCE_BACKEND=dual`
soak window introduced by PR-20.

## TL;DR

```bash
# Enable on a preview environment
PERSISTENCE_BACKEND=dual DATABASE_URL=postgres://... npm run start

# After a clean 1-week soak, advance to PR-21 cutover (`db` mode).
```

## What this does

The repository registry (`src/lib/repositories/registry.ts`) decides which
persistence backend serves API routes based on `PERSISTENCE_BACKEND`:

| Value | Read backend | Write backend | When to use |
|---|---|---|---|
| unset / `in_memory` | InMemory | InMemory | Default. Today's behaviour. |
| `dual` | InMemory | **Both** InMemory + Database | **PR-20 soak**. This PR. |
| `db` | Database | Database | **PR-21 cutover**. Not yet validated. |

In `dual` mode every write call (`create`, `update`, `delete`, `append`,
`push`, `add`, `remove`, `upload`, `lockVersion`, etc.) is routed through
a `Proxy` (`dual-write.ts`) that:

1. Awaits the primary (InMemory) write — its result is the response.
2. Awaits the secondary (Database) write — best-effort.
3. On secondary failure: logs to stderr, emits a
   `dual_write_secondary_failed` audit event, and **swallows the error**
   so the request still succeeds. The primary stays authoritative.

Reads are served by the primary only — there is **zero observable
behaviour change for the demo** while soak mode is on.

## When to enable

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

This walks every domain, compares InMemory vs. Database state, and prints
a per-domain OK / DRIFT summary. Exits with code 1 on any drift, so it
plugs into CI / cron with no wrapper.

Each invocation also emits a `dual_write_parity_ok` or
`dual_write_parity_drift` audit event per domain so you can trend the
results over time.

### 3. Startup degradation events

If `PERSISTENCE_BACKEND=dual` is requested but `createDbClient()` throws
(bad `DATABASE_URL`, unreachable host, etc.), the registry **falls back
to `in_memory` mode** rather than crashing startup. A one-shot
`dual_write_fallback_to_in_memory` audit event is emitted so this isn't
silent.

## When to advance to PR-21 cutover

Both must hold:

1. **≥ 1 week** of soak in a preview environment under realistic
   write load.
2. **Zero** `dual_write_secondary_failed` events for the entire window.
3. **Clean** `npm run db:parity-check` on the final day of soak.

When those are satisfied, PR-21 will flip `PERSISTENCE_BACKEND=db` and
retire the InMemory stores.

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
- The wrapper preserves CRUD semantics: see
  `__tests__/dual-write-contract.test.ts` which re-runs PR-18's contract
  tests against `dualWrite(InMemory, Database)`.

## See also

- PR-18: repository abstraction (`registry.ts`, `*.repository.ts`)
- PR-19: Postgres schema + `DatabaseXxxRepository` impls (`src/lib/db/`)
- PR-21: cutover (flip `PERSISTENCE_BACKEND=db`, retire InMemory stores)
