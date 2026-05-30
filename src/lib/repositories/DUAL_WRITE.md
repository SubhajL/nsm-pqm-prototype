# Dual-write mode (historical reference — PR-20/PR-21/PR-21b)

> **Status: cutover complete (PR-21b).** Postgres is the only persistence
> backend. The `'dual'` env-var value is retained as a no-op alias for
> `'db'` so existing deployments keep working, but there is no longer a
> separate primary/secondary pair — every read AND write hits Postgres.
> The historical playbook below is kept for institutional memory.

## What this used to do

The repository registry (`src/lib/repositories/registry.ts`) chose a
persistence backend based on `PERSISTENCE_BACKEND`:

| Value (historical) | Read backend | Write backend | When |
|---|---|---|---|
| unset / `in_memory` | InMemory | InMemory | Default through PR-21. |
| `dual` | InMemory | **Both** InMemory + Database | Soak window (PR-20). |
| `db` | Database | Database | Database-canonical. |

In `dual` mode every write call was routed through a `Proxy` that:

1. Awaited the primary (InMemory) write — its result was the response.
2. Awaited the secondary (Database) write — best-effort.
3. On secondary failure: logged + emitted a
   `dual_write_secondary_failed` audit event and swallowed the error so
   the request still succeeded.

## PR-21b cutover summary

- Refactored ~12 API routes from in-place mutation
  (`project.x = next` after `findById()`) to explicit `.update()` calls.
- Added repository methods for sub-collection operations:
  - `GanttRepository.replaceProjectData(projectId, data)`
  - `QualityInspectionRepository.updateInspection(id, patch)`
  - `QualityInspectionRepository.updateItpStatus(itemId, status)`
  - `DocumentRepository.updateFileMetadata(projectId, fileId, patch)`
  - `DatabaseQualityInspectionRepository.addItpItem(item)` (bootstrap)
- Made auth + sync helpers async (`getActiveUser`, `requireProjectAccess`,
  `canPerformProjectAction`, `syncProjectExecutionState`,
  `getDerivedMilestonesForProject`, `bootstrapProjectData`, etc.).
- `getRepositories()` now wraps every Database repo in a Proxy that
  awaits `ensureDatabaseSeeded(db)` before invoking any method — so
  routes never observe an unmigrated/empty schema.
- Deleted: 18 `*-store.ts` modules + the dual-write wrapper +
  parity-check tooling + their tests.
- Kept: `src/lib/user-store.ts` (Edge-safe read-only seed for
  `middleware.ts`, which can't reach Postgres from the Edge runtime).

## Operator notes (current)

- Set `DATABASE_URL` to point at a real Postgres (Neon, on-prem, etc.).
  Without it the app falls back to an ephemeral pglite — convenient for
  dev/tests, but state is lost on restart.
- Fresh deployments: `npm run db:migrate && npm run db:seed` (both
  idempotent — `ensureDatabaseSeeded()` does the same work on first
  HTTP call).
- `PERSISTENCE_BACKEND=in_memory` is no longer supported — passing it
  logs a warning and falls back to `db`.
- `PERSISTENCE_BACKEND=dual` is accepted as a no-op alias for `db`
  (back-compat with any Vercel preview that still has it set).

## See also

- PR-18: repository abstraction (`registry.ts`, `*.repository.ts`)
- PR-19: Postgres schema + `DatabaseXxxRepository` impls (`src/lib/db/`)
- PR-20: dual-write soak introduction
- PR-21: blob retirement, `ensureDatabaseReady()`, parity tooling
- PR-21b: this cutover (default flip + InMemory retirement)
