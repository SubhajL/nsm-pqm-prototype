# Mock API AGENTS

## Package Identity
- `src/app/api/` is the mock backend surface for the prototype.
- Every handler here should behave like a demo-safe in-memory API, not a production service.

## Setup & Run
- Start the dev server from repo root: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Implement each endpoint in a `route.ts` file under the relevant route directory.
- Import seed data from `src/data/` and keep any mutable store at module scope so mutations persist only for the current dev session.
- Match the response envelope documented in `CLAUDE.md`: `Response.json({ status: 'success', data: ... })`.
- Read filters from `new URL(request.url).searchParams` in `GET` handlers.
- Parse request bodies with `await request.json()` in mutation handlers and generate demo IDs with `crypto.randomUUID()` when needed.
- Keep behavior mock-only: data resets on server restart, there is no external database, and no secrets should appear in handlers.
- If an endpoint starts to carry real business logic, document the contract in the route folder and keep fixture shape in sync with `src/data/`.

## Touch Points / Key Files
- Canonical mock API pattern: `CLAUDE.md`
- Scenario inventory driving endpoints: `IMPLEMENTATION_PLAN.md`
- Fixture-specific rules: `src/data/AGENTS.md`

## JIT Index Hints
- Find all handlers: `find src/app/api -name 'route.ts'`
- Find JSON responses: `rg -n "Response\\.json" src/app/api --type ts`
- Find in-memory stores: `rg -n "^let .*=" src/app/api --type ts`
- Find request body parsing: `rg -n "request\\.json\\(" src/app/api --type ts`

## Common Gotchas
- Persistence during a dev session is intentional; do not add durable storage patterns here unless the architecture changes.
- Keep route behavior deterministic and demo-safe; no external API calls without an explicit architecture update.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
