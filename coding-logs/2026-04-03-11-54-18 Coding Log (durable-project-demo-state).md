# Durable Project Demo State

Timestamp: 2026-04-03 11:54:18 +07:00

Auggie semantic search was unavailable due to `429 Too Many Requests`; this plan is based on direct file inspection plus exact-string searches.

Inspected files:
- `AGENTS.md`
- `src/AGENTS.md`
- `src/app/AGENTS.md`
- `src/app/api/AGENTS.md`
- `package.json`
- `playwright.config.ts`
- `src/lib/project-store.ts`
- `src/lib/project-membership-store.ts`
- `src/lib/project-bootstrap.ts`
- `src/lib/project-api-access.ts`
- `src/lib/project-access.ts`
- `src/lib/project-execution-sync.ts`
- `src/lib/boq-store.ts`
- `src/lib/wbs-store.ts`
- `src/lib/gantt-store.ts`
- `src/lib/milestone-store.ts`
- `src/lib/document-store.ts`
- `src/lib/quality-store.ts`
- `src/lib/quality-gate-store.ts`
- `src/lib/risk-store.ts`
- `src/lib/issue-store.ts`
- `src/lib/daily-report-store.ts`
- `src/lib/evm-store.ts`
- `src/lib/change-request-store.ts`
- `src/lib/notification-store.ts`
- `src/lib/audit-log-store.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/team/[projectId]/route.ts`
- `src/app/api/wbs/[projectId]/route.ts`
- `src/app/api/boq/[wbsId]/route.ts`
- `src/app/api/gantt/[projectId]/route.ts`
- `src/app/api/risks/[projectId]/route.ts`
- `src/app/api/issues/[projectId]/route.ts`
- `src/app/api/quality/inspections/route.ts`
- `src/app/api/quality/gates/[projectId]/route.ts`
- `src/app/api/daily-reports/route.ts`
- `src/app/api/daily-reports/[id]/route.ts`
- `src/app/api/documents/[projectId]/route.ts`
- `src/app/api/evm/[projectId]/route.ts`
- `src/app/api/change-requests/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/auth/login-options/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/milestones/[projectId]/route.ts`
- `tests/e2e/project-create-and-shell.spec.ts`

## Plan Draft A

### 1. Overview

Introduce a shared durable demo-state snapshot for all project-scoped mutable stores. Load that snapshot once per server instance, hydrate existing arrays and objects in place so current route modules keep working, and persist the snapshot after every project-scoped mutation. Use Vercel Blob in deployed environments and a repo-local file fallback in local development.

### 2. Files to Change

- `src/lib/project-demo-state.ts`: new persistence module that loads, hydrates, snapshots, and saves demo state.
- `src/app/api/projects/route.ts`: hydrate before reads/writes and persist after project creation.
- `src/app/api/projects/[id]/route.ts`: hydrate before reads/writes and persist after project status edits.
- `src/app/api/team/[projectId]/route.ts`: hydrate before membership reads/writes and persist team mutations.
- `src/app/api/wbs/[projectId]/route.ts`: hydrate before reads/writes and persist WBS mutations.
- `src/app/api/boq/[wbsId]/route.ts`: hydrate before reads/writes and persist BOQ mutations.
- `src/app/api/gantt/[projectId]/route.ts`: hydrate before reads/writes and persist Gantt mutations.
- `src/app/api/risks/[projectId]/route.ts`: hydrate before reads/writes and persist risk mutations.
- `src/app/api/issues/[projectId]/route.ts`: hydrate before reads/writes and persist issue mutations.
- `src/app/api/quality/inspections/route.ts`: hydrate before reads/writes and persist inspection mutations.
- `src/app/api/quality/gates/[projectId]/route.ts`: hydrate before reads.
- `src/app/api/daily-reports/route.ts`: hydrate before reads/writes and persist report creation.
- `src/app/api/daily-reports/[id]/route.ts`: hydrate before reads/writes and persist status transitions plus notifications.
- `src/app/api/documents/[projectId]/route.ts`: hydrate before reads/writes and persist document/audit changes.
- `src/app/api/evm/[projectId]/route.ts`: hydrate before reads/writes and persist EVM changes.
- `src/app/api/change-requests/route.ts`: hydrate before reads/writes and persist change-request/audit changes.
- `src/app/api/notifications/route.ts`: hydrate before reads/writes and persist notification read-state changes.
- `src/app/api/auth/login-options/route.ts`: hydrate before project-count calculations.
- `src/app/api/auth/login/route.ts`: hydrate before project-duty checks.
- `src/app/api/milestones/[projectId]/route.ts`: hydrate before milestone derivation.
- `.gitignore`: ignore the local durable state file.
- `tests/e2e/project-demo-state-persistence.spec.ts`: regression test that proves mutations are saved durably in local dev.

### 3. Implementation Steps

TDD sequence:
1. Add a Playwright regression that creates a project and asserts a durable state file contains the new project.
2. Run that test and confirm it fails because no durable state file is written.
3. Implement the persistence module plus route hydration/persist hooks.
4. Refactor minimally to keep route code repetitive but explicit.
5. Run the targeted test, then repo gates.

Function names and responsibilities:
- `ensureProjectDemoStateHydrated()`: one-time async loader that seeds existing stores, reads persisted state, and mutates live stores in place.
- `persistProjectDemoState()`: collects the current live snapshot and writes it to Blob or local disk.
- `readPersistedProjectDemoState()`: reads the durable snapshot from Blob or the repo-local file.
- `writePersistedProjectDemoState(snapshot)`: writes the durable snapshot to Blob or the repo-local file.
- `applyProjectDemoStateSnapshot(snapshot)`: mutates all live stores in place so module-scope store references stay valid.
- `captureProjectDemoStateSnapshot()`: serializes all project-scoped mutable stores.

Expected behavior and edge cases:
- Missing persisted state should fall back to seeded demo fixtures.
- Blob or file read failures should fail open for reads but log enough detail for debugging.
- Mutation writes should fail closed enough to surface server errors rather than silently pretending durability exists when the save failed.
- Hydration must preserve array/object identities for routes that capture stores at module scope.

### 4. Test Coverage

`tests/e2e/project-demo-state-persistence.spec.ts`
- `writes created projects to the durable demo state file`
  Verifies project creation triggers durable snapshot output.
- `persists project bootstrap artifacts for the new project`
  Verifies related WBS/Gantt/document seed data is also present.

### 5. Decision Completeness

Goal:
- Make project-scoped demo mutations durable across Vercel cold starts and local dev restarts.

Non-goals:
- Replace mock/demo APIs with a real database.
- Make admin-only user/org mutations durable unless they are already included as project-side effects.
- Solve multi-writer concurrency beyond acceptable demo-level last-write-wins behavior.

Success criteria:
- Creating or editing project-scoped data writes a durable snapshot.
- Fresh server instances can hydrate project-scoped state from durable storage.
- Local regression test proves a create flow writes durable state.
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass.

Public interfaces:
- New env dependency usage: `BLOB_READ_WRITE_TOKEN` for deployed durable state.
- New local artifact: `.data/project-demo-state.json`.
- No external API contract changes.

Edge cases / failure modes:
- No snapshot exists: load seeded state.
- Snapshot read fails: load seeded state and continue.
- Snapshot write fails: return server error on mutation route rather than silently lying about persistence.
- Multiple concurrent writes: last write wins.

Rollout & monitoring:
- No feature flag; the persistence layer becomes the default path.
- Backout plan is to remove route save hooks and revert to in-memory stores.
- Watch Vercel function logs for Blob read/write failures.

Acceptance checks:
- `npx playwright test tests/e2e/project-demo-state-persistence.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### 6. Dependencies

- Existing `@vercel/blob` package.
- Node `fs/promises` and `path` for local fallback.

### 7. Validation

Run the targeted Playwright regression, then repo-level gates, then a live create/edit smoke test against the Vercel deployment.

### 8. Wiring Verification

| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `src/lib/project-demo-state.ts` | project-scoped route handlers | direct imports in API route files | Blob pathname `demo-state/project-demo-state.json`; local file `.data/project-demo-state.json` |
| hydration hook | top of API handlers before access checks | explicit `await ensureProjectDemoStateHydrated()` calls | N/A |
| persist hook | end of mutation handlers | explicit `await persistProjectDemoState()` calls | N/A |

## Plan Draft B

### 1. Overview

Add a narrower persistence layer focused only on the root `projects` and a few directly edited stores, leaving derived data to regenerate on demand. This reduces the saved surface area but requires more regeneration logic and risks missing side-effect stores such as notifications, audit logs, and bootstrap artifacts.

### 2. Files to Change

- `src/lib/project-demo-state.ts`: snapshot only root project entities and bootstrap from derived helpers.
- `src/lib/project-bootstrap.ts`: add deterministic re-bootstrap guards for hydrated projects.
- Smaller subset of route files for direct mutations.
- `.gitignore`
- `tests/e2e/project-demo-state-persistence.spec.ts`

### 3. Implementation Steps

TDD sequence:
1. Add regression proving a created project survives a reload driven by regenerated bootstrap data.
2. Confirm it fails against the current in-memory implementation.
3. Implement narrower snapshot plus deterministic re-bootstrap.
4. Run targeted tests and repo gates.
5. Add smoke verification for changed regeneration paths.

Function names and responsibilities:
- `ensureProjectRegistryHydrated()`: hydrate only projects and memberships.
- `rebuildProjectScopedArtifacts(projectId)`: regenerate WBS, Gantt, documents, quality, and milestones for missing projects.
- `persistProjectRegistry()`: save only the root registry entities.

Expected behavior and edge cases:
- Regeneration must not overwrite user edits in bootstrap-generated stores.
- Missing secondary stores need deterministic rebuilds.
- Any mutation in regenerated stores still needs a second persistence path or the edits are lost.

### 4. Test Coverage

`tests/e2e/project-demo-state-persistence.spec.ts`
- `created project survives fresh read path`
  Verifies the registry is durable.
- `bootstrap artifacts regenerate consistently`
  Verifies deterministic rebuild output.

### 5. Decision Completeness

Goal:
- Make newly created projects visible after hydration with less saved state.

Non-goals:
- Durably preserve every project-side mutation.
- Preserve notifications, audit logs, or change-request histories.

Success criteria:
- Newly created projects survive hydration.
- Bootstrap data regenerates deterministically.
- Repo gates pass.

Public interfaces:
- Same Blob token usage and local file fallback as Draft A.

Edge cases / failure modes:
- Edits to regenerated stores can still disappear.
- Regeneration bugs can drift from previously edited state.
- Fail-open on regeneration gaps can hide data loss.

Rollout & monitoring:
- Same rollout/backout shape as Draft A.
- Additional need to monitor regeneration mismatches.

Acceptance checks:
- targeted Playwright regression
- repo gates

### 6. Dependencies

- Existing `@vercel/blob` package.
- Deterministic bootstrap behavior from current seed generators.

### 7. Validation

Verify the created project remains accessible after hydration and that derived pages still render.

### 8. Wiring Verification

| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| narrow registry persistence | project creation/login/dashboard reads | direct imports in root project routes and auth routes | Blob pathname `demo-state/project-demo-state.json`; local file `.data/project-demo-state.json` |
| regeneration hook | project detail and project-scoped page loads | `project-bootstrap` / derived helper imports | N/A |

## Comparative Analysis & Synthesis

Strengths:
- Draft A covers the real user complaint: mutable project state disappearing after deployment.
- Draft B changes fewer files and keeps the snapshot smaller.

Gaps:
- Draft B does not actually make edited WBS/Gantt/daily-report/quality/document state durable.
- Draft A needs more route patches, but it avoids hidden regeneration drift.

Trade-offs:
- Draft A is broader and more explicit.
- Draft B is lighter, but it preserves only part of the user-visible mutation graph.

Compliance:
- Draft A best matches the user request and the existing route design.
- Draft B conflicts with the request because it intentionally leaves mutable project edits non-durable.

## Unified Execution Plan

### 1. Overview

Implement a single durable snapshot for all project-scoped mutable demo state and wire every project-scoped route to hydrate before access and persist after writes. Keep the current store modules and route shapes intact by mutating live arrays and objects in place instead of rewriting the whole data-access layer.

### 2. Files to Change

- `src/lib/project-demo-state.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/team/[projectId]/route.ts`
- `src/app/api/wbs/[projectId]/route.ts`
- `src/app/api/boq/[wbsId]/route.ts`
- `src/app/api/gantt/[projectId]/route.ts`
- `src/app/api/risks/[projectId]/route.ts`
- `src/app/api/issues/[projectId]/route.ts`
- `src/app/api/quality/inspections/route.ts`
- `src/app/api/quality/gates/[projectId]/route.ts`
- `src/app/api/daily-reports/route.ts`
- `src/app/api/daily-reports/[id]/route.ts`
- `src/app/api/documents/[projectId]/route.ts`
- `src/app/api/evm/[projectId]/route.ts`
- `src/app/api/change-requests/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/auth/login-options/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/milestones/[projectId]/route.ts`
- `.gitignore`
- `tests/e2e/project-demo-state-persistence.spec.ts`

### 3. Implementation Steps

TDD sequence:
1. Add `tests/e2e/project-demo-state-persistence.spec.ts`.
2. Run `npx playwright test tests/e2e/project-demo-state-persistence.spec.ts` and confirm RED because `.data/project-demo-state.json` is not created.
3. Implement `src/lib/project-demo-state.ts` with:
   - one-time hydration promise
   - Blob/local read path
   - live snapshot capture
   - in-place apply helpers for arrays, records, nested objects, and `Set`
4. Add `await ensureProjectDemoStateHydrated()` to every project-scoped read/write route before access checks or store usage.
5. Add `await persistProjectDemoState()` to every project-scoped mutation route after successful mutations and after side effects such as notifications or audit logs.
6. Run the targeted regression until GREEN.
7. Run full repo gates.
8. Do a live Vercel smoke test for create/read persistence behavior.

Function names and behavior:
- `ensureProjectDemoStateHydrated()`
  Seeds all current stores once, then overlays any persisted snapshot in place. Uses a shared promise so concurrent requests do not race initialization.
- `persistProjectDemoState()`
  Captures the full project-scoped snapshot from the live stores and writes it durably. Throws on write failure so mutation handlers do not falsely report success.
- `captureProjectDemoStateSnapshot()`
  Pulls the current values from all relevant stores: projects, memberships, milestones, WBS, BOQ, Gantt, documents, quality gates, quality records, risks, issues, daily reports, EVM points/registry, change requests, notifications, and audit logs.
- `applyProjectDemoStateSnapshot(snapshot)`
  Replaces live contents in place for arrays, maps-by-record, nested document/gantt objects, and the EVM registry `Set`.
- `readPersistedProjectDemoState()` / `writePersistedProjectDemoState()`
  Use Vercel Blob private access when `BLOB_READ_WRITE_TOKEN` exists, otherwise use `.data/project-demo-state.json`.

Expected behavior and edge cases:
- Reads still work from seed data when no snapshot exists.
- Hydration happens before any project access check so newly created projects remain accessible on fresh instances.
- Save failures fail closed on mutation routes because pretending a write persisted would be incorrect.
- Concurrency remains last-write-wins, acceptable for a demo deployment.

### 4. Test Coverage

`tests/e2e/project-demo-state-persistence.spec.ts`
- `writes created project state to durable storage`
  Confirms a create flow generates the durable snapshot file.
- `stores bootstrap data for the created project`
  Confirms the persisted snapshot includes related WBS/Gantt/document bootstrap state.

### 5. Decision Completeness

Goal:
- Make project creation and project-scoped edits durable on Vercel and in local dev.

Non-goals:
- Introduce a production-grade database or multi-actor conflict handling.
- Persist unrelated admin datasets unless they are part of project-scoped side effects already captured here.

Success criteria:
- A successful mutation writes a durable snapshot.
- Fresh requests can hydrate from durable storage and still resolve project access correctly.
- The targeted regression goes RED before the change and GREEN after it.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

Public interfaces:
- Durable storage uses `BLOB_READ_WRITE_TOKEN` when available.
- Local dev uses `.data/project-demo-state.json`.
- No response-envelope changes.

Edge cases / failure modes:
- Missing snapshot: fail open to seed data.
- Corrupt snapshot: log and fail open to seed data.
- Save failure: fail closed on the mutation request.
- Concurrent saves: last writer wins.

Rollout & monitoring:
- Default-on rollout with no feature flag.
- Backout by reverting the route hooks and persistence module.
- Watch Vercel logs for Blob read/write or JSON parse failures.

Acceptance checks:
- `npx playwright test tests/e2e/project-demo-state-persistence.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### 6. Dependencies

- `@vercel/blob`
- Node `fs/promises`
- Node `path`

### 7. Validation

Local:
- Targeted RED/GREEN Playwright regression.
- Full repo gates.

Hosted:
- Create a project through the deployed UI or API.
- Read it back from a fresh request path.
- Confirm no Blob write errors in Vercel logs.

### 8. Wiring Verification

| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `src/lib/project-demo-state.ts` | API route handlers | imported directly by project/auth API routes | Blob pathname `demo-state/project-demo-state.json`; local file `.data/project-demo-state.json` |
| hydration hook | start of GET/POST/PATCH/DELETE handlers | explicit `await ensureProjectDemoStateHydrated()` in each touched route | N/A |
| persist hook | successful mutation exits | explicit `await persistProjectDemoState()` in write handlers | N/A |

## Review (2026-04-03 12:03:04 +0700) - working-tree

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: working-tree
- Commands Run: `git diff --name-only`; `git diff -- src/lib/project-demo-state.ts tests/e2e/project-demo-state-persistence.spec.ts playwright.config.ts src/app/api`; `npm run typecheck`; `npx playwright test tests/e2e/project-demo-state-persistence.spec.ts`; `npm run lint`; `npm run build`; `npx playwright test tests/e2e/project-create-and-shell.spec.ts`

### Findings
CRITICAL
- No findings.

HIGH
- No findings.

MEDIUM
- No findings.

LOW
- No findings.

### Open Questions / Assumptions
- Assumed last-write-wins Blob/local-file snapshot behavior is acceptable for a demo deployment.
- Assumed unrelated admin-only datasets do not need the same durable treatment in this change.

### Recommended Tests / Validation
- Create and edit project-scoped data on the hosted app, then verify the data remains visible on a fresh request path.
- Watch Vercel function logs for Blob read/write failures after rollout.

### Rollout Notes
- Mutation routes now fail if the durable snapshot write fails; that is intentional to avoid claiming persistence when the save did not complete.
- Local Playwright runs use an isolated `PROJECT_DEMO_STATE_FILE` so repeated test invocations do not leak state across runs.

## Implementation Summary (2026-04-03 12:10:52 +0700)

### Goal
Make project-scoped demo mutations durable across local restarts and Vercel instance churn, then verify the hosted app can create and read back a new project through the new persistence path.

### What Changed
- `src/lib/project-demo-state.ts`
  Added a shared durable snapshot layer for project-scoped state. It hydrates the existing stores in place, writes the live snapshot to Blob on Vercel or a local `.data` file in dev, and serializes writes per instance.
- `src/app/api/...`
  Wired `ensureProjectDemoStateHydrated()` into project/auth read paths and `persistProjectDemoState()` into project-scoped mutation handlers so create/edit flows now save durably after success.
- `tests/e2e/project-demo-state-persistence.spec.ts`
  Added a regression proving project creation writes the durable snapshot and includes bootstrap artifacts for the new project.
- `playwright.config.ts`
  Isolated Playwright state into `.data/playwright-project-demo-state.json` so repeated e2e runs do not leak durable state across invocations.
- `.gitignore`
  Ignored `.data/` because it now holds local durable demo-state files.

### TDD Evidence
- RED command: `npx playwright test tests/e2e/project-demo-state-persistence.spec.ts`
- RED failure reason: the new test timed out waiting for the durable state file because the old implementation only mutated in-memory stores.
- GREEN command: `npx playwright test tests/e2e/project-demo-state-persistence.spec.ts`
- GREEN result: the test passed once the snapshot file was written and contained the created project plus bootstrap data.

### Additional Validation
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npx playwright test tests/e2e/project-create-and-shell.spec.ts` ✅
- Production deploy: `vercel --prod --yes` ✅
- Production probe: login -> `POST /api/projects` -> fresh login -> `GET /api/projects/:id` and `/api/projects?search=...` ✅

### Wiring Verification Evidence
- Entry-point wiring: project/auth API routes import and await `ensureProjectDemoStateHydrated()` before using project access or store state.
- Mutation wiring: project-scoped write routes await `persistProjectDemoState()` after successful mutations and related side effects such as notifications or audit logs.
- Storage wiring: local dev writes to `.data/project-demo-state.json`; hosted deploy writes to Blob pathname `demo-state/project-demo-state.json`.

### Behavior Changes And Risks
- Project creation, team edits, WBS/BOQ, Gantt, daily reports, quality records, documents, EVM, change requests, notifications, and audit-log-backed project flows now persist instead of disappearing on cold start.
- Blob storage uses public access because the connected store is public; this is acceptable here because the repo already treats all data as mock/demo-only.
- Concurrency remains last-write-wins. That is a deliberate demo-level tradeoff, not a production-grade conflict strategy.

### Follow-ups / Known Gaps
- If you want stronger confidentiality or fresher cache control for the snapshot, the next step is a separate private store or a real database/KV layer.
- Admin-only datasets outside the project-scoped flow were not moved onto the new durable path in this change.

### Git / Deploy
- Branch: main
- Commits: `827dbc5` `fix: persist project demo state`; `c37efb5` `fix: use public blob access for demo state`
- Production URL: `https://nsm-pqm-prototype.vercel.app`
