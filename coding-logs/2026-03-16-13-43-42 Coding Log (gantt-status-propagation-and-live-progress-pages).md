## Plan Draft A

### Overview
Introduce a server-side synchronization step after Gantt writes so task progress flows into WBS rollups and project summary progress. Then replace the static Progress page with live derived data from WBS, Gantt, project, and EVM queries.

### Files To Change
- `src/lib/project-execution-sync.ts` - shared rollup/synchronization logic for WBS and project summary.
- `src/app/api/gantt/[projectId]/route.ts` - call the sync routine after POST/PATCH/DELETE.
- `src/hooks/useGantt.ts` - invalidate `wbs`, `project`, and `projects` queries after successful writes.
- `src/app/(dashboard)/projects/[id]/progress/page.tsx` - replace static demo arrays with live derived data.
- `tests/e2e/project-gantt-propagation.spec.ts` - verify a Gantt update changes WBS/overview/progress surfaces.

### Implementation Steps
TDD sequence:
1. Add a focused Playwright regression covering Gantt -> WBS -> overview -> Progress propagation.
2. Run it and confirm it fails because only the Gantt page updates today.
3. Add server-side synchronization from Gantt store into WBS and project store.
4. Make the Progress page consume live derived values.
5. Run focused E2E and full repo gates.

Functions / logic:
- `syncProjectExecutionState(projectId)`:
  - map Gantt leaf tasks onto WBS leaf nodes
  - roll up parent WBS progress by child weights
  - update project progress and milestone counts
- `buildWeightingRows(nodes)`:
  - top-level WBS rows for the Progress page
- `buildPhysicalRows(nodes)`:
  - show BOQ-bearing work packages and their live completion
- `buildEvmMetrics(project, evmData)`:
  - generate live EVM cards and EV/BAC summary

### Test Coverage
- `project-gantt-propagation.spec.ts`
  - Gantt edit updates WBS row progress
  - Gantt edit updates project overview progress
  - Gantt edit updates Progress page weighting summary

### Decision Completeness
- Goal: Gantt progress edits must propagate to the main related project surfaces.
- Non-goals: full dependency CRUD redesign, changing project status from manual to automatic.
- Success criteria:
  - editing a seeded Gantt task changes WBS progress for the matching work package
  - project overview progress changes accordingly
  - Progress page no longer uses static demo arrays
- Public interfaces: existing APIs only; no route shape changes.
- Edge cases:
  - task has no WBS match -> keep task-only change, no WBS sync
  - empty/new project -> Progress page still renders valid empty or zero state
  - deleted task that previously matched WBS -> WBS falls back to remaining matched tasks / existing value
- Rollout/monitoring: mock-data only; no migration needed
- Acceptance checks:
  - focused Playwright propagation test passes
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing Gantt, WBS, project, and EVM stores/hooks.

### Validation
- Playwright scenario on `proj-001`, then repo gates.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `syncProjectExecutionState` | Gantt POST/PATCH/DELETE | `src/app/api/gantt/[projectId]/route.ts` | in-memory project/WBS stores |
| Live Progress page derivations | `projects/[id]/progress` render | `src/app/(dashboard)/projects/[id]/progress/page.tsx` | query responses only |

## Plan Draft B

### Overview
Avoid mutating WBS/project stores on Gantt write. Instead, derive WBS-equivalent and project summary progress at read time on pages that need it. This reduces write-side coupling but leaves the stores as partially stale snapshots.

### Files To Change
- `src/lib/project-progress-derivations.ts`
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`

### Implementation Steps
TDD sequence:
1. Add the same E2E propagation spec.
2. Confirm failure.
3. Implement page-level derivations from Gantt data.
4. Run gates.

### Test Coverage
- Same focused Playwright scenario.

### Decision Completeness
- Goal: users see consistent progress across pages.
- Non-goals: store normalization
- Success criteria:
  - pages read consistently after Gantt edit
  - no server mutation side effects
- Edge cases:
  - page without Gantt query cannot reflect live updates unless updated too

### Validation
- Focused E2E + repo gates.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| Page-level derivations | overview/progress/dashboard render | page components listed above | query responses only |

## Comparative Analysis

- Draft A is stronger because the WBS page itself needs to become consistent after Gantt edits, and WBS reads only the WBS store today.
- Draft B would still leave store-backed pages stale unless each one were individually rewritten to ignore the store.
- Draft A keeps the current architecture but adds a shared synchronization point with lower page-by-page duplication.

## Unified Execution Plan

### Overview
Implement a shared server-side execution sync triggered by Gantt writes, and make the Progress page fully live-data-driven. This keeps WBS, overview, dashboard, and Progress aligned without forcing every page to independently re-derive from raw Gantt tasks.

### Files To Change
- `src/lib/project-execution-sync.ts`
- `src/app/api/gantt/[projectId]/route.ts`
- `src/hooks/useGantt.ts`
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
- `tests/e2e/project-gantt-propagation.spec.ts`

### Implementation Steps
TDD sequence:
1. Add `tests/e2e/project-gantt-propagation.spec.ts`.
2. Run it and confirm the current failure:
   - Gantt task progress changes but WBS/overview/progress remain stale.
3. Implement `syncProjectExecutionState(projectId)`:
   - read Gantt/WBS/project stores
   - match Gantt leaf tasks to WBS leaf nodes by normalized task/node name
   - update leaf WBS progress from Gantt task progress
   - roll up parent/root WBS progress by weights
   - write project.progress from root WBS progress
4. Update `useGantt.ts` invalidations so client views refetch WBS/project/project-list after Gantt writes.
5. Replace static `Progress Update` constants with live derivations:
   - weighting from top-level WBS nodes
   - “physical” from BOQ-bearing WBS nodes
   - EVM from latest EVM snapshot
6. Run the focused propagation E2E, then lint/build/typecheck.

### Test Coverage
- `project-gantt-propagation.spec.ts`
  - `editing a seeded gantt task updates WBS progress`
  - `editing a seeded gantt task updates project overview percent`
  - `editing a seeded gantt task updates progress page weighting summary`

### Decision Completeness
- Goal: Gantt progress changes must propagate to WBS, overview, dashboard/project summaries, and the Progress page.
- Non-goals:
  - automatic project business-status transitions
  - redesigning WBS/Gantt into one unified model
- Success criteria:
  - seeded task update changes corresponding WBS progress
  - project summary progress updates without manual refresh hacks
  - Progress page contains no hardcoded demo metrics
  - existing Gantt CRUD still works for PM/Coordinator
- Public interfaces:
  - no new routes
  - existing `/api/gantt/[projectId]` write semantics broaden to include synchronization side effects
- Edge cases / failure modes:
  - unmatched task names fail open: task edit succeeds, sync skips unmatched node
  - missing WBS/project store entries: sync no-ops safely
  - milestone rows do not overwrite WBS because only non-milestone task rows participate
- Rollout & monitoring:
  - mock-data only, so safe to ship directly
  - backout path is reverting the sync helper and progress-page derivations
- Acceptance checks:
  - `npx playwright test tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing in-memory stores and Playwright harness.

### Validation
- Focused Playwright propagation test plus repo gates.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `syncProjectExecutionState(projectId)` | Gantt write handlers | `src/app/api/gantt/[projectId]/route.ts` | `project-store`, `wbs-store`, `gantt-store` |
| Progress page live derivations | `projects/[id]/progress` page render | `src/app/(dashboard)/projects/[id]/progress/page.tsx` | query results only |

---

## 2026-03-16 13:53:04 +07

### Goal
Make Gantt task-progress updates propagate into the relevant project surfaces instead of staying trapped inside the Gantt page, and replace the static Progress page with live data derived from WBS/project/EVM state.

### What Changed
- `src/lib/project-progress-derivations.ts`
  - Added shared pure helpers for:
    - weighting rows / total weighted progress
    - physical-progress rows from BOQ-bearing WBS nodes
    - EVM summary metrics
    - normalized task/node matching
- `src/lib/project-execution-sync.ts`
  - Added `syncProjectExecutionState(projectId, options)`:
    - maps the edited Gantt task to a matching WBS leaf node by normalized name
    - updates the matched leaf progress
    - propagates the delta up the WBS ancestor chain
    - recomputes root/project weighted progress from top-level WBS rows
    - supports delete-side rollback for matched tasks
- `src/app/api/gantt/[projectId]/route.ts`
  - Gantt POST/PATCH/DELETE now call `syncProjectExecutionState(...)` after mutating the Gantt store.
- `src/hooks/useGantt.ts`
  - Gantt mutations now invalidate:
    - `['gantt', projectId]`
    - `['wbs', projectId]`
    - `['project']`
    - `['projects']`
  - This ensures navigation back to WBS, overview, and dashboard fetches the synchronized state.
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
  - Removed the hardcoded `WEIGHTING_DATA`, `PHYSICAL_DATA`, and `EVM_METRICS`.
  - Progress Update now reads live:
    - weighting from `useWBS(projectId)`
    - physical progress from BOQ-bearing WBS nodes
    - EVM from `useEVM(projectId)` and project budget
- `tests/e2e/project-gantt-propagation.spec.ts`
  - Added propagation coverage from seeded Gantt task edit -> WBS page -> project API summary -> Progress page.

### TDD Evidence
- RED:
  - Command: `npx playwright test tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - Failure reason: the first sync implementation propagated every existing Gantt task at once, so the project summary progress did not match the intended incremental contract (`expected > 0.57`, received `0.4445`).
  - Fix: narrowed synchronization to the edited/deleted task mutation instead of rebasing all historical task progress in one write.
- GREEN:
  - Command: `npx playwright test tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - Result: `1 passed`

### Tests Run
- `npx playwright test tests/e2e/project-gantt-crud.spec.ts tests/e2e/project-gantt-propagation.spec.ts --reporter=line` -> passed (`4 passed`)
- `npm run lint` -> passed with pre-existing warnings in:
  - `src/app/(dashboard)/projects/[id]/issues/page.tsx`
  - `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build` -> passed
- `npm run typecheck` -> passed after build

### Wiring Verification
- Gantt write path:
  - `src/app/(dashboard)/projects/[id]/gantt/page.tsx` submits edits through `useUpdateGanttTask()`
  - `src/hooks/useGantt.ts` calls `/gantt/${projectId}` and now invalidates Gantt + WBS + project queries
  - `src/app/api/gantt/[projectId]/route.ts` mutates the Gantt store and immediately calls `syncProjectExecutionState(projectId, ...)`
- Derived project state:
  - `src/lib/project-execution-sync.ts` writes into:
    - `src/lib/wbs-store.ts`
    - `src/lib/project-store.ts`
  - `src/app/(dashboard)/projects/[id]/progress/page.tsx` then reads synchronized WBS/project/EVM state via hooks

### Behavior Changes / Risk Notes
- Editing a seeded Gantt task now updates:
  - the matching WBS work package progress
  - the project summary progress exposed by `/api/projects/[id]`
  - the Progress Update page’s weighting/physical summary
- Project business status is still manual. This change does not auto-switch `planning` / `in_progress` / `completed`.
- Fail-open behavior:
  - if a Gantt task has no matching WBS leaf node, the Gantt edit still succeeds and only the Gantt page changes
  - this avoids breaking ad hoc tasks or new custom schedule rows

### Follow-ups / Known Gaps
- Matching between Gantt tasks and WBS nodes is currently by normalized name, not a stable `wbsId` foreign key.
- Dashboard delayed/on-schedule state still comes from project `spiValue`, not from Gantt schedule slippage.
- The Progress page is now live, but its “physical progress” is an approximation based on BOQ-bearing WBS work packages rather than a true quantity tracking subsystem.

### Notes
- Auggie semantic search was intentionally skipped; this implementation used direct file inspection plus exact-string searches due the environment’s unbounded Auggie behavior.
