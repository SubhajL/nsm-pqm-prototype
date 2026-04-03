## Plan Draft A

### Overview
Audit the existing WBS/BOQ seeds and page selection logic, then fix the immediate `proj-001` empty-BOQ experience by ensuring the page defaults to a BOQ-capable node and by aligning `hasBOQ` flags with real BOQ rows. Extend the audit across the generated projects so each project exposes context-appropriate WBS and BOQ data.

### Files To Change
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx` - prefer a meaningful BOQ-capable default node.
- `src/data/wbs.json` - correct `hasBOQ` flags for hand-seeded project nodes.
- `src/data/boq.json` - add or adjust hand-seeded BOQ rows for `proj-001`.
- `src/lib/generated-project-data.ts` - verify generated WBS/BOQ coherence across `proj-002..proj-005`.

### Implementation Steps
TDD sequence:
1. Add an E2E regression test that opens `proj-001` WBS/BOQ and expects a populated BOQ panel by default.
2. Run the E2E test and confirm it fails because the page lands on an empty root node.
3. Implement the smallest page-selection fix and data corrections needed to pass.
4. Refactor selection logic into a small helper if needed.
5. Run fast gates plus the focused E2E.

Functions / logic:
- `getPreferredWbsSelection(nodes, pendingId, currentId)` in `page.tsx`: choose pending/current node when valid, otherwise the first node with BOQ rows, then first non-root node, then root.
- WBS seed adjustments in `wbs.json`: only mark a node `hasBOQ` when it is intended to own BOQ rows.
- BOQ seed additions in `boq.json`: ensure astronomy project cost packages match demolition/structure context.

### Test Coverage
- `tests/e2e/project-wbs-boq-coverage.spec.ts`
  - `proj-001 opens WBS/BOQ with populated BOQ panel`
  - `generated projects expose at least one BOQ-capable node`

### Decision Completeness
- Goal: WBS/BOQ opens with meaningful data and each seeded project has coherent WBS/BOQ coverage.
- Non-goals: full WBS/BOQ CRUD redesign, Excel import/export implementation.
- Success criteria:
  - `proj-001` no longer opens to an empty BOQ panel by default.
  - Every seeded project has at least one context-appropriate BOQ-capable WBS node with BOQ items.
  - `hasBOQ` does not point at empty nodes unless intentionally empty.
- Public interfaces: no API contract changes.
- Edge cases:
  - New project with no WBS -> fail open with existing empty state.
  - Project with WBS but no BOQ rows -> prefer first non-root node, then show empty BOQ state.
- Rollout/monitoring: none, mock-data only.
- Acceptance checks:
  - focused Playwright test passes
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing WBS/BOQ hooks and mock stores.

### Validation
- Run the new E2E spec plus repo gates.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| WBS selection helper | `WbsBOQPage` render lifecycle | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | N/A |
| Seeded BOQ rows | `GET /api/boq/[wbsId]` | `src/lib/boq-store.ts` | mock JSON store |

## Plan Draft B

### Overview
Keep data mostly as-is and solve the user-facing issue by deriving the first WBS node that actually has BOQ items from the BOQ API/store, without touching WBS flags except for obvious mismatches. This minimizes seed churn and concentrates on runtime behavior.

### Files To Change
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
- `src/data/wbs.json` only if a dangling `hasBOQ` flag is misleading

### Implementation Steps
TDD sequence:
1. Add focused E2E regression for default BOQ selection.
2. Confirm failure.
3. Implement selection based on BOQ-bearing node ids.
4. Fix only the clearly inconsistent seed(s).
5. Run gates.

Functions / logic:
- Compute `boqEligibleNodeIds` from nodes with `hasBOQ`.
- Prefer the first BOQ-bearing child node over the root.

### Test Coverage
- Same focused E2E around default selection.

### Decision Completeness
- Goal: fix the empty default selection with minimal data movement.
- Non-goals: expanding BOQ coverage breadth across all projects.
- Success criteria:
  - default WBS selection is meaningful on seeded projects
  - no regressions for new empty projects
- Public interfaces: none
- Edge cases:
  - stale selected node removed after mutation -> fall back safely
- Rollout/monitoring: none
- Acceptance checks: focused E2E + lint/build/typecheck

### Dependencies
- Current WBS and BOQ stores.

### Validation
- Same as Draft A.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| Default node selection | `WbsBOQPage` state init/update | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | N/A |

## Comparative Analysis

- Draft A is stronger on data integrity and long-term demo coherence.
- Draft B is smaller and lower risk, but it leaves more latent seed inconsistencies for later.
- Both follow the current mock-data architecture and avoid unnecessary API changes.
- The repo already invested in generated project data, so fixing seed coherence now is worth the extra scope.

## Unified Execution Plan

### Overview
Implement the smaller runtime fix from Draft B and the seed-integrity cleanup from Draft A. The page should default to a node that actually represents BOQ work, and all five seeded projects should expose WBS/BOQ data that matches their project context.

### Files To Change
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx` - add preferred-node selection logic.
- `src/data/wbs.json` - remove or correct dangling hand-seeded `hasBOQ`.
- `src/data/boq.json` - add relevant BOQ rows for astronomy project where appropriate.
- `src/lib/generated-project-data.ts` - add more context-appropriate BOQ rows if any generated project is too sparse.
- `tests/e2e/project-wbs-boq-coverage.spec.ts` - regression coverage for seeded WBS/BOQ behavior.

### Implementation Steps
TDD sequence:
1. Add `tests/e2e/project-wbs-boq-coverage.spec.ts`.
2. Run it and confirm the current seeded project opens to an empty BOQ panel.
3. Patch selection logic in `page.tsx`.
4. Patch seed data so BOQ-bearing nodes are context-appropriate and populated.
5. Run the focused E2E, then lint/build/typecheck.

Functions / logic:
- `findPreferredWbsNodeId(nodes, pendingId, currentId)`:
  - preserve pending/current selection when still valid
  - otherwise choose the first level>0 node with `hasBOQ`
  - otherwise choose the first non-root node
  - finally fall back to root
- Astronomy project BOQ:
  - keep demolition and structural work cost packages
  - add a preparatory/estimation package only if it maps to actual procurement scope; otherwise clear misleading `hasBOQ`
- Generated projects:
  - verify each project has at least one BOQ node aligned to its domain
  - add secondary BOQ rows where the current scenario is unrealistically thin

### Test Coverage
- `project-wbs-boq-coverage.spec.ts`
  - `seeded project defaults to first BOQ-capable node`
  - `seeded project shows BOQ rows without extra click`
  - `new project still shows empty WBS/BOQ states`

### Decision Completeness
- Goal: meaningful WBS/BOQ defaults and coherent BOQ seeds across all five projects.
- Non-goals: implementing delete/edit for WBS/BOQ, redesigning the WBS domain model.
- Success criteria:
  - `proj-001` WBS page immediately shows BOQ content
  - each seeded project has relevant WBS structure and at least one BOQ-bearing node with rows
  - no regression for newly created projects with empty WBS
- Public interfaces: unchanged existing APIs only.
- Edge cases / failure modes:
  - no WBS nodes -> show existing empty state
  - no BOQ-bearing node -> select first non-root, fail open to empty BOQ state
  - pending created node without BOQ -> keep pending node selection because user just created it
- Rollout & monitoring: mock-data only, no migration/backout beyond reverting seed changes.
- Acceptance checks:
  - `npx playwright test tests/e2e/project-wbs-boq-coverage.spec.ts --reporter=line`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing Playwright harness, WBS/BOQ hooks, and mock stores.

### Validation
- Focused Playwright regression on seeded and new-project flows.
- Repo gates after the targeted test passes.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| Preferred WBS node selection | `WbsBOQPage` `useEffect` | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | N/A |
| Hand-seeded WBS/BOQ content | `/api/wbs/[projectId]`, `/api/boq/[wbsId]` | `src/lib/wbs-store.ts`, `src/lib/boq-store.ts` | `src/data/wbs.json`, `src/data/boq.json` |
| Generated WBS/BOQ content | same APIs through merged stores | `src/lib/generated-project-data.ts` -> stores above | generated in-memory mock data |

---

## 2026-03-16 13:15:01 +07

### Goal
Fix the seeded WBS/BOQ experience so projects open on meaningful BOQ content, and expand WBS/BOQ seed coverage so all five projects have context-appropriate BOQ-bearing work packages.

### What Changed
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - Added `findPreferredWbsNodeId(...)`.
  - WBS page now preserves current/pending selection when valid, otherwise falls back to the first level>0 BOQ-capable node, then first non-root node, then root.
- `src/data/wbs.json`
  - Removed the misleading `hasBOQ` flag from `1.3 จัดทำ BOQ`.
  - Marked `2.3 งานระบบไฟฟ้า`, `3.1 งานตกแต่งภายใน`, and `3.2 งานระบบมัลติมีเดีย` as BOQ-bearing for the astronomy exhibition project.
- `src/data/boq.json`
  - Added concrete astronomy-project BOQ rows for electrical, interior exhibition, and multimedia packages.
- `src/lib/generated-project-data.ts`
  - Enriched generated WBS/BOQ scenarios so each non-hand-seeded project has domain-appropriate BOQ-bearing work packages with actual rows:
    - `proj-002`: frontend UX fixes, SSO integration, payment gateway onboarding
    - `proj-003`: PO/contract support, AV installation/cabling
    - `proj-004`: design/BIM estimating, temporary exhibit relocation
    - `proj-005`: online/phone survey operations
- `tests/e2e/project-wbs-boq-coverage.spec.ts`
  - Added focused Playwright regression for seeded and generated project default BOQ selection.

### TDD Evidence
- RED:
  - Command: `npx playwright test tests/e2e/project-wbs-boq-coverage.spec.ts --reporter=line`
  - Failure reason: both tests failed because the WBS page landed on the root node, so `BOQ — 2.1 ...` titles were not visible and the BOQ panel was effectively empty by default.
- GREEN:
  - Command: `npx playwright test tests/e2e/project-wbs-boq-coverage.spec.ts --reporter=line`
  - Result: `2 passed`

### Tests Run
- `npx playwright test tests/e2e/project-wbs-boq-coverage.spec.ts --reporter=line` -> passed
- `npm run lint` -> passed with pre-existing warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build` -> passed
- `npm run typecheck` -> passed after `build`

### Wiring Verification
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - Verified runtime entry point remains the project WBS page; selection helper is called from the existing `useEffect`.
- `src/data/wbs.json` + `src/data/boq.json`
  - Verified through existing stores and API routes:
    - `src/lib/wbs-store.ts`
    - `src/lib/boq-store.ts`
    - `src/app/api/wbs/[projectId]/route.ts`
    - `src/app/api/boq/[wbsId]/route.ts`
- `src/lib/generated-project-data.ts`
  - Verified generated WBS/BOQ items are merged into the same stores and flow through the same APIs.

### Behavior Changes / Risk Notes
- Seeded projects now default to the first meaningful BOQ-bearing work package instead of the root node.
- Newly created projects still preserve the user’s current or newly added WBS selection, even if that node has no BOQ yet.
- Fail-open behavior remains for empty projects: no WBS still shows the existing empty state.

### Follow-ups / Known Gaps
- The WBS page now behaves correctly for seeded projects, but import/export/template actions are still UI stubs.
- Broader project pages such as `progress` still use more static/demo-oriented summaries than WBS/BOQ.

### Seed Coverage Summary
- `proj-001` now has BOQ for demolition, structure, electrical, interior exhibition, and multimedia packages.
- `proj-002` has BOQ for backend, frontend, SSO, and payment integration work.
- `proj-003` has BOQ for procurement, PO/contract support, and installation/cabling.
- `proj-004` has BOQ for design estimating and temporary exhibit relocation.
- `proj-005` has BOQ for on-site fieldwork and online/phone survey collection.

### Notes
- Auggie semantic search was intentionally skipped; this work was based on direct file inspection plus exact-string searches because Auggie is not reliably bounded in this environment.

## Review (2026-03-16 13:20:00 +07) - system

### Reviewed
- Repo: `/Users/subhajlimanond/dev/nsm-pqm-prototype`
- Branch: `main`
- Scope: `ui` subsystem, specifically Gantt -> related project pages
- Commands Run: direct file reads with `sed`/`nl`, exact-string searches with `rg`; `git` context commands were attempted but the parent filesystem is not a normal initialized repo root here
- Sources:
  - `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - `src/hooks/useGantt.ts`
  - `src/app/api/gantt/[projectId]/route.ts`
  - `src/lib/gantt-store.ts`
  - `src/app/(dashboard)/projects/[id]/progress/page.tsx`
  - `src/app/(dashboard)/projects/[id]/page.tsx`
  - `src/app/(dashboard)/dashboard/page.tsx`
  - `src/hooks/useWBS.ts`
  - `src/app/api/projects/[id]/route.ts`
  - `src/data/projects.json`
  - `src/data/gantt-tasks.json`

### High-Level Assessment
- As implemented today, Gantt is its own writable module backed by `useGantt` -> `/api/gantt/[projectId]` -> `gantt-store`.
- Task create/update/delete operations persist inside the per-project Gantt store and re-render the Gantt page correctly.
- The rest of the project surfaces are not wired to that store.
- The project overview/dashboard use the project record (`projects.json` / project store), WBS/BOQ uses the WBS store, EVM uses the EVM store, and the Progress page is still static demo content.
- So a Gantt status/progress update is not a cross-module source of truth right now.

### Strengths
- Gantt CRUD is real and access-controlled for PM/Coordinator/Admin.
- The Gantt API persists task edits in a per-project in-memory store.
- The Gantt page reads back from that same store, so the module itself is internally consistent.

### As-Is Pipeline Diagram
- User edits a task in `projects/[id]/gantt` -> `handleSubmit()` sends `progress/start/end/owner/...` through `useUpdateGanttTask()` -> `PATCH /api/gantt/[projectId]` mutates only `getGanttDataForProject(projectId)` in `gantt-store` -> React Query invalidates only `['gantt', projectId]` -> the Gantt page refreshes. No project record, WBS record, EVM record, or progress-summary page is recalculated from that write.

### Drift Matrix
- Intended: Gantt task status changes should update related project summaries.
  - Implemented: only Gantt store is updated.
  - Impact: users can see conflicting status/progress across pages.
  - Fix direction: introduce a shared project-progress derivation layer or explicit synchronization writes.
- Intended: Progress Update page should reflect live project data.
  - Implemented: `progress/page.tsx` uses hardcoded `WEIGHTING_DATA`, `PHYSICAL_DATA`, and `EVM_METRICS`.
  - Impact: the screenshot can diverge permanently from Gantt/WBS/EVM reality.
  - Fix direction: compute weighting from WBS, physical from domain data, EVM from `useEVM`.
- Intended: WBS and Gantt activity state should stay aligned when they represent the same work packages.
  - Implemented: WBS and Gantt are separate stores with no shared keys or sync.
  - Impact: `งานรื้อถอน` can be 65% in Gantt and stay unchanged in WBS/progress.
  - Fix direction: add WBS linkage to Gantt tasks or derive both from a shared work-package model.
- Intended: Dashboard/project overview progress should move when schedule execution changes materially.
  - Implemented: dashboard and overview read `project.progress`, `spiValue`, `cpiValue` from the project record, not from Gantt.
  - Impact: top-level KPIs can remain stale after Gantt edits.
  - Fix direction: recalculate project summary from Gantt/WBS/EVM or provide a deliberate publish/update action.
- Intended: project “status” should be a clear business state.
  - Implemented: Gantt “status” is only a tag derived from `task.progress`; project status is separately edited in project overview.
  - Impact: users may assume Gantt status changes the project status, but it does not.
  - Fix direction: clarify terminology or wire milestone/project state transitions explicitly.

### Key Risks / Gaps (severity ordered)
HIGH
- Gantt updates do not propagate beyond the Gantt module. `handleSubmit()` only calls `useUpdateGanttTask()` and `useCreateGanttTask()` in [src/app/(dashboard)/projects/[id]/gantt/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/gantt/page.tsx#L562), and the mutation invalidates only the `['gantt', projectId]` query in [src/hooks/useGantt.ts](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/hooks/useGantt.ts#L27). The API mutates only the Gantt store in [src/app/api/gantt/[projectId]/route.ts](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/api/gantt/%5BprojectId%5D/route.ts#L186) and [src/lib/gantt-store.ts](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/lib/gantt-store.ts#L45). Observable impact: changing a Gantt task’s progress/status does not update project overview KPIs, dashboard counts, or WBS.
- The Progress Update page is static demo content and is not driven by Gantt, WBS, or EVM data. [src/app/(dashboard)/projects/[id]/progress/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/progress/page.tsx#L59) hardcodes `WEIGHTING_DATA`, [src/app/(dashboard)/projects/[id]/progress/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/progress/page.tsx#L68) hardcodes `PHYSICAL_DATA`, and [src/app/(dashboard)/projects/[id]/progress/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/progress/page.tsx#L76) hardcodes `EVM_METRICS`. It only waits on `useWBS(projectId)` for loading state at [src/app/(dashboard)/projects/[id]/progress/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/progress/page.tsx#L107), but never consumes the returned data. So the page in Image #1 will not change when Gantt changes.

MEDIUM
- WBS and Gantt are separate models with matching-looking labels but no linkage. WBS reads only `useWBS(projectId)` in [src/app/(dashboard)/projects/[id]/wbs/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/wbs/page.tsx#L126) from [src/hooks/useWBS.ts](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/hooks/useWBS.ts#L23). Gantt reads a different store entirely. This means `2.1 งานรื้อถอน` in WBS/BOQ and `งานรื้อถอน` in Gantt are only visually aligned, not programmatically synchronized.
- Dashboard and project overview read summary fields from the project record, not from Gantt. In [src/app/(dashboard)/projects/[id]/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/page.tsx#L137), the overview uses `project.status`, `project.progress`, `project.spiValue`, `project.cpiValue`, and milestone counts from the project record. The dashboard derives `on_schedule` vs `delayed` from `project.spiValue` in [src/app/(dashboard)/dashboard/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/dashboard/page.tsx#L77). Gantt edits never write those fields.
- Gantt “status” is not a stored field. It is derived from `progress` in [src/app/(dashboard)/projects/[id]/gantt/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/gantt/page.tsx#L130) and rendered at [src/app/(dashboard)/projects/[id]/gantt/page.tsx](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/projects/%5Bid%5D/gantt/page.tsx#L657). So there is no distinct “status update” channel; changing status really means changing task progress.

LOW
- `PATCH /api/projects/[id]` only handles top-level project status and a narrow progress side effect (`planning` -> `0`, `completed` -> `1`) in [src/app/api/projects/[id]/route.ts](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/api/projects/%5Bid%5D/route.ts#L104). There is no reconciliation path from task-level execution back to that endpoint.

### Nit-Picks / Nitty Gritty
- The Gantt page exposes `viewMode` and `timeScale` controls, but the data model underneath is still a flat task list without baseline-vs-current persistence.
- Because task status is inferred from `progress`, users may over-trust the colored tags as business workflow state.

### Tactical Improvements (1–3 days)
1. Make `progress/page.tsx` data-driven:
   - Weighting from `useWBS(projectId)`
   - EVM from `useEVM(projectId)`
   - remove static `WEIGHTING_DATA`, `PHYSICAL_DATA`, `EVM_METRICS`
2. Add a shared project-progress derivation helper that computes:
   - project overall progress from WBS and/or Gantt
   - milestone progress from Gantt milestone rows
   - delayed/on-schedule from EVM + schedule logic
3. On Gantt write success, either:
   - update project summary fields explicitly, or
   - invalidate and recompute summary queries that depend on Gantt.

### Strategic Improvements (1–6 weeks)
1. Introduce a shared work-package model keyed across WBS, Gantt, BOQ, Daily Report, and Quality.
2. Define one source of truth for each concept:
   - scope structure -> WBS
   - schedule state -> Gantt
   - portfolio/project summary -> derived projection, not duplicated seed fields
3. Add contract tests that prove a task-progress change affects the summary surfaces intended to reflect it.

### Big Architectural Changes (only if justified)
- Proposal: add a derived “project execution snapshot” layer.
  - Pros:
  - removes duplicated summary fields drifting across stores
  - makes dashboard/overview/progress pages consistent
  - gives one place to encode business rules for progress/status
  - Cons:
  - more moving parts than the current demo-only seed model
  - requires deciding whether WBS or Gantt is primary for overall progress
  - Migration Plan:
  - keep current stores
  - add a pure derivation function fed by Gantt/WBS/EVM/issues/risks
  - migrate overview/dashboard/progress pages to that snapshot first
  - later remove duplicated summary fields from `projects.json`
  - Tests/Rollout:
  - start with unit tests for derivation rules
  - then add Playwright assertions that a Gantt edit changes overview/progress/dashboard

### Open Questions / Assumptions
- Assumption: by “status in Gantt module” you mean the task-level visual status derived from progress, not the top-level project status selector on the overview page.
- Open question: should WBS and Gantt stay separate but linked, or should one become the authoritative source for weighted progress?
