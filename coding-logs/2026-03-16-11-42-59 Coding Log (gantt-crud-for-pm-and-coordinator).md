# Planning Log

Auggie semantic search unavailable; plan is based on direct file inspection + exact-string searches.

Inspected files:
- `AGENTS.md`
- `CLAUDE.md`
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
- `src/app/api/gantt/[projectId]/route.ts`
- `src/hooks/useGantt.ts`
- `src/data/gantt-tasks.json`
- `src/data/wbs.json`
- `src/lib/auth.ts`
- `src/lib/project-access.ts`

## Plan Draft A

### Overview
- Add true CRUD for Gantt tasks and dependency links, with `Project Manager` and `Coordinator` as the only write-capable roles.
- Keep `WBS/BOQ` and `Gantt` as separate modules: WBS remains scope/cost structure, while Gantt becomes the schedule-edit surface with optional WBS linkage.

### Files to Change
- `src/types/gantt.ts` or `src/hooks/useGantt.ts`: define writable Gantt task/link payloads, optionally add `wbsId`.
- `src/lib/gantt-store.ts`: shared in-memory store for project-scoped Gantt data.
- `src/app/api/gantt/[projectId]/route.ts`: add `POST`, `PATCH`, `DELETE` for tasks and links; enforce PM/Coordinator/Admin role checks.
- `src/hooks/useGantt.ts`: add create/update/delete mutations.
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`: add modal/forms/buttons for task add/edit/delete and link management.
- `tests/e2e/project-gantt-crud.spec.ts`: browser proof for PM/Coordinator manage and non-privileged user blocked.

### Implementation Steps
- TDD sequence:
  1. Add an E2E spec that expects visible Gantt add/edit/delete controls for PM and Coordinator.
  2. Run it and confirm failure because the Gantt page is currently read-only.
  3. Add the smallest API/store/hook/UI changes to make add/edit/delete pass.
  4. Refactor shared permission and form helpers if needed.
  5. Run `playwright`, `lint`, `build`, then `typecheck`.
- `getGanttStore()`
  - Create a shared global store keyed by project data so new tasks persist for the session.
- `canManageGantt(role)`
  - Restrict writes to `System Admin`, `Project Manager`, and `Coordinator`.
- `POST /api/gantt/[projectId]`
  - Create either a task or a dependency link based on payload shape.
- `PATCH /api/gantt/[projectId]`
  - Update editable task fields: text, dates, progress, owner, parent, optional `wbsId`.
- `DELETE /api/gantt/[projectId]`
  - Delete a task and its dependent child/link rows, or delete a link by id.
- Gantt page write affordances
  - Add `เพิ่มงาน`, `แก้ไข`, `ลบ`, and maybe `เพิ่มความเชื่อมโยง` actions using modal forms.

### Test Coverage
- `project-gantt-crud.spec.ts`
  - PM can add a Gantt task.
  - PM can edit a Gantt task.
  - PM can delete a Gantt task.
  - Coordinator can manage Gantt tasks.
  - Engineer cannot see write controls.
- API-level smoke via Playwright interactions
  - Newly added task appears in the table after create.
  - Edited task shows changed dates/text.
  - Deleted task disappears.

### Decision Completeness
- Goal
  - Add real Gantt CRUD with PM/Coordinator ownership.
- Non-goals
  - Do not unify WBS and Gantt into a single data model.
  - Do not add advanced auto-scheduling or critical-path recalculation.
- Success criteria
  - PM and Coordinator can add/edit/delete Gantt tasks from the page.
  - Other roles are read-only even if they can view the page.
  - E2E demonstrates create/edit/delete.
- Public interfaces
  - `POST|PATCH|DELETE /api/gantt/[projectId]`
  - new mutation hooks in `useGantt.ts`
- Edge cases / failure modes
  - invalid dates -> fail closed with `400`
  - deleting parent task -> remove child tasks and links
  - unauthorized write -> fail closed with `403`
- Rollout & monitoring
  - no flags; in-memory prototype-only
  - watch for invalid parent/link combinations and link cleanup bugs
- Acceptance checks
  - `npx playwright test tests/e2e/project-gantt-crud.spec.ts --reporter=line`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing React Query, Ant Design modal/form/table patterns.

### Validation
- Create a task, edit it, delete it, reload page, verify in-session persistence.

### Wiring Verification

| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `gantt-store.ts` | `GET/POST/PATCH/DELETE /api/gantt/[projectId]` | imported by `src/app/api/gantt/[projectId]/route.ts` | in-memory Gantt task/link arrays |
| Gantt mutations | `projects/[id]/gantt/page.tsx` | `src/hooks/useGantt.ts` exports | N/A |
| Gantt CRUD API | browser fetches `/api/gantt/[projectId]` | Next route at `src/app/api/gantt/[projectId]/route.ts` | in-memory Gantt task/link arrays |
| Gantt management UI | `/projects/[id]/gantt` | `src/app/(dashboard)/projects/[id]/gantt/page.tsx` | N/A |

## Plan Draft B

### Overview
- Add only task create/delete in Gantt, and keep edits limited to progress/date/owner. Skip link CRUD for now to reduce complexity.
- Make each Gantt task optionally reference a WBS node to preserve scope-schedule alignment without trying to make WBS the only edit surface.

### Files to Change
- `src/lib/gantt-store.ts`
- `src/app/api/gantt/[projectId]/route.ts`
- `src/hooks/useGantt.ts`
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
- `tests/e2e/project-gantt-crud.spec.ts`

### Implementation Steps
- TDD sequence:
  1. Add E2E coverage for add/delete and a small edit path.
  2. Confirm failure on missing controls.
  3. Implement task-only CRUD.
  4. Keep links read-only.
  5. Run gates.
- `POST /api/gantt/[projectId]`
  - Create tasks only.
- `PATCH /api/gantt/[projectId]`
  - Edit existing tasks only.
- `DELETE /api/gantt/[projectId]`
  - Delete a task and cascade-delete links referencing it.
- Gantt page
  - Add simple task-management controls.
  - Reuse the existing table rather than changing the chart rendering heavily.

### Test Coverage
- PM create/delete/edit task.
- Coordinator create/delete/edit task.
- Read-only role has no add/delete controls.
- Newly created task remains under the right project route.

### Decision Completeness
- Goal
  - Add minimal, useful Gantt task CRUD fast.
- Non-goals
  - No direct link/dependency editing UI.
- Success criteria
  - Visible, working task create/edit/delete for PM and Coordinator.
- Public interfaces
  - same route path, broader methods
- Edge cases / failure modes
  - invalid parent id -> `400`
  - unauthorized role -> `403`
- Rollout & monitoring
  - prototype-only, no migration
- Acceptance checks
  - same as Draft A

### Dependencies
- Existing Gantt route and table component.

### Validation
- Add/edit/delete one task as PM and Coordinator.

### Wiring Verification

| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| Task CRUD API | `/api/gantt/[projectId]` | `src/app/api/gantt/[projectId]/route.ts` | in-memory Gantt tasks |
| Task mutation hooks | Gantt page controls | `src/hooks/useGantt.ts` | N/A |
| Task CRUD UI | `/projects/[id]/gantt` | `src/app/(dashboard)/projects/[id]/gantt/page.tsx` | N/A |

## Comparative Analysis & Synthesis

### Strengths
- Draft A is more complete and future-proof for real schedule management.
- Draft B is smaller and lower-risk for the current prototype.

### Gaps
- Draft A risks overbuilding dependency editing before the UI needs it.
- Draft B leaves the data model more asymmetric by keeping links read-only.

### Trade-offs
- Draft A favors completeness.
- Draft B favors fast delivery with fewer moving parts.

### Compliance
- Both drafts preserve the repo’s existing pattern of store-backed mock APIs, React Query hooks, and Ant Design modal/table flows.

## Unified Execution Plan

### Overview
- Implement **task CRUD now** for Gantt, not full link CRUD. This gives PM and Coordinator the schedule-edit surface they need without overcomplicating the prototype.
- Keep WBS/BOQ and Gantt separate, but allow a Gantt task to optionally reference a WBS node so the schedule can stay aligned to scope.

### Files to Change
- `src/lib/gantt-store.ts`
  - Shared mock store for project-scoped Gantt tasks/links.
- `src/app/api/gantt/[projectId]/route.ts`
  - Add task `POST`, `PATCH`, `DELETE`, role guard, and project guard.
- `src/hooks/useGantt.ts`
  - Add `useCreateGanttTask`, `useUpdateGanttTask`, `useDeleteGanttTask`.
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - Add task create/edit/delete controls for PM and Coordinator only.
- `tests/e2e/project-gantt-crud.spec.ts`
  - Add browser proof for PM/Coordinator write access and unauthorized read-only behavior.

### Implementation Steps
- TDD sequence:
  1. Add `tests/e2e/project-gantt-crud.spec.ts`.
  2. Run it and confirm failure because Gantt is read-only today.
  3. Add `gantt-store.ts` and extend `GET /api/gantt/[projectId]` to use it.
  4. Add `POST`, `PATCH`, `DELETE` for tasks only.
  5. Extend `useGantt.ts` with mutations.
  6. Add modal-based task create/edit/delete UI to the Gantt page.
  7. Re-run Playwright, then `lint`, `build`, `typecheck`.
- Function names
  - `getGanttStore()`: seed and return the per-session Gantt dataset.
  - `canManageGantt(role)`: admin/PM/coordinator capability check.
  - `useCreateGanttTask()`: create a task under a project/milestone parent.
  - `useUpdateGanttTask()`: edit basic schedule fields.
  - `useDeleteGanttTask()`: remove a task and cascade-delete referenced links.
- Expected behavior / edge cases
  - PM and Coordinator see task-management controls.
  - Other users can still view Gantt if the menu allows it, but no write controls and API returns `403`.
  - New projects can start with empty Gantt data and still accept new tasks.
  - Deleting a task also deletes dependency links touching that task.

### Test Coverage
- `project-gantt-crud.spec.ts`
  - `PM can add, edit, and delete gantt task`
  - `Coordinator can add, edit, and delete gantt task`
  - `Engineer sees gantt read only`

### Decision Completeness
- Goal
  - Add useful Gantt task CRUD with PM/Coordinator ownership.
- Non-goals
  - No full dependency-link editor.
  - No forced WBS-driven schedule generation.
- Success criteria
  - PM/Coordinator task CRUD works in UI and API.
  - Unauthorized users are blocked in both UI and API.
  - Playwright proof passes.
- Public interfaces
  - `POST /api/gantt/[projectId]`
  - `PATCH /api/gantt/[projectId]`
  - `DELETE /api/gantt/[projectId]`
  - React Query mutations in `src/hooks/useGantt.ts`
- Edge cases / failure modes
  - missing text/dates/parent -> `400`
  - unauthorized role -> `403`
  - missing task id on update/delete -> `400`
  - deleting task referenced by links -> cascade-remove links
  - fail closed for all auth/validation cases
- Rollout & monitoring
  - no feature flag; dev-session persistence only
  - monitor for broken nesting or orphan links during manual smoke
- Acceptance checks
  - `npx playwright test tests/e2e/project-gantt-crud.spec.ts --reporter=line` -> pass
  - `npm run lint` -> pass
  - `npm run build` -> pass
  - `npm run typecheck` -> pass after build

### Dependencies
- Existing Ant Design modal/form/table patterns
- Existing project access guard and role helpers

### Validation
- Create one task in `proj-001`, edit it, delete it, and verify task table updates.
- Repeat create/edit/delete as a Coordinator.
- Verify read-only behavior for a non-writer role.

### Wiring Verification

| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `gantt-store.ts` | `GET/POST/PATCH/DELETE /api/gantt/[projectId]` | imported by `src/app/api/gantt/[projectId]/route.ts` | in-memory `GanttData.data` and `GanttData.links` |
| Gantt CRUD API | browser fetches `/api/gantt/[projectId]` | `src/app/api/gantt/[projectId]/route.ts` | in-memory Gantt arrays |
| Gantt mutation hooks | Gantt page task-management actions | `src/hooks/useGantt.ts` | N/A |
| Gantt CRUD UI | `/projects/[id]/gantt` | `src/app/(dashboard)/projects/[id]/gantt/page.tsx` | N/A |

### Cross-Language Schema Verification
- Not applicable; this repo is TypeScript/Next-only for this feature.

### Decision-Complete Checklist
- No open decisions remain for the implementer.
- New public methods are listed.
- Behavior changes have concrete Playwright tests.
- Validation commands are specific.
- Wiring Verification covers every new component.
- No rollout/backout complexity beyond reverting the feature in this prototype.

## Implementation Summary
- Added shared Gantt types in `src/types/gantt.ts` so page, hook, API, and store code use one schema.
- Added `canManageGantt(role)` in `src/lib/auth.ts` with the intended write policy:
  - `System Admin`
  - `Project Manager`
  - `Coordinator`
- Added `src/lib/gantt-store.ts` as a per-project in-memory store seeded from `src/data/gantt-tasks.json` for `proj-001` and initialized empty for other projects.
- Extended `src/app/api/gantt/[projectId]/route.ts` from read-only `GET` to full task CRUD:
  - `GET` returns per-project task/link data
  - `POST` creates a task for the selected project
  - `PATCH` edits basic schedule fields
  - `DELETE` removes a task and cascades descendant tasks and touching links
- Kept API protection layered:
  - `requireProjectAccess(projectId)` for project visibility
  - `canManageGantt(role)` for writes
- Extended `src/hooks/useGantt.ts` with React Query mutations:
  - `useCreateGanttTask()`
  - `useUpdateGanttTask()`
  - `useDeleteGanttTask()`
- Updated `src/app/(dashboard)/projects/[id]/gantt/page.tsx`:
  - PM/Coordinator/Admin now see `เพิ่มงาน`
  - modal-based create/edit flow
  - per-row edit/delete actions
  - engineer stays read-only
  - task tree builder now supports arbitrary nesting rather than only one child level
- Simplified the date inputs in the modal to typed `DD/MM/YYYY` text fields. This was necessary because the first implementation using Ant Design `DatePicker` was brittle under Playwright typed input.

## RED -> GREEN Evidence
- RED:
  - `npx playwright test tests/e2e/project-gantt-crud.spec.ts --reporter=line`
  - Failed as expected because the Gantt page had no add/edit/delete UI yet.
  - Failing selectors:
    - `เพิ่มงาน` missing for PM
    - `เพิ่มงาน` missing for Coordinator
- GREEN:
  - `npx playwright test tests/e2e/project-gantt-crud.spec.ts --reporter=line`
  - Result: `3 passed`
  - Covered:
    - PM can add, edit, and delete a Gantt task
    - Coordinator can add and delete a Gantt task
    - Engineer sees Gantt as read-only

## Validation
- `npm run lint -- --file 'src/app/(dashboard)/projects/[id]/gantt/page.tsx' --file 'src/app/api/gantt/[projectId]/route.ts' --file 'src/lib/gantt-store.ts' --file 'src/hooks/useGantt.ts' --file 'src/types/gantt.ts'`
  - passed
- `npm run lint`
  - passed with pre-existing warnings in:
    - `src/app/(dashboard)/projects/[id]/change-request/page.tsx`
    - `src/app/(dashboard)/projects/[id]/documents/page.tsx`
    - `src/app/(dashboard)/projects/[id]/issues/page.tsx`
    - `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - passed after `npm run build`
  - repo note: this project includes `.next/types/**/*.ts` in `tsconfig.json`, so running `typecheck` before a fresh successful build can fail with missing generated type files.

## Files Changed
- `src/types/gantt.ts`
- `src/lib/auth.ts`
- `src/lib/gantt-store.ts`
- `src/hooks/useGantt.ts`
- `src/app/api/gantt/[projectId]/route.ts`
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
- `tests/e2e/project-gantt-crud.spec.ts`

## 2026-03-16 Follow-up: Seed Coverage For All 5 Projects

### Coverage Audit Findings
- Before this pass, meaningful domain data was effectively `proj-001`-only for most project menus.
- The audit found these seed files contained only `proj-001` records:
  - `src/data/wbs.json`
  - `src/data/daily-reports.json`
  - `src/data/issues.json`
  - `src/data/risks.json`
  - `src/data/milestones.json`
  - `src/data/quality-gates.json`
  - `src/data/inspections.json`
  - `src/data/change-requests.json`
- These domains also had project-001-only store behavior even where the raw JSON itself had no `projectId`:
  - `src/lib/evm-store.ts`
  - `src/lib/gantt-store.ts`
- Documents had a second bug:
  - `src/app/api/documents/[projectId]/route.ts` returned one shared document dataset for every project
  - `src/app/(dashboard)/projects/[id]/documents/page.tsx` also hardcoded `folder-2` as the selected folder
- Quality had a route-usage bug:
  - `src/app/(dashboard)/projects/[id]/quality/page.tsx` hardcoded `insp-001`
- Change Request had a route-usage bug:
  - `src/app/(dashboard)/projects/[id]/change-request/page.tsx` hardcoded featured record `CR-002`
- Project overview had a data-usage bug:
  - `src/app/(dashboard)/projects/[id]/page.tsx` hardcoded budget-spent as `56.9%`

### Implementation
- Added `src/lib/generated-project-data.ts`
  - Keeps existing `proj-001` seeds untouched
  - Generates coherent domain data for:
    - `proj-002` Online Activity Booking System
    - `proj-003` AV System Procurement
    - `proj-004` Natural History Museum Building B
    - `proj-005` Visitor Satisfaction Research 2569
- The generated data now covers:
  - WBS
  - BOQ
  - Gantt
  - Milestones
  - Daily Reports
  - EVM points
  - Risks
  - Issues
  - Quality Gates
  - ITP items / Inspection records
  - Documents
  - Change Requests
- Updated existing stores to merge generated project data:
  - `src/lib/wbs-store.ts`
  - `src/lib/boq-store.ts`
  - `src/lib/daily-report-store.ts`
  - `src/lib/issue-store.ts`
  - `src/lib/risk-store.ts`
  - `src/lib/evm-store.ts`
  - `src/lib/gantt-store.ts`
  - `src/lib/quality-store.ts`
- Added new stores where raw APIs were still reading one-off JSON directly:
  - `src/lib/milestone-store.ts`
  - `src/lib/quality-gate-store.ts`
  - `src/lib/change-request-store.ts`
  - `src/lib/document-store.ts`
- Updated APIs to use those stores:
  - `src/app/api/milestones/[projectId]/route.ts`
  - `src/app/api/quality/gates/[projectId]/route.ts`
  - `src/app/api/change-requests/route.ts`
  - `src/app/api/documents/[projectId]/route.ts`
- Updated page usage so the new data is actually consumed meaningfully:
  - `src/app/(dashboard)/projects/[id]/documents/page.tsx`
    - removed hardcoded folder id
    - selects the first available child folder for the current project
  - `src/app/(dashboard)/projects/[id]/quality/page.tsx`
    - removed hardcoded `insp-001` navigation
    - links each ITP row to its actual inspection record if present
    - removed the incorrect static ITP subtitle
  - `src/app/(dashboard)/projects/[id]/change-request/page.tsx`
    - no longer assumes `CR-002`
    - now features the first pending CR, or the first CR if none are pending
  - `src/app/(dashboard)/projects/[id]/page.tsx`
    - budget-spent now derives from latest EVM AC when available

### Coverage Result
- After this pass, the 5 seeded projects have meaningful data backing the visible project-scoped menus:
  - `โครงการ (Projects)` via project list/detail seed data
  - `ทีมโครงการ (Team)` via membership seed data
  - `WBS/BOQ`
  - `แผนงาน (Gantt)`
  - `รายงานประจำวัน`
  - `งบประมาณ (EVM)`
  - `คุณภาพ (Quality)`
  - `ความเสี่ยง (Risk)`
  - `ปัญหา (Issues)`
  - `เอกสาร (Documents)`
- The data is intentionally stage-aware:
  - in-progress projects show active execution data
  - the planning project shows planning-heavy data rather than pretending construction is underway
  - the completed research project shows closed/completed history

### Validation
- `npm run lint`
  - passed with pre-existing warnings in:
    - `src/app/(dashboard)/projects/[id]/issues/page.tsx`
    - `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - passed after `npm run build`
