## Plan Draft A

### Overview
Simplify the project execution model from `internal` vs `outsourced_lump_sum` to `internal` vs `outsourced`, then enforce the product rule that outsourced projects cannot add BOQ items from WBS or any other current UI/API surface. Normalize the astronomy mock BOQ baseline so the seeded outsourced demo no longer contradicts its stated contract value.

### Files to Change
- `src/types/project.ts` - rename the execution-model enum value and labels.
- `src/data/projects.json` - update seeded execution-model values.
- `src/app/(dashboard)/projects/new/page.tsx` - update execution-model options and defaults.
- `src/app/api/projects/route.ts` - preserve the simplified execution-model contract.
- `src/lib/evm-metrics.ts` - switch outsourced branching to the simplified enum.
- `src/app/(dashboard)/projects/[id]/page.tsx` - update overview labels/branching.
- `src/app/(dashboard)/projects/[id]/progress/page.tsx` - update outsourced checks and labels.
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` - update outsourced checks and labels.
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx` - hide/replace BOQ-create affordances for outsourced projects.
- `src/app/api/boq/[wbsId]/route.ts` - fail closed on outsourced BOQ create attempts.
- `src/data/boq.json` - align astronomy BOQ totals to its stated contract value.
- `tests/e2e/project-outsourced-evm-mode.spec.ts` - update terminology expectations.
- `tests/e2e/project-evm-all-projects-consistency.spec.ts` - update execution-model typing/branching.
- `tests/e2e/project-wbs-boq-coverage.spec.ts` - add outsourced BOQ read-only coverage.
- `tests/e2e/project-create-and-shell.spec.ts` - keep create-flow expectations aligned with the renamed execution model.

### Implementation Steps
TDD sequence:
1. Add or update focused Playwright coverage for outsourced WBS/BOQ behavior and terminology.
2. Run the targeted tests and confirm failure for the expected reason.
3. Implement the smallest runtime changes: enum rename, UI gating, API guard.
4. Normalize the astronomy BOQ fixture so the outsourced seed is coherent.
5. Re-run focused tests, then typecheck/lint/build.

Functions / components:
- `getProjectExecutionModel(...)`
  Keeps the project mode lookup centralized after the enum rename.
- `WbsBOQPage`
  Will compute whether the current project is outsourced, show read-only messaging, and remove BOQ-create affordances while leaving BOQ viewing intact.
- `POST /api/boq/[wbsId]`
  Will reject outsourced BOQ mutations with a deterministic 403 response.

Expected behavior and edge cases:
- Outsourced projects still display BOQ rows but cannot add new ones.
- Internal projects continue to allow BOQ creation.
- Missing project/WBS still returns existing not-found responses.
- BOQ mutation must fail closed for outsourced projects even if a caller bypasses the UI.

### Test Coverage
- `tests/e2e/project-wbs-boq-coverage.spec.ts`
  - `astronomy project exposes BOQ in read-only mode`
  - `internal/generated project still allows BOQ editing affordance`
- `tests/e2e/project-outsourced-evm-mode.spec.ts`
  - `outsourced project still renders owner-side EVM labels`
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - `all seeded projects branch by simplified execution model`
- `tests/e2e/project-create-and-shell.spec.ts`
  - `new internal project still creates BOQ rows successfully`

### Decision Completeness
- Goal:
  - Make outsourced-project semantics clearer and prevent contract BOQ edits from project execution screens.
- Non-goals:
  - Deriving every project budget live from BOQ.
  - Introducing procurement-stage vs post-award lifecycle state.
  - Redesigning WBS mutability.
- Success criteria:
  - No code path still relies on `outsourced_lump_sum`.
  - Outsourced projects show BOQ as read-only in UI.
  - Outsourced BOQ POST attempts return 403.
  - Existing internal BOQ create flow still works.
- Public interfaces:
  - `Project.executionModel: 'internal' | 'outsourced'`
  - create-project API/body keeps `executionModel`
  - BOQ create API returns 403 for outsourced projects
- Edge cases / failure modes:
  - Unknown/legacy execution model falls back to `internal`.
  - Direct POST to BOQ for outsourced project fails closed with 403.
  - Seeded outsourced project with existing BOQ still renders read-only rows.
- Rollout & monitoring:
  - Mock-only rollout; backout by reverting enum rename + BOQ guard.
  - Watch focused Playwright specs and repo gates.
- Acceptance checks:
  - `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts`
  - `npm run e2e -- tests/e2e/project-outsourced-evm-mode.spec.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Dependencies
- Existing Playwright setup and in-memory mock stores.

### Validation
- Load `/projects/proj-001/wbs` and verify BOQ is visible but no add action is available.
- POST to `/api/boq/<outsourced-wbs-id>` should return 403.
- Load `/projects/proj-002/wbs` and verify BOQ create still works for an internal project.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| simplified `Project.executionModel` enum | project create/read flows and project detail pages | `src/types/project.ts`, `src/data/projects.json`, `src/app/api/projects/route.ts` | in-memory `Project` objects |
| outsourced BOQ UI guard | `/projects/[id]/wbs` | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | query data from `/api/projects/:id` and `/api/boq/:wbsId` |
| outsourced BOQ API guard | `POST /api/boq/[wbsId]` | `src/app/api/boq/[wbsId]/route.ts` | in-memory BOQ store |
| astronomy BOQ baseline normalization | seeded WBS/BOQ view and any downstream totals | `src/data/boq.json` | in-memory BOQ store |

### Decision-Complete Checklist
- No open product decisions remain for this slice.
- Every behavior change is mapped to a file and a test.
- Validation commands are concrete and scoped.
- Runtime wiring is explicit for UI and API changes.

## Plan Draft B

### Overview
Keep the existing enum value `outsourced_lump_sum` to minimize churn, and only add outsourced BOQ read-only guards plus astronomy fixture cleanup. This is lower-risk in the short term but keeps the data model semantically muddled.

### Files to Change
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
- `src/app/api/boq/[wbsId]/route.ts`
- `src/data/boq.json`
- `tests/e2e/project-wbs-boq-coverage.spec.ts`

### Implementation Steps
TDD sequence:
1. Add failing outsourced WBS/BOQ regression.
2. Implement UI guard.
3. Implement API guard.
4. Normalize astronomy BOQ totals.
5. Run focused tests and gates.

Functions / components:
- `WbsBOQPage`
  Adds a simple `isOutsourced` guard from the loaded project.
- `POST /api/boq/[wbsId]`
  Checks the project attached to the WBS node before storing the new BOQ item.

### Test Coverage
- `tests/e2e/project-wbs-boq-coverage.spec.ts`
  - `outsourced project hides BOQ create control`
  - `internal project still shows BOQ create control`

### Decision Completeness
- Goal:
  - Enforce read-only BOQ on outsourced projects fast.
- Non-goals:
  - Execution-model cleanup.
  - Broader terminology consistency.
- Success criteria:
  - Outsourced BOQ cannot be created from UI or API.
  - Existing internal behavior remains intact.
- Public interfaces:
  - BOQ create API returns 403 for outsourced projects.
- Edge cases / failure modes:
  - Direct POST still fails closed.
- Rollout & monitoring:
  - Mock-only; backout by reverting two guarded files.
- Acceptance checks:
  - Focused WBS Playwright spec plus repo gates.

### Dependencies
- Existing execution-model field.

### Validation
- Compare WBS pages for one outsourced and one internal project.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| outsourced BOQ UI guard | `/projects/[id]/wbs` | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | query data only |
| outsourced BOQ API guard | `POST /api/boq/[wbsId]` | `src/app/api/boq/[wbsId]/route.ts` | in-memory BOQ store |

### Decision-Complete Checklist
- Minimal slice is executable without new questions.
- Tests cover both UI and API paths.

## Comparative Analysis & Synthesis

### Strengths
- Draft A fixes the semantic mismatch the user called out and removes the misleading lump-sum/outsource conflation.
- Draft B is smaller and lower-churn.

### Gaps
- Draft B leaves the model naming problem in place.
- Draft A still intentionally defers live budget derivation from BOQ because the current mock scenarios are not uniformly complete enough for that behavior.

### Trade-offs
- Draft A touches more files and tests, but it leaves the mockup with a cleaner domain model.
- Draft B is faster but preserves terminology the user explicitly challenged.

### Compliance
- Both drafts stay within current mock API/UI patterns, add fail-closed behavior for mutations, and keep test coverage focused.

## Unified Execution Plan

### Overview
Implement Draft A. Rename the execution model to `outsourced`, enforce read-only BOQ for outsourced projects in both UI and API, and normalize the astronomy BOQ fixture so the core demo no longer contradicts its own contract baseline. Do not add live budget derivation in this slice; the current repo still contains mixed completeness across outsourced scenarios, and forcing derivation now would create broader inconsistencies.

### Files to Change
- `src/types/project.ts` - simplify execution-model enum and labels.
- `src/data/projects.json` - update seeded execution-model values.
- `src/app/(dashboard)/projects/new/page.tsx` - rename execution-model option label/value.
- `src/app/api/projects/route.ts` - preserve simplified enum on create.
- `src/lib/evm-metrics.ts` - swap outsourced branching to the new enum.
- `src/app/(dashboard)/projects/[id]/page.tsx` - update outsourced checks and labels.
- `src/app/(dashboard)/projects/[id]/progress/page.tsx` - update outsourced checks and labels.
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` - update outsourced checks and labels.
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx` - render outsourced BOQ as read-only.
- `src/app/api/boq/[wbsId]/route.ts` - reject outsourced BOQ create attempts.
- `src/data/boq.json` - align `proj-001` seeded BOQ total with `12,500,000`.
- `tests/e2e/project-wbs-boq-coverage.spec.ts` - assert outsourced read-only vs internal editable.
- `tests/e2e/project-outsourced-evm-mode.spec.ts` - update terminology expectations.
- `tests/e2e/project-evm-all-projects-consistency.spec.ts` - align typing and branching with the simplified enum.
- `tests/e2e/project-create-and-shell.spec.ts` - keep internal-create expectations green.

### Implementation Steps
TDD sequence:
1. Add/update Playwright coverage for outsourced WBS/BOQ read-only behavior and execution-model naming.
2. Run the focused specs and confirm they fail for the expected old behavior.
3. Implement enum rename and execution-model comparisons.
4. Implement WBS/UI and BOQ API fail-closed guards for outsourced projects.
5. Normalize astronomy BOQ seed totals to match its `12,500,000` contract baseline.
6. Re-run focused Playwright coverage, then `npm run typecheck`, `npm run lint`, and `npm run build`.

Functions / components:
- `getProjectExecutionModel(project)`
  Remains the single lookup for project mode and will return `'internal' | 'outsourced'`.
- `WbsBOQPage`
  Computes `isOutsourced`, shows a read-only note, and removes the BOQ-create button/modal path for outsourced projects while preserving BOQ visibility.
- `POST /api/boq/[wbsId]`
  Loads the owning project through the WBS node and rejects outsourced BOQ mutation before storing data.

Expected behavior and edge cases:
- Outsourced project BOQ is visible, not editable.
- Internal project BOQ remains editable.
- Direct BOQ POST to outsourced project fails closed with 403.
- Legacy missing execution model still falls back to `internal`.

### Test Coverage
- `tests/e2e/project-wbs-boq-coverage.spec.ts`
  - `astronomy project renders BOQ as read-only`
  - `internal project keeps BOQ add action`
- `tests/e2e/project-outsourced-evm-mode.spec.ts`
  - `outsourced project still renders owner-side payment semantics`
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - `seeded projects branch formulas by simplified execution model`
- `tests/e2e/project-create-and-shell.spec.ts`
  - `new internal project can still add BOQ rows`

### Decision Completeness
- Goal:
  - Make outsourced BOQ immutable in the current mockup and remove unnecessary execution-model over-specificity.
- Non-goals:
  - Real procurement-state workflow.
  - Live contract-value derivation from BOQ across all scenarios.
  - Editing restrictions beyond BOQ mutation.
- Success criteria:
  - No production code or tests compare against `outsourced_lump_sum`.
  - Outsourced BOQ creation is blocked in UI and API.
  - Astronomy seeded BOQ total matches its stated `12,500,000` budget.
  - Internal project BOQ CRUD expectations still pass.
- Public interfaces:
  - `Project.executionModel` values become `'internal' | 'outsourced'`.
  - `POST /api/boq/[wbsId]` returns `403` with outsourced projects.
- Edge cases / failure modes:
  - Missing WBS/project continues returning existing not-found responses.
  - Unauthorized user still receives existing auth/role errors.
  - Outsourced mutation path fails closed before persistence.
- Rollout & monitoring:
  - Mock-only local rollout.
  - Backout is a revert of enum rename + BOQ guards + seed adjustment.
- Acceptance checks:
  - `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts`
  - `npm run e2e -- tests/e2e/project-outsourced-evm-mode.spec.ts`
  - `npm run e2e -- tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Dependencies
- Current Playwright and Next.js mock-app setup.

### Validation
- Visit `/projects/proj-001/wbs` and confirm BOQ rows display with read-only messaging and no add action.
- Visit `/projects/proj-002/wbs` and confirm the add BOQ action remains.
- Visit `/projects/proj-001/s-curve` and confirm outsourced EVM semantics still render.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| simplified `Project.executionModel` | project create flow and project detail reads | `src/types/project.ts`, `src/data/projects.json`, `src/app/api/projects/route.ts` | in-memory `Project` store |
| outsourced WBS BOQ read-only UI | `/projects/[id]/wbs` | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` with `useProject(projectId)` | query data only |
| outsourced BOQ mutation guard | `POST /api/boq/[wbsId]` | `src/app/api/boq/[wbsId]/route.ts` via route registration | in-memory BOQ store |
| astronomy BOQ seed normalization | BOQ GET/read paths and WBS totals | `src/data/boq.json` loaded by `src/lib/boq-store.ts` | in-memory BOQ store |

### Decision-Complete Checklist
- No open implementation questions remain for this slice.
- Public interface changes are listed explicitly.
- Each behavior change has focused test coverage.
- Validation commands are concrete.
- Runtime wiring is documented for every changed component.

## Implementation Summary (2026-03-24 09:53:25 +0700)

### Goal
- Simplify the execution-model terminology to `internal | outsourced`.
- Make outsourced BOQ read-only in both UI and API.
- Normalize the astronomy BOQ fixture so the seeded outsourced demo matches its `12,500,000` contract baseline.

### What Changed
- `src/types/project.ts`
  - Renamed the execution-model union from `outsourced_lump_sum` to `outsourced`.
  - Updated the user-facing label to `จ้างภายนอก`.
  - Added `isOutsourcedProject(...)` to keep BOQ mutability checks centralized.
- `src/data/projects.json`
  - Updated seeded outsourced projects to use the simplified execution-model value.
- `src/lib/evm-metrics.ts`
  - Retargeted outsourced metric branching to the simplified enum while preserving owner-side payment formulas.
- `src/app/api/evm/[projectId]/route.ts`
  - Updated outsourced snapshot handling to the simplified enum.
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Updated overview branching/tag copy to the simplified enum.
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
  - Updated outsourced progress-card branching and payment-gap tone selection.
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
  - Updated outsourced EVM branching and outsourced-row value selection.
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - Added outsourced read-only BOQ messaging.
  - Hid the `+ เพิ่มรายการ BOQ` action for outsourced projects.
  - Guarded the BOQ modal open/submit path to avoid accidental local mutation.
- `src/app/api/boq/[wbsId]/route.ts`
  - Added a fail-closed outsourced-project guard that returns `403` before any BOQ mutation is stored.
- `src/data/boq.json`
  - Added four astronomy BOQ rows so the seeded total now equals `12,500,000`.
- `tests/e2e/project-wbs-boq-coverage.spec.ts`
  - Added outsourced read-only assertions and direct API mutation rejection coverage.
- `tests/e2e/project-outsourced-evm-mode.spec.ts`
  - Updated wording to the simplified outsourced terminology.
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - Updated the execution-model type/branch to `outsourced`.
- `tests/e2e/project-bootstrap-empty-state.spec.ts`
  - Updated the outsourced option label used during project creation.

### TDD Evidence
- RED:
  - Command: `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts`
  - Failure reason: the new outsourced expectation failed because `/projects/proj-001/wbs` still showed editable BOQ behavior and did not render the read-only message.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts tests/e2e/project-outsourced-evm-mode.spec.ts tests/e2e/project-bootstrap-empty-state.spec.ts tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - Result: `6 passed`
  - Command: `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`
  - Result: `4 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts`
- `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts tests/e2e/project-outsourced-evm-mode.spec.ts tests/e2e/project-bootstrap-empty-state.spec.ts tests/e2e/project-evm-all-projects-consistency.spec.ts`
- `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`
- `npm run typecheck && npm run lint && npm run build`

### Wiring Verification Evidence
- `WbsBOQPage` now derives outsourced/read-only behavior from `useProject(projectId)` and blocks the BOQ-create affordance at the route UI.
- `POST /api/boq/[wbsId]` now resolves the owning project through the WBS node and rejects outsourced writes before `store.push(newItem)`.
- EVM/progress/overview pages still branch through `getProjectExecutionModel(project)` and `deriveEvmMetrics(...)`, so the enum rename stays wired through existing runtime entry points.

### Behavior Changes and Risk Notes
- Outsourced BOQ edits now fail closed in the API and are removed from the WBS UI.
- Existing internal BOQ creation remains enabled and covered by Playwright.
- The astronomy BOQ fixture is now coherent with its contract budget.
- Deliberate follow-up gap: live BAC derivation from summed BOQ was not added in this slice because the repo still contains outsourced scenarios with intentionally incomplete BOQ baselines.

### Follow-ups / Known Gaps
- If the mockup later needs budget/BAC derived from BOQ, the remaining outsourced scenarios must be normalized first or split by procurement/contract stage.

## Review (2026-03-24 09:53:25 +0700) - working-tree

### Reviewed
- Repo: `/Users/subhajlimanond`
- Branch: unavailable in current environment (`HEAD` not resolvable at repo root)
- Scope: working tree changes under `dev/nsm-pqm-prototype`
- Commands Run: `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts`, `npm run e2e -- tests/e2e/project-wbs-boq-coverage.spec.ts tests/e2e/project-outsourced-evm-mode.spec.ts tests/e2e/project-bootstrap-empty-state.spec.ts tests/e2e/project-evm-all-projects-consistency.spec.ts`, `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`, `npm run typecheck && npm run lint && npm run build`

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
- Assumed the desired product rule is “all outsourced projects are BOQ read-only in this mockup,” without modeling procurement-stage exceptions.
- Assumed execution-model simplification is acceptable without separate `contractType` data.

### Recommended Tests / Validation
- Keep the outsourced WBS/BOQ read-only Playwright coverage as a regression gate.
- If budget derivation from BOQ is introduced later, add project-by-project fixture consistency tests before switching runtime formulas.

### Rollout Notes
- Mock-only change with fail-closed BOQ mutation behavior for outsourced projects.
- Backout is a revert of the enum rename, WBS/UI guard, API guard, and astronomy BOQ fixture normalization.

## Implementation Summary (2026-03-24 10:00:00 +0700)

### Goal
- Add the outsourced/internal execution type to the dashboard project table.

### What Changed
- `src/app/(dashboard)/dashboard/page.tsx`
  - Added a new `รูปแบบดำเนินงาน (Execution)` table column.
  - Reused `PROJECT_EXECUTION_MODEL_LABELS` so the dashboard shows `โครงการภายใน` and `จ้างภายนอก` consistently.
  - Rendered the values as tags for quick scanning.
- `tests/e2e/dashboard-project-table-execution-model.spec.ts`
  - Added focused Playwright coverage asserting the new column header and both seeded execution-model labels are visible on the dashboard.

### TDD Evidence
- RED:
  - Not recorded for this small additive dashboard-column change. I chose a focused regression spec plus fast gates because the shared execution-model labels already existed and the change did not alter an existing branch or formula.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/dashboard-project-table-execution-model.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/dashboard-project-table-execution-model.spec.ts`
- `npm run typecheck && npm run lint`

### Wiring Verification Evidence
- The new column is wired directly into the dashboard’s `columns` array in `src/app/(dashboard)/dashboard/page.tsx`.
- It consumes the existing `Project.executionModel` field returned by `useProjects()` and the shared label map from `src/types/project.ts`.

### Behavior Changes and Risk Notes
- The dashboard table now exposes execution model alongside project type.
- Low risk: additive UI-only change, no API or state-shape changes.

### Follow-ups / Known Gaps
- If you want, I can also add the same execution-model column to any other project list/table views for consistency.

## Implementation Summary (2026-03-24 10:33:01 +0700)

### Goal
- Fix the project overview page so overall progress matches WBS-derived progress, payment milestones show schedule-health states with narrower phase progress, and KPI cards navigate to the requested detail pages.

### What Changed
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Normalized the header ring input to percentage units (`24.8` instead of `0.248`).
  - Derived milestone display state from top-level Gantt phases using `deriveProjectScheduleHealth(...)` so each payment milestone shows `ล่าช้า`, `เฝ้าระวัง`, or `ตามแผน` instead of a generic in-progress state.
  - Switched milestone progress bars to phase-specific percentages instead of the overall project ratio, and constrained the bar width so it reads as a supporting indicator rather than a full-row meter.
  - Wired the first three KPI cards to `/projects/[id]/s-curve`, the open-issues card to `/projects/[id]/issues`, and the high-risk card to `/projects/[id]/risk`.
- `src/components/charts/CircularProgress.tsx`
  - Kept the ECharts gauge ring, but moved the percentage/label text into real DOM overlay content so the displayed value is accessible and testable instead of canvas-only.
  - Hid the internal ECharts title/detail text to avoid duplicate center labels.
- `tests/e2e/project-overview-page-regressions.spec.ts`
  - Added focused regression coverage for the corrected overview progress text, milestone health badge, narrowed phase progress, and KPI-card navigation.

### TDD Evidence
- RED:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts`
  - Key failure reason: the new overview regression failed because `24.8%` was rendered only inside the ECharts canvas, so Playwright could not locate visible DOM text for the top-right progress ring.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
  - Result: `1 passed`
  - Command: `node <<'EOF' ... EOF` against `npm run start -- --hostname 127.0.0.1 --port 3200`
  - Result: confirmed all five KPI routes navigate to the expected URLs (`s-curve`, `issues`, `risk`) on the production server.

### Tests Run
- `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts`
  - Initial red failure for the canvas-only progress text.
- `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
- `npm run typecheck && npm run lint && npm run build`
- `npm run start -- --hostname 127.0.0.1 --port 3200`
- One-off Playwright verification script against `http://127.0.0.1:3200` confirming:
  - `งบประมาณ` => `/projects/proj-001/s-curve`
  - `SPI` => `/projects/proj-001/s-curve`
  - `จ่ายแล้ว` => `/projects/proj-001/s-curve`
  - `ปัญหาเปิด` => `/projects/proj-001/issues`
  - `ความเสี่ยงสูง` => `/projects/proj-001/risk`

### Wiring Verification Evidence
- The overview header still renders through `ProjectOverviewPage`, but the ring now receives `projectProgressPercent` and displays it via `CircularProgress`.
- Milestone schedule state is wired from `useGantt(projectId)` data through `deriveProjectScheduleHealth(...)` into the `Steps` items on the overview page.
- KPI navigation is wired directly through `KPICard.onClick` to `next/navigation` router pushes for EVM, issues, and risk detail routes.

### Behavior Changes and Risk Notes
- The top-right overview progress now matches the WBS/Gantt-derived overall progress display instead of showing a ratio as a percent.
- Payment milestones now communicate actual schedule health more clearly and no longer reuse the broad overall-progress bar.
- KPI navigation is now explicit and keyboard-accessible through the existing `KPICard` button role handling.
- Tooling note: the full multi-step Playwright navigation spec intermittently hung under the Next dev `webServer`; routing behavior was therefore verified against `next start` after a clean production build.

### Follow-ups / Known Gaps
- If we want the full KPI-navigation Playwright spec to be a stable gate, it should likely run against a production server or use a less stateful dev-server setup to avoid the observed runner hang.

## Implementation Summary (2026-03-24 13:18:59 +0700)

### Goal
- Make the project overview header show the same delayed/on-schedule/watch status that the dashboard shows for active projects.

### What Changed
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Added `projectDisplayStatus` so the overview header now follows the dashboard rule:
    - non-active projects keep their lifecycle status
    - active (`in_progress`) projects display `project.scheduleHealth` with a Gantt-derived fallback
  - Replaced the header badge input from `projectStatus` to `projectDisplayStatus`.
- `tests/e2e/project-overview-page-regressions.spec.ts`
  - Extended the overview regression to require the header badge for `proj-001` to show `ล่าช้า (Delayed)` and to no longer show `กำลังดำเนินการ (In Progress)`.

### TDD Evidence
- RED:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
  - Key failure reason: the new assertion could not find `ล่าช้า (Delayed)` in the overview header because the page was still rendering the raw lifecycle badge `กำลังดำเนินการ (In Progress)`.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
- `npm run typecheck && npm run lint && npm run build`

### Wiring Verification Evidence
- The overview header still derives lifecycle state from `deriveAutoProjectStatus(...)`, but now applies the dashboard-style display mapping before rendering `StatusBadge`.
- The display fallback is wired to `deriveProjectScheduleHealth(ganttData?.data ?? [])`, so the header remains consistent with live Gantt slippage if `project.scheduleHealth` is not yet present.

### Behavior Changes and Risk Notes
- For active projects, the overview header is now a schedule-health display, not a lifecycle-state display.
- This intentionally matches the dashboard table/card semantics, but it also means the overview header no longer visually distinguishes `in_progress` from `delayed/on_schedule/watch` in the badge itself.

### Follow-ups / Known Gaps
- If we want both pieces of information visible, the next refinement would be to show lifecycle state and schedule health as separate badges instead of overloading one badge.

## Implementation Summary (2026-03-24 13:29:23 +0700)

### Goal
- Show both lifecycle state and schedule health in the overview header for active projects.

### What Changed
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Replaced the single overloaded header badge with two badges for active projects:
    - lifecycle status from `deriveAutoProjectStatus(...)`
    - schedule health from `project.scheduleHealth` with a Gantt-derived fallback
  - Non-active projects still show only their lifecycle badge.
- `tests/e2e/project-overview-page-regressions.spec.ts`
  - Updated the overview regression to require both `กำลังดำเนินการ (In Progress)` and `ล่าช้า (Delayed)` in the header for `proj-001`.

### TDD Evidence
- RED:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
  - Key failure reason: after tightening the spec for the intended UX, the header still showed only one badge, so the new expectation for both lifecycle and delayed state failed.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'shows normalized overall progress and milestone health states'`
- `npm run typecheck && npm run lint && npm run build`

### Wiring Verification Evidence
- The overview header badge row now renders `projectStatus` and conditionally `projectScheduleHealth` directly in `src/app/(dashboard)/projects/[id]/page.tsx`.
- The schedule-health badge is still backed by the same derivation path used elsewhere: `project.scheduleHealth` first, then `deriveProjectScheduleHealth(ganttData?.data ?? [])`.

### Behavior Changes and Risk Notes
- Active projects now expose both “work is in progress” and “work is delayed/watch/on schedule” simultaneously in the header.
- This matches the dashboard semantics without losing the lifecycle cue.

### Follow-ups / Known Gaps
- If desired, the explanatory line under the header could be updated later to explicitly say the second badge is schedule health while the first is lifecycle state.

## Implementation Summary (2026-03-24 13:51:56 +0700)

### Goal
- Make the quality module internally consistent across projects so ITP status, inspection records, inspection detail, and auto-NCR issues all agree.

### What Changed
- `src/types/quality.ts`
  - Added `conditional` as a real `ITPStatus` so an inspected-but-failed item no longer has to fall back to `pending`.
- `src/types/risk.ts`
  - Added `sourceInspectionId` and `sourceType` metadata to issues so auto-generated NCR items can be linked back to the originating inspection.
- `src/lib/quality-consistency.ts`
  - Added shared synchronization helpers to derive ITP status from the latest linked inspection record and to create/remove auto-NCR issues from conditional inspection results.
- `src/lib/quality-store.ts`
  - Normalized seeded and generated inspection data on store initialization so cross-project fixture inconsistencies are corrected before the UI reads them.
- `src/lib/issue-store.ts`
  - Synchronized issue seed data against quality inspection records so auto-NCR issues exist when the quality detail page says they should.
- `src/app/api/quality/inspections/route.ts`
  - Replaced the old `conditional -> pending` writeback behavior with shared status synchronization and auto-NCR issue synchronization on create/delete.
- `src/app/(dashboard)/projects/[id]/quality/page.tsx`
  - Added the `ไม่ผ่านเงื่อนไข (CONDITIONAL)` ITP status label and aligned inspection-record result tags with the actual inspection state.
- `src/app/(dashboard)/projects/[id]/quality/inspection/[inspectionId]/page.tsx`
  - Removed the hardcoded fail/NCR presentation so the detail page now reflects `inspection.overallResult`, `inspection.failReason`, and `inspection.autoNCR`.
- `src/hooks/useQuality.ts`
  - Invalidates the issues query after create/delete so auto-NCR changes are visible without a stale cache.
- `tests/e2e/project-quality-consistency.spec.ts`
  - Added a cross-project regression that walks every visible project with quality data and verifies ITP rows, inspection detail, and linked NCR issues stay aligned.

### TDD Evidence
- RED:
  - No standalone pre-fix RED command was recorded for this bug. The inconsistency was first confirmed by direct inspection of the seeded/generated quality fixtures, the quality API behavior, and the user-provided screenshots showing contradictory runtime states.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-quality-consistency.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-quality-consistency.spec.ts`
- `npm run typecheck && npm run lint && npm run build`

### Wiring Verification Evidence
- `getQualityStore()` now normalizes ITP statuses from inspection records at store initialization, so the quality page and detail pages read consistent state from the same source.
- `getIssueStore()` now derives auto-NCR issues from quality inspection records, so the issues page reflects the same inspection outcome shown on the quality detail page.
- `POST /api/quality/inspections` and `DELETE /api/quality/inspections` synchronize both quality and issue stores, so mutations keep the linked pages in sync.
- `useCreateInspection()` and `useDeleteInspection()` invalidate both `['inspections', projectId]` and `['issues', projectId]`, so the React Query cache refreshes the linked views after changes.

### Behavior Changes and Risk Notes
- Conditional inspections now appear as `ไม่ผ่านเงื่อนไข (CONDITIONAL)` in the ITP table instead of incorrectly reverting to `รอตรวจ (PENDING)`.
- Auto-NCR warnings on inspection detail pages now correspond to an actual issue record visible on the project issues page.
- Deleting an inspection removes its linked auto-NCR issue when the issue was created from that inspection.
- The auto-NCR synchronization includes a heuristic match path for pre-existing seeded NCR-like issues; that keeps the mock data tidy, but it means a seeded issue with matching title/WBS/fail reason can be claimed as the linked NCR instead of creating a duplicate.

### Follow-ups / Known Gaps
- If desired, add a direct link from the inspection detail auto-NCR alert to the linked issue or issues page for faster operator workflow.

## Implementation Addendum (2026-03-24 13:56:00 +0700)

### Goal
- Expand the new quality regression so it covers all project gate pipelines as well as inspection/issue consistency.

### What Changed
- `tests/e2e/project-quality-consistency.spec.ts`
  - Added per-project assertions for every gate returned by `/api/quality/gates/:projectId`, checking that both `G<number>` and `gate.name` render on the quality page before the inspection consistency checks run.

### TDD Evidence
- RED:
  - Not separately captured. This was a coverage expansion to the new regression, not a behavior fix after the runtime code had already been corrected.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-quality-consistency.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-quality-consistency.spec.ts`

### Wiring Verification Evidence
- The test now verifies the rendered pipeline against the same source used by the UI: `GET /api/quality/gates/:projectId`, consumed by `useQualityGates()` and rendered via `QualityGatePipeline`.

### Behavior Changes and Risk Notes
- No runtime behavior changed; only regression coverage increased.

### Follow-ups / Known Gaps
- If we later render gate English names or gate-level status badges in the UI, this regression can be expanded to assert those too.

## Implementation Summary (2026-03-24 22:00:11 +0700)

### Goal
- Clarify the overview budget KPI so the secondary amount is clearly identified as spent-to-date for internal projects and paid-to-date for outsourced projects.

### What Changed
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Added a dynamic label above the budget card progress line:
    - `ใช้ไปแล้ว (Actual Cost)` for internal projects
    - `จ่ายแล้วสะสม (Paid to Date)` for outsourced projects
  - Kept the main KPI value as total budget/BAC and the numeric amount as the actual spent/paid amount, but removed the ambiguity about what that second number means.
- `tests/e2e/project-overview-page-regressions.spec.ts`
  - Added a focused regression that checks:
    - `proj-002` shows `ใช้ไปแล้ว (Actual Cost)` with `2,325,000฿`
    - `proj-001` shows `จ่ายแล้วสะสม (Paid to Date)` with `6,250,000฿`

### TDD Evidence
- RED:
  - No standalone pre-fix RED command was recorded. This was a wording clarification driven by observed user confusion rather than a failing automated assertion that already existed.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'clarifies whether the overview budget card shows spent cost or paid-to-date'`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts -g 'clarifies whether the overview budget card shows spent cost or paid-to-date'`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Wiring Verification Evidence
- The new label is wired directly from `executionModel` on the overview page, alongside the existing `budgetSpent` derivation from `deriveEvmMetrics(...)`.
- Internal projects still source the amount from latest `AC`, while outsourced projects still source it from latest `paidToDate`; only the presentation label changed.

### Behavior Changes and Risk Notes
- The overview budget card now makes the secondary amount self-explanatory.
- No metric formulas changed; this is a presentation-only clarification.

### Follow-ups / Known Gaps
- If desired, we can next rename the card title itself to `งบประมาณ / ใช้ไปแล้ว` or split budget and spend into separate KPI cards for even less ambiguity.

## Implementation Summary (2026-03-25 05:59:24 +0700)

### Goal
- Show `ยังไม่เริ่ม (Not Started)` for untouched installments instead of `ตามแผน (On Schedule)`, and apply that consistently from the shared task/phase schedule-health derivation across projects.

### What Changed
- `src/lib/project-progress-derivations.ts`
  - Added a `TaskScheduleHealth` display state with `not_started`.
  - Changed `deriveTaskScheduleHealth(...)` so zero-progress or future tasks return `not_started` instead of `on_schedule`.
  - Added `deriveTaskGroupScheduleHealth(...)` for phase/task-group rollups.
  - Kept `deriveProjectScheduleHealth(...)` as the existing tri-state project-level summary by collapsing all-`not_started` groups back to `on_schedule` for portfolio/project summary use.
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Switched payment-milestone badge derivation to the new task-group rollup so untouched installments now show `ยังไม่เริ่ม (Not Started)`.
- `src/components/common/StatusBadge.tsx`
  - Added the bilingual `ยังไม่เริ่ม (Not Started)` project/status badge entry used by the milestone display.
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - Reused the new task-group rollup for parent rows.
  - Suppressed the schedule-health badge when it is `not_started`, because the Gantt grid already has a base `ยังไม่เริ่ม (Not Started)` execution tag from raw progress and showing both would duplicate the label.
- `tests/e2e/project-overview-page-regressions.spec.ts`
  - Strengthened the existing `proj-001` overview assertion to require two `Not Started` installment badges.
  - Added a new portfolio-wide regression that fetches all projects, their milestones, and their Gantt phase progress, then verifies every zero-progress installment shows `Not Started` on the overview page.

### TDD Evidence
- RED:
  - No standalone pre-fix RED command was recorded. The bug was confirmed from the overview UI itself: untouched installments such as `งวดที่ 3` and `งวดที่ 4` were rendering `ตามแผน (On Schedule)` despite zero started work.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts`
  - Result: the updated overview assertions reported green for:
    - `shows normalized overall progress and milestone health states`
    - `clarifies whether the overview budget card shows spent cost or paid-to-date`
    - `shows not started for every zero-progress installment across all projects`
  - Note: later clean reruns were noisy because Playwright left a webserver bound to `127.0.0.1:3101`, but the new milestone-status case had already passed before that runner churn.

### Tests Run
- `npm run e2e -- tests/e2e/project-overview-page-regressions.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Wiring Verification Evidence
- Overview installment badges now derive from `deriveTaskGroupScheduleHealth(...)` in `src/app/(dashboard)/projects/[id]/page.tsx`, so the display is tied directly to child-task progress rather than defaulting untouched work to `on_schedule`.
- Gantt task/phase rows consume the same underlying `deriveTaskScheduleHealth(...)` / `deriveTaskGroupScheduleHealth(...)` path, so the zero-progress rule is shared rather than page-specific.
- Portfolio/project summary health remains on the existing project-level tri-state because `deriveProjectScheduleHealth(...)` intentionally collapses all-`not_started` groups back to `on_schedule`.

### Behavior Changes and Risk Notes
- Untouched installments now render `ยังไม่เริ่ม (Not Started)` on overview pages instead of misleadingly implying they are already on schedule.
- The change is display-focused for tasks/phases; overall project health summaries remain unchanged to avoid destabilizing dashboard/executive aggregates and filters.
- Gantt rows avoid duplicate `Not Started` chips by suppressing the extra schedule-health badge when the base execution tag already conveys that state.

### Follow-ups / Known Gaps
- If stakeholders want portfolio-level project summaries to distinguish `Not Started` from `On Schedule`, that should be treated as a separate dashboard/executive reporting change because it affects filters, charts, and aggregate counts.

## Implementation Summary (2026-03-24 10:06:00 +0700)

### Goal
- Make the dashboard project table easier to read by stacking English translations under the Thai labels and tightening the table layout.

### What Changed
- `src/app/(dashboard)/dashboard/page.tsx`
  - Added dashboard-only bilingual cell helpers so the Thai label stays on the first line and the English translation moves to the next line.
  - Updated the `Type`, `Execution`, and `Status` cells to use stacked bilingual rendering.
  - Kept the styling local to the dashboard so shared `StatusBadge` behavior elsewhere is unchanged.
  - Added `scroll={{ x: 1280 }}` to the table to reduce squeeze on narrower viewports.
- `tests/e2e/dashboard-project-table-execution-model.spec.ts`
  - Updated the focused dashboard spec to assert the split Thai/English execution labels and English status text remain visible.

### TDD Evidence
- RED:
  - Not separately recorded for this layout-only refinement. This was a presentation refactor on top of the just-added dashboard column, so I used a focused regression spec to lock the intended rendering.
- GREEN:
  - Command: `npm run e2e -- tests/e2e/dashboard-project-table-execution-model.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/dashboard-project-table-execution-model.spec.ts`
- `npm run typecheck && npm run lint`

### Wiring Verification Evidence
- The bilingual render helpers are wired directly into the dashboard `columns` array and consume the existing `Project` data returned by `useProjects()`.
- No shared status component or API contract changed.

### Behavior Changes and Risk Notes
- Dashboard table cells for type/execution/status now read as two-line bilingual entries.
- Horizontal scroll is available for tighter viewports instead of over-compressing the columns.
- Low risk: dashboard-only render adjustment.

## Implementation Summary (2026-03-25 06:30:28 +07)

### Goal
- Ensure every risk in `กำลังจัดการ (Mitigating)` has a corresponding issue entry across all projects, and lock that behavior with a portfolio-wide regression.

### What Changed
- `src/types/risk.ts`
  - Extended `Issue` with `sourceRiskId` and `sourceType: 'risk_mitigation' | 'quality_auto_ncr'` so issues can be explicitly linked back to risks and quality NCRs.
- `src/lib/risk-issue-consistency.ts`
  - Added shared synchronization logic that:
    - finds or creates an issue for each mitigating risk
    - normalizes tags and titles for matching
    - reopens linked issues if they were previously closed
    - assigns severity/SLA defaults from the risk level
    - creates a stable title format: `Risk Mitigation: <risk title>`
- `src/lib/issue-store.ts`
  - Wired mitigating-risk synchronization into issue-store bootstrap so seeded/generated projects are normalized on load.
- `src/app/api/risks/[projectId]/route.ts`
  - Wired risk creation to immediately synchronize the issue store when a new mitigating risk is added.
- `src/hooks/useRisks.ts`
  - Invalidates the project issues query after successful risk creation so the UI reflects the new linked issue without a manual refresh.
- `tests/e2e/project-risk-issue-consistency.spec.ts`
  - Added a portfolio-wide regression that logs in as an admin, iterates every project, finds mitigating risks through the API, and asserts each one has a linked issue visible on that project's issues page.

### TDD Evidence
- RED:
  - No standalone pre-fix RED command was recorded. The defect was confirmed by data/model inspection and the UI screenshots: mitigating risks could exist without any explicit linked issue record, because the risk and issue stores were initialized independently.
- GREEN:
  - `npm run e2e -- tests/e2e/project-risk-issue-consistency.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-risk-issue-consistency.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Wiring Verification Evidence
- Issue store bootstrap now calls `synchronizeMitigatingRiskIssues(...)` in `src/lib/issue-store.ts`, so all seeded/generated project data is normalized before issue APIs/pages read it.
- Risk creation now calls the same synchronization path in `src/app/api/risks/[projectId]/route.ts`, so the runtime behavior matches the bootstrap behavior.
- `useCreateRisk(...)` in `src/hooks/useRisks.ts` invalidates both `['risks', projectId]` and `['issues', projectId]`, so the frontend refreshes both surfaces after mutation.

### Behavior Changes and Risk Notes
- Every mitigating risk now has a corresponding in-progress issue record across all projects.
- Auto-generated mitigation issues are tagged `RISK`, `MITIGATION`, and `AUTO`, and carry the source risk ID for deterministic linkage.
- Matching uses a light heuristic fallback for older data, so pre-existing manually created risk issues can be adopted instead of duplicated when they appear to represent the same mitigation item.
- Initial parallel runs of `typecheck` and `build` produced noisy `.next` artifacts; clean sequential reruns were green.

### Follow-ups / Known Gaps
- Risk rows do not yet link directly to their corresponding issue card/page. Adding that explicit cross-navigation would make the relationship clearer for users.

## Implementation Summary (2026-03-25 06:42:07 +07)

### Goal
- Make issue items navigate to the most relevant project page instead of behaving as dead-end cards.

### What Changed
- `src/app/(dashboard)/projects/[id]/issues/page.tsx`
  - Added a shared issue-destination resolver based on source metadata and tags.
  - Routed quality/NCR issues to quality inspection detail when `sourceInspectionId` exists, otherwise to the quality page.
  - Routed risk-mitigation issues to the risk page.
  - Routed WBS-linked generic issues to the WBS/BOQ page.
  - Routed uncategorized leftovers to project overview as a fallback.
  - Made board cards clickable, list rows clickable, title cells clickable, and closed-column entries individually clickable.
  - Added a small `เปิดที่:` hint on issue cards so the target page is explicit.
- `tests/e2e/project-issue-navigation.spec.ts`
  - Added a focused regression covering NCR-to-quality, mitigation-to-risk, WBS-linked issue-to-WBS, and closed-item navigation.

### TDD Evidence
- RED:
  - No separate RED command was recorded. The defect was confirmed from the UI and screenshots: issue items were visible but not navigable to their source context.
- GREEN:
  - `npm run e2e -- tests/e2e/project-issue-navigation.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-issue-navigation.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Wiring Verification Evidence
- All issue render surfaces on `src/app/(dashboard)/projects/[id]/issues/page.tsx` now consume the same `getIssueDestination(...)` mapping, so board cards, closed summaries, and list rows stay consistent.
- Existing quality/risk/WBS routes were reused; no new route contract was introduced.

### Behavior Changes and Risk Notes
- Users can now jump directly from an issue to the page that best explains or resolves it.
- Quality issues with only legacy `QC`/`NCR` tags but no inspection ID fall back to the quality overview rather than a specific inspection detail.
- Generic issues without source metadata still remain navigable through the overview fallback instead of being non-clickable.

### Follow-ups / Known Gaps
- If you want deep linking for generic WBS-linked issues to auto-select a specific WBS node, that would require carrying a real WBS node ID rather than the current display string.

## Review (2026-03-25 06:42:07 +07) - working-tree

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: unavailable (`git rev-parse --abbrev-ref HEAD` failed because the enclosing git root is not an initialized project branch here)
- Scope: working-tree
- Commands Run: `nl -ba src/app/(dashboard)/projects/[id]/issues/page.tsx`; `nl -ba tests/e2e/project-issue-navigation.spec.ts`; `npm run e2e -- tests/e2e/project-issue-navigation.spec.ts`; `npm run typecheck`; `npm run lint`; `npm run build`

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
- Assumed the desired behavior is destination-by-source-category, not a new dedicated issue detail screen.
- Assumed routing generic WBS-linked issues to the WBS page is preferable to leaving them on the issues page.

### Recommended Tests / Validation
- Manual click-through on a few legacy seed issues after a dev-server restart to confirm no stale in-memory store masks the new destinations.
- Optional accessibility spot-check for keyboard navigation on board cards, since they now behave as interactive links.

### Rollout Notes
- Mock-only change; no API shape change beyond consuming existing issue metadata.
- No data migration needed because legacy issues without source IDs still route through tag/WBS heuristics.

## Implementation Summary (2026-03-25 06:48:26 +07)

### Goal
- Remove the visible `เปิดที่:` helper text from issue cards while preserving the new click-through behavior.

### What Changed
- `src/app/(dashboard)/projects/[id]/issues/page.tsx`
  - Removed the visible destination hint from `IssueCard`.
  - Kept all destination routing, keyboard interaction, and accessibility labeling unchanged.

### TDD Evidence
- RED:
  - No separate RED command was recorded. This was a presentation cleanup on top of already-working navigation behavior.
- GREEN:
  - `npm run e2e -- tests/e2e/project-issue-navigation.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-issue-navigation.spec.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Wiring Verification Evidence
- The clickable routing still runs through the existing destination resolver and card/list click handlers in `src/app/(dashboard)/projects/[id]/issues/page.tsx`; only the visible helper text was removed.

### Behavior Changes and Risk Notes
- Issue cards are visually cleaner.
- Navigation behavior is unchanged.

### Follow-ups / Known Gaps
- None for this tweak.
