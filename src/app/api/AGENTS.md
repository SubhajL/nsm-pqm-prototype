# API Route AGENTS

## Package Identity
- `src/app/api/` is the backend surface for the prototype.
- Handlers are demo-grade but **persistence is real** — every route reaches
  Postgres via the Drizzle-backed repository registry (PR-21b cutover).
  Treat them as production-shaped routes operating on disposable demo data,
  not as in-memory mocks.

## Setup & Run
- Start the dev server from repo root: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Implement each endpoint in a `route.ts` file under the relevant route
  directory. Co-located `route.test.ts` is the canonical place for unit tests
  on the handler.
- **Persistence:** always reach the database through
  `getRepositories().<domain>` (`src/lib/repositories/registry.ts`). Never
  query Drizzle directly from a route, never reach into `src/data/*.json`
  fixtures — fixtures are seeded into Postgres lazily on first repo call by
  `ensureDatabaseSeeded()` (`src/lib/db/bootstrap.ts`). See the root
  `CLAUDE.md` "Persistence Pattern" section for the full template.
- **Auth + Authz:** mutating routes call `requireProjectAccess(projectId)`
  for the visibility check and `canPerformProjectAction(user, projectId,
  action)` for the action-level gate (see `src/lib/project-api-access.ts`
  and the `AUTHZ_MATRIX`). Edge middleware (`middleware.ts`) handles only
  cookie-presence + URL-prefix admin gating.
- **Audit:** every successful mutation MUST emit one `AuditEvent` via
  `recordAuditEvent(request, { … })` (`src/lib/audit-helpers.ts`) AFTER the
  write commits.
- **Response envelope:** `Response.json({ status: 'success', data: ... })`
  on success; `Response.json({ status: 'error', error: { code, message } },
  { status })` on failure. Reuse the predefined `code` strings already in
  use (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_TRANSITION`, …).
- Read filters from `new URL(request.url).searchParams` in `GET` handlers
  and parse bodies with `await request.json()` in mutation handlers. Use
  `crypto.randomUUID()` for new ids unless a slug shape is required.
- Feature flags belong in `src/lib/feature-flags.ts` and gate via
  `isFeatureEnabled('flag_name')`; gate the flag check **before** the auth
  check so disabled features 503 cleanly without leaking project state.

## Touch Points / Key Files
- Repository registry: `src/lib/repositories/registry.ts`
- Auth helpers: `src/lib/project-api-access.ts` + `src/lib/authz-matrix.ts`
- Audit helper: `src/lib/audit-helpers.ts`
- DB client + migrations: `src/lib/db/client.ts` + `src/lib/db/migrate.ts`
- Canonical persistence template: root `CLAUDE.md`
- Scenario inventory: `IMPLEMENTATION_PLAN.md`
- Fixture-specific rules: `src/data/AGENTS.md`

## JIT Index Hints
- Find all handlers: `find src/app/api -name 'route.ts'`
- Find JSON responses: `rg -n "Response\\.json" src/app/api --type ts`
- Find repository usages: `rg -n "getRepositories\\(\\)" src/app/api --type ts`
- Find audit emissions: `rg -n "recordAuditEvent" src/app/api --type ts`
- Find request body parsing: `rg -n "request\\.json\\(" src/app/api --type ts`

## Common Gotchas
- The DB is shared across handlers — writes in one route ARE visible to the
  next request. Tests that mutate state must `resetGlobalStores()` /
  `vi.resetModules()` to isolate.
- `getRepositories()` is synchronous but every method returns a Promise
  gated on `ensureDatabaseSeeded(db)` — first-request latency on a fresh DB
  pays the seed cost once.
- Edge-runtime middleware can't reach Postgres; if a route's auth depends
  on DB-only state, do the check inside the route handler (Node runtime),
  not in middleware.
- Document/daily-report uploads return BOTH `url` (raw blob URL) and
  `signedUrl` (proxied `/api/documents/_blob/signed?…` URL with a 5-minute
  TTL). The raw `url` won't work for `access: 'private'` blobs in the
  browser. The safest pattern is: persist whatever the upload helper
  returns, AND re-sign on read via `refreshSignedUrl()` in the GET handler
  so older records stay renderable. The `key` query param embedded in the
  signedUrl is the durable identifier; the `expires`/`sig` are
  per-response.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
