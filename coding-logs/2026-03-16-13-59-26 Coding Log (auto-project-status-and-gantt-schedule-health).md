# Planning Log

Timestamp: 2026-03-16 13:59:26 +07:00
Task: auto-project-status-and-gantt-schedule-health

Note: Auggie semantic search was intentionally skipped. This repo has a known history of Auggie latency; planning below is based on direct file inspection plus exact-string searches.
Inspected files:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/executive/page.tsx`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/gantt/[projectId]/route.ts`
- `src/hooks/useProjects.ts`
- `src/lib/project-execution-sync.ts`
- `src/lib/project-progress-derivations.ts`
- `src/lib/gantt-store.ts`
- `src/types/project.ts`
- `tests/e2e/project-gantt-propagation.spec.ts`
- `tests/e2e/project-create-and-shell.spec.ts`

## Plan Draft A

### Overview
Add a project execution derivation layer that converts live Gantt task state into two outputs: auto-managed business status (`planning`, `in_progress`, `completed`) and schedule health (`on_schedule`, `delayed`). Wire that derivation into the existing Gantt sync path and into project read APIs so both newly edited and already-seeded projects return consistent status data.

### Files To Change
- `src/types/project.ts`: add schedule-health type/field.
- `src/lib/project-progress-derivations.ts`: add pure helpers for deriving business status and schedule health from Gantt/WBS.
- `src/lib/project-execution-sync.ts`: update project summary fields after Gantt writes.
- `src/app/api/projects/route.ts`: derive/sync visible projects on list reads.
- `src/app/api/projects/[id]/route.ts`: derive/sync a single project on detail reads; narrow manual PATCH semantics.
- `src/app/(dashboard)/dashboard/page.tsx`: replace `spiValue`-based delayed logic with derived schedule health.
- `src/app/(dashboard)/projects/[id]/page.tsx`: stop presenting core business status as a manual selector.
- `src/app/(dashboard)/executive/page.tsx`: align delayed-project count with derived schedule health.
- `tests/e2e/project-gantt-propagation.spec.ts`: extend propagation proof to business status and dashboard health.
- `tests/e2e/project-create-and-shell.spec.ts`: update project-creation flow for auto status.

### Implementation Steps
TDD sequence:
1. Extend/adjust focused Playwright coverage for status and schedule-health propagation.
2. Run the focused test and confirm it fails because project status and dashboard health still use manual/`spiValue` logic.
3. Implement derivation helpers.
4. Wire derivation into sync and project reads.
5. Update UI consumers and rerun focused tests.
6. Run lint/build/typecheck plus the relevant Playwright specs.

Functions:
- `deriveProjectScheduleHealth(tasks, now?)`
  Computes `delayed` when any executable Gantt task is past its end date without completion; otherwise returns `on_schedule`.
- `deriveAutoProjectStatus(project, weightedProgress, tasks)`
  Returns `completed` when progress is complete, `in_progress` when execution has started, else `planning`, while preserving manual exceptional states.
- `syncProjectExecutionState(projectId, options?)`
  Extend existing progress sync so project summary fields are updated together, not just `project.progress`.
- `syncVisibleProjectsExecutionState(projects)`
  Ensures list/detail APIs return derived state even when a project has not been edited in the current session.

Expected behavior and edge cases:
- `draft`, `on_hold`, and `cancelled` remain manual-only; the derivation must not overwrite them.
- Projects with no executable Gantt tasks should stay `planning` and default schedule health to `on_schedule`.
- A project can be `in_progress` and `delayed` at the same time.

### Test Coverage
- `project-gantt-propagation.spec.ts :: editing delayed task updates derived project status`
  Confirms Gantt edits drive project status off manual state.
- `project-gantt-propagation.spec.ts :: dashboard uses gantt slippage not spiValue`
  Confirms delayed/on-schedule view changes after Gantt edit.
- `project-create-and-shell.spec.ts :: new project auto-shows planning without manual selector`
  Confirms created projects no longer require status selection.

### Decision Completeness
- Goal: auto-manage execution status and dashboard schedule health from live Gantt state.
- Non-goals: redesigning milestone logic, changing SPI/CPI calculations, introducing backend persistence.
- Success criteria:
  - project detail no longer depends on manual selection for core execution states
  - dashboard delayed/on-schedule changes after Gantt edits even if `spiValue` stays unchanged
  - tests prove list/detail/UI alignment
- Public interfaces:
  - `Project` gains a derived schedule-health field
  - no new endpoints; existing project and Gantt endpoints return updated shape
- Edge cases / failure modes:
  - fail closed for invalid PATCH statuses
  - fail open for projects with empty Gantt data by deriving `planning` + `on_schedule`
- Rollout & monitoring:
  - no flag; mock-only in-memory rollout
  - monitor dashboard/project overview consistency in tests
- Acceptance checks:
  - `npx playwright test ...`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing Gantt store/task model
- Existing query invalidation in `useGantt`

### Validation
- Edit a delayed task and confirm dashboard/project detail change together.
- Create a new project and confirm it starts as `planning` without manual status selection.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `deriveProjectScheduleHealth` | project sync + project reads | imported by sync/API modules | N/A |
| `deriveAutoProjectStatus` | project sync + project reads | imported by sync/API modules | N/A |
| schedule health field on `Project` | `/api/projects`, `/api/projects/[id]` | React Query consumers via `useProjects` / `useProject` | in-memory `project-store` |

## Plan Draft B

### Overview
Keep the existing project store shape mostly unchanged and derive both business status and delayed/on-schedule entirely in UI selectors. This minimizes write-path changes but duplicates derivation logic between dashboard, executive, and project detail consumers.

### Files To Change
- `src/lib/project-progress-derivations.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/executive/page.tsx`
- `tests/e2e/project-gantt-propagation.spec.ts`

### Implementation Steps
TDD sequence:
1. Add UI-level failing tests.
2. Implement pure selectors that read Gantt data separately from project data.
3. Patch dashboard/overview/executive pages to use those selectors.
4. Run tests and quality gates.

Functions:
- `getProjectDisplayStatus(project, ganttData)`
  Derives business status at render time.
- `getProjectScheduleHealth(project, ganttData)`
  Derives delayed/on-schedule at render time.

Expected behavior and edge cases:
- Dashboard and overview improve, but API consumers outside those pages still see stale status fields.

### Test Coverage
- `project-gantt-propagation.spec.ts :: dashboard selector reacts to gantt edit`
- `project-gantt-propagation.spec.ts :: overview selector reacts to gantt edit`

### Decision Completeness
- Goal: improve visible consistency with fewer write-path changes.
- Non-goals: API consistency, store normalization.
- Success criteria: dashboard/project detail visuals update.
- Public interfaces: no API shape change.
- Edge cases / failure modes: risk of duplicated logic and selector drift.
- Rollout & monitoring: UI-only, low risk.
- Acceptance checks: focused Playwright + gates.

### Dependencies
- UI consumers must fetch enough Gantt data to derive state.

### Validation
- Verify dashboard and project detail after Gantt edit.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| UI selector helpers | dashboard/overview/executive pages | imports in each page | N/A |

## Comparative Analysis & Synthesis

Strengths:
- Draft A keeps API, dashboard, overview, and executive reads consistent through one shared derivation.
- Draft B changes fewer files and is faster to wire.

Gaps:
- Draft B leaves `/api/projects` stale and invites divergence across pages.
- Draft A needs one careful decision about manual exceptional statuses.

Trade-offs:
- Draft A is slightly heavier but gives one canonical model.
- Draft B is lighter but only fixes the currently visible screens.

Compliance:
- Draft A better follows the repo’s “one mock API / many consumers” pattern.
- Draft B risks more duplicated UI logic than the codebase currently uses.

## Unified Execution Plan

### Overview
Implement a canonical execution-derivation path in shared library code and use it in both the Gantt sync write path and project read APIs. Preserve manual exceptional states (`draft`, `on_hold`, `cancelled`), auto-manage `planning` / `in_progress` / `completed`, and replace dashboard delayed/on-schedule logic with Gantt-derived schedule health.

### Files To Change
- `src/types/project.ts`: add `ProjectScheduleHealth`.
- `src/lib/project-progress-derivations.ts`: add `deriveProjectScheduleHealth`, `deriveAutoProjectStatus`.
- `src/lib/project-execution-sync.ts`: calculate `project.progress`, `project.status`, and `project.scheduleHealth`.
- `src/app/api/projects/route.ts`: call sync/derivation for visible projects before returning them.
- `src/app/api/projects/[id]/route.ts`: sync on detail GET; reject manual PATCH for auto-managed states.
- `src/app/(dashboard)/dashboard/page.tsx`: use `project.scheduleHealth`.
- `src/app/(dashboard)/projects/[id]/page.tsx`: remove manual core-status selector and show auto-status guidance.
- `src/app/(dashboard)/executive/page.tsx`: delayed KPI from `project.scheduleHealth`.
- `tests/e2e/project-gantt-propagation.spec.ts`: cover status + health propagation.
- `tests/e2e/project-create-and-shell.spec.ts`: remove manual status-selection step and assert planning.

### Implementation Steps
TDD sequence:
1. Extend Playwright specs for auto status and dashboard slippage.
2. Run those specs to capture RED.
3. Add derivation helpers in `project-progress-derivations.ts`.
4. Extend `project-execution-sync.ts` to set `project.status` and `project.scheduleHealth`.
5. Trigger derivation on project list/detail reads.
6. Update dashboard, overview, and executive page consumers.
7. Run focused Playwright GREEN.
8. Run `npm run lint`, `npm run build`, `npm run typecheck`.

Functions:
- `deriveProjectScheduleHealth(tasks, now?)`
  Uses executable Gantt task dates and completion to compute delayed/on-schedule.
- `deriveAutoProjectStatus(project, weightedProgress, tasks)`
  Auto-manages normal execution states while preserving exceptional states.
- `syncProjectExecutionState(projectId, options?)`
  Single canonical place that writes derived execution fields into the project store.
- `getProjectDisplayStatus(project)`
  Dashboard helper simplified to prefer stored derived schedule health.

Expected behavior and edge cases:
- New projects with empty Gantt stay `planning`.
- Overdue unfinished tasks mark an active project as `delayed` regardless of `spiValue`.
- Completed projects show `completed` and do not appear as `delayed`.
- `on_hold`, `cancelled`, `draft` remain manually assigned and are never auto-overwritten.

### Test Coverage
- `tests/e2e/project-gantt-propagation.spec.ts`
  - `editing a seeded gantt task updates derived project status`
  - `dashboard delayed state comes from gantt slippage`
- `tests/e2e/project-create-and-shell.spec.ts`
  - `new project starts in planning without manual override UI`

### Decision Completeness
- Goal: make project execution state derive from live schedule execution.
- Non-goals: replacing SPI/CPI, redesigning milestones, persisting beyond in-memory mock stores.
- Success criteria:
  - project detail shows derived core status without manual picking
  - dashboard/executive delayed counts no longer use `spiValue`
  - focused E2E tests pass
- Public interfaces:
  - `Project.scheduleHealth?: 'on_schedule' | 'delayed'`
  - `PATCH /api/projects/[id]` no longer accepts forcing `planning`, `in_progress`, or `completed`
- Edge cases / failure modes:
  - if a task is overdue and incomplete => `delayed`
  - if no tasks started => `planning`
  - if exceptional manual status is set => preserve it and do not auto-overwrite
  - fail closed on invalid manual PATCH input
- Rollout & monitoring:
  - no feature flag; mock-only
  - watch Playwright flows that traverse dashboard -> project detail -> Gantt
- Acceptance checks:
  - `npx playwright test tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - `npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing in-memory project and Gantt stores.
- Existing query invalidation from `useGantt`.

### Validation
- Edit a delayed task and confirm:
  - project detail status changes automatically
  - dashboard delayed/on-schedule changes even when `spiValue` does not
- Create a new project and confirm it remains `planning` until execution work starts.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `deriveProjectScheduleHealth` | Gantt write sync and project API GETs | imports in `project-execution-sync.ts`, `api/projects/route.ts`, `api/projects/[id]/route.ts` | in-memory `project-store` |
| `deriveAutoProjectStatus` | Gantt write sync and project API GETs | imports in same locations | in-memory `project-store` |
| `Project.scheduleHealth` | dashboard/executive/project overview React Query reads | `useProjects`, `useProject` consumers | in-memory `project-store` |

## Implementation Summary

Timestamp: 2026-03-16 14:38:00 +07:00

Goal:
- Auto-manage `planning` / `in_progress` / `completed` from live Gantt execution.
- Drive dashboard delayed/on-schedule from Gantt slippage instead of `spiValue`.

What changed:
- `src/types/project.ts`
  - Added `ProjectScheduleHealth` and optional `project.scheduleHealth`.
- `src/lib/project-progress-derivations.ts`
  - Added shared pure helpers:
    - `getExecutableGanttTasks`
    - `deriveProjectScheduleHealth`
    - `deriveAutoProjectStatus`
  - Schedule health uses the repo’s demo reporting date (`2026-07-15`) and marks a project delayed when any executable Gantt task is overdue and unfinished.
- `src/lib/project-execution-sync.ts`
  - Extended sync to update `project.status` and `project.scheduleHealth` together with `project.progress`.
  - Added fallback progress derivation from average Gantt task progress when a project has no WBS nodes yet.
- `src/app/api/projects/route.ts`
  - Syncs visible projects before filtering/returning them so dashboard/list consumers get derived execution state.
  - New projects now default `scheduleHealth` to `on_schedule`.
- `src/app/api/projects/[id]/route.ts`
  - Syncs the project before returning detail data.
  - Manual PATCH is now limited to exceptional statuses (`draft`, `on_hold`, `cancelled`); core execution states are no longer manually forceable.
- `src/app/(dashboard)/dashboard/page.tsx`
  - `getProjectDisplayStatus()` now uses `project.scheduleHealth` instead of `spiValue`.
- `src/app/(dashboard)/executive/page.tsx`
  - Executive delayed count now uses `project.scheduleHealth`.
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Removed the manual core-status selector.
  - Added guidance that the main project status is derived from Gantt.
  - Hardened the overview display by deriving status/progress from live Gantt data on the client as well, which keeps the page truthful immediately after schedule edits.
- `tests/e2e/project-gantt-propagation.spec.ts`
  - Expanded to prove project detail + dashboard schedule health are driven by Gantt edits.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Updated to assert that a newly created project starts in `planning` without a manual status combobox.

TDD evidence:
- RED command:
  - `npx playwright test tests/e2e/project-create-and-shell.spec.ts tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
- RED failure reasons:
  - project overview still exposed the manual status combobox
  - dashboard/project APIs still reflected old progress/status logic
- GREEN command:
  - `npx playwright test tests/e2e/project-create-and-shell.spec.ts tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - Result: `4 passed`

Tests run:
- `npx playwright test tests/e2e/project-create-and-shell.spec.ts tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - Passed (`4 passed`)
- `npm run lint -- --file 'src/app/(dashboard)/projects/[id]/page.tsx'`
  - Passed
- `npm run lint`
  - Passed with pre-existing warnings in:
    - `src/app/(dashboard)/projects/[id]/issues/page.tsx`
    - `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - Passed
- `npm run typecheck`
  - Passed

Wiring verification:
- Gantt write path:
  - `src/app/api/gantt/[projectId]/route.ts`
  - `POST` / `PATCH` / `DELETE` already call `syncProjectExecutionState(projectId, ...)`
- Project read path:
  - `src/app/api/projects/route.ts` now calls `syncProjectExecutionState(project.id)` for visible projects before list filtering/return
  - `src/app/api/projects/[id]/route.ts` now calls `syncProjectExecutionState(params.id)` before returning detail
- UI consumers:
  - `src/app/(dashboard)/dashboard/page.tsx` consumes derived `project.scheduleHealth`
  - `src/app/(dashboard)/executive/page.tsx` consumes derived `project.scheduleHealth`
  - `src/app/(dashboard)/projects/[id]/page.tsx` consumes derived project status and progress

Behavior changes and risk notes:
- `planning`, `in_progress`, and `completed` are now derived from execution state instead of being manually selected in the overview UI.
- `draft`, `on_hold`, and `cancelled` remain manual exception states.
- Delayed/on-schedule is now schedule-based, not cost/performance-index based.
- Remaining nuance:
  - For brand-new projects, server-side mock stores are still in-memory and can be sensitive to dev-server worker boundaries on unrelated modules. The requested status/health features are verified for seeded project flows and initial new-project planning state.
