# Current Implementation Tracker

## Purpose
- This file tracks the current NSM PQM app as implemented today.
- It is based on the current route map, API handlers, hooks, stores, and E2E coverage.
- It does not follow the older DOCX screen taxonomy. The source of truth is the app on disk.

## Status Legend
- `Strong`: meaningful read/write behavior exists, backed by API/store logic, and the module is credible in a demo.
- `Moderate`: reads are real and some writes exist, but important workflow depth is still missing.
- `Weak`: the page exists and looks substantial, but key writes or persistence are still missing.
- `Missing`: no meaningful module exists yet.

## Current Route Inventory

### Global
- `/login`
- `/dashboard`
- `/notifications`
- `/executive`
- `/executive/evaluation`
- `/admin`
- `/admin/audit`

### Project Creation
- `/projects/new`

### Project-Scoped
- `/projects/[id]`
- `/projects/[id]/approval`
- `/projects/[id]/change-request`
- `/projects/[id]/daily-report`
- `/projects/[id]/documents`
- `/projects/[id]/gantt`
- `/projects/[id]/issues`
- `/projects/[id]/progress`
- `/projects/[id]/quality`
- `/projects/[id]/quality/inspection/[inspectionId]`
- `/projects/[id]/risk`
- `/projects/[id]/s-curve`
- `/projects/[id]/team`
- `/projects/[id]/wbs`

## Module Gap Matrix

| Module | Main Route | Current Status | Implemented Reads | Implemented Writes | Missing Reads | Missing Writes | API State | Current E2E Coverage | Priority |
|---|---|---|---|---|---|---|---|---|---|
| Login / Auth | `src/app/login/page.tsx` | Moderate | Session bootstrap, role-aware login, logout, route guards | Mock login/logout works | Real identity provider / SSO | Real SSO session lifecycle | `GET/POST` auth routes exist | Covered indirectly in multiple E2E specs | Medium |
| Portfolio Dashboard | `src/app/(dashboard)/dashboard/page.tsx` | Strong | Portfolio KPIs, charts, table, role-aware project visibility | Filter interactions work | More domain-specific analytics | None urgently required | Data comes from working project APIs | Covered in create/shell and schedule-health specs | Low |
| Project Create | `src/app/(dashboard)/projects/new/page.tsx` | Strong | Reads project types, users, current-user defaults, draft state | Create project, save/load draft, bootstrap starter state | Template library, richer setup helpers | Pre-create invite workflow, reusable template CRUD | `GET/POST /api/projects` works | `project-create-and-shell`, `project-bootstrap-empty-state` | Medium |
| Project Overview | `src/app/(dashboard)/projects/[id]/page.tsx` | Strong | Reads project summary, execution model, progress, activities | Status mostly derived, project metadata can update through project API | Richer domain summaries | Explicit edit workflow for more project metadata | `GET/PATCH /api/projects/[id]` exists | Covered indirectly by shell and propagation specs | Low |
| Team | `src/app/(dashboard)/projects/[id]/team/page.tsx` | Strong | Reads live memberships and project-scoped stats | Add member, remove member | Invite audit / invitation history | Pending invite / accept / reject workflow | `GET/POST/DELETE /api/team/[projectId]` exists | Covered in create/shell flow | Low |
| WBS | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | Moderate | WBS tree, BOQ per node, progress rollups | Add WBS node, add BOQ item | Richer node detail reads | Edit/delete WBS, edit/delete BOQ, import/export | `GET/POST /api/wbs/[projectId]`, `GET/POST /api/boq/[wbsId]` | `project-wbs-boq-coverage`, create/shell | Medium |
| Gantt | `src/app/(dashboard)/projects/[id]/gantt/page.tsx` | Strong | Tasks, parent-child rows, execution state, schedule health | Add/edit/delete tasks, progress propagation | Dependency graph reads are shallow | Dependency CRUD, drag-drop, baseline management | `GET/POST/PATCH/DELETE /api/gantt/[projectId]` | `project-gantt-crud`, `project-gantt-propagation`, schedule-health | Medium |
| Daily Report | `src/app/(dashboard)/projects/[id]/daily-report/page.tsx` | Moderate | List/detail of reports per project | Create daily report | Richer field history like attachments/GPS/signature provenance | Photo upload, GPS capture, signature capture, WBS quantity capture, edit/delete flow | `GET/POST /api/daily-reports`, `GET /api/daily-reports/[id]` | Covered in create/shell flow | Medium |
| Progress Update | `src/app/(dashboard)/projects/[id]/progress/page.tsx` | Strong | Reads derived progress from WBS/Gantt/EVM | No direct writes by design | Forecast comparison views could deepen | Not intended as primary write surface | Derived from working project/EVM/WBS/Gantt data | Covered indirectly by propagation specs | Low |
| EVM / S-Curve | `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` | Strong | Reads snapshot history, consistent metrics, internal vs outsourced mode | Add snapshot, delete snapshot | More reporting drill-downs | Edit snapshot, approval/locking workflow | `GET/POST/DELETE /api/evm/[projectId]` | `project-evm-metrics-consistency`, `project-evm-all-projects-consistency`, `project-outsourced-evm-mode`, `project-evm-quality-crud` | Low |
| Quality | `src/app/(dashboard)/projects/[id]/quality/page.tsx` | Moderate | Quality gates, ITP items, inspection records | Add inspection, delete inspection | Richer checklist evidence views | Edit inspection, gate transitions, checklist completion workflow | `GET /api/quality/gates/[projectId]`, `GET/POST/DELETE /api/quality/inspections` | `project-evm-quality-crud` | Medium |
| Inspection Detail | `src/app/(dashboard)/projects/[id]/quality/inspection/[inspectionId]/page.tsx` | Moderate | Reads inspection detail | No direct writes | Could read richer attachment history | Edit/resolution actions | Backed by inspection store/data | Indirect only | Medium |
| Risk | `src/app/(dashboard)/projects/[id]/risk/page.tsx` | Moderate | Reads project risks | Add risk | Richer heatmap/read models could improve | Update risk, close risk, mitigation tracking, delete risk | `GET/POST /api/risks/[projectId]` | Covered in create/shell flow | Medium |
| Issues | `src/app/(dashboard)/projects/[id]/issues/page.tsx` | Moderate | Reads project issues | Add issue, patch issue exists at API layer | UI does not expose full issue lifecycle well | Better assignment/state transitions, delete/close/reopen ergonomics | `GET/POST/PATCH /api/issues/[projectId]` | Covered in create/shell flow | Medium |
| Documents | `src/app/(dashboard)/projects/[id]/documents/page.tsx` | Weak | Reads folders, files, permissions, version history | None | More search/version provenance could improve | Upload file, create folder, rename, move, delete, version upload, permission edit | `GET /api/documents/[projectId]` only | No dedicated E2E | High |
| Change Requests | `src/app/(dashboard)/projects/[id]/change-request/page.tsx` | Weak | Reads CR list and featured detail | None | More filter/sort/history reads could improve | Create CR, edit CR, attach files, approve/reject, workflow transitions | `GET /api/change-requests` only | No dedicated E2E | High |
| Approval | `src/app/(dashboard)/projects/[id]/approval/page.tsx` | Weak | Reads demo approval state | Mostly local/mock actions | Real approval inbox/history | Persisted approve/reject/escalate actions | No dedicated approval API | No dedicated E2E | High |
| Notifications | `src/app/(dashboard)/notifications/page.tsx` | Moderate | Reads notifications feed and states | Mark-read patch works | Real delivery/provider status | Persisted settings, outbound channel integration | `GET/PATCH /api/notifications` | No dedicated E2E | Medium |
| Executive Dashboard | `src/app/(dashboard)/executive/page.tsx` | Moderate | Reads portfolio/project summaries | Little direct write behavior by design | Better drill-through reads | Not intended as main write surface | Backed by project/evaluation data reads | Indirect only | Medium |
| Evaluation | `src/app/(dashboard)/executive/evaluation/page.tsx` | Weak | Reads seeded evaluation content | None | Generic project selection, historical evaluations | Create/update evaluation, approvals, scoring persistence | `GET /api/evaluation/[projectId]` only | No dedicated E2E | High |
| Admin | `src/app/(dashboard)/admin/page.tsx` | Weak | Reads org structure, users, audit summaries | UI has action buttons only | More operational detail views | Create/edit/suspend/reactivate users, org unit CRUD, import/export persistence | `GET /api/users`, `GET /api/org-structure`, `GET /api/audit-logs` only | No dedicated E2E | High |
| Audit Log | `src/app/(dashboard)/admin/audit/page.tsx` | Moderate | Reads audit logs | No writes by design | More filters/export can improve | Not a main write surface | `GET /api/audit-logs` | No dedicated E2E | Low |

## Cross-Cutting Missing Modules

These are not current primary routes, but they remain important capability gaps:

| Capability | Current Reality | Gap |
|---|---|---|
| Resource / Capacity Management | Not implemented as a module | Missing route, API, and data model |
| Stakeholder Registry | Not implemented as a module | Missing route, API, and data model |
| Report Builder | Not implemented as a module | Missing route, API, export model, and templates |
| Mobile-specific daily reporting | Daily report exists only in the desktop route tree | Missing mobile route group and mobile-specific UX |
| Real SSO / external integration | Mock login only | Missing external auth integration and DSC-style workflows |

## API Completion Matrix

| API Route | Methods Today | Main Missing Methods / Behavior |
|---|---|---|
| `src/app/api/projects/route.ts` | `GET`, `POST` | Project list filters could deepen |
| `src/app/api/projects/[id]/route.ts` | `GET`, `PATCH` | No delete/archive |
| `src/app/api/team/[projectId]/route.ts` | `GET`, `POST`, `DELETE` | No invite lifecycle |
| `src/app/api/wbs/[projectId]/route.ts` | `GET`, `POST` | No `PATCH`, `DELETE` |
| `src/app/api/boq/[wbsId]/route.ts` | `GET`, `POST` | No `PATCH`, `DELETE` |
| `src/app/api/gantt/[projectId]/route.ts` | `GET`, `POST`, `PATCH`, `DELETE` | No dependency/link API |
| `src/app/api/daily-reports/route.ts` | `GET`, `POST` | No `PATCH`, `DELETE` |
| `src/app/api/daily-reports/[id]/route.ts` | `GET` | No `PATCH`, `DELETE` |
| `src/app/api/evm/[projectId]/route.ts` | `GET`, `POST`, `DELETE` | No `PATCH`, approval/lock |
| `src/app/api/quality/gates/[projectId]/route.ts` | `GET` | No gate transition API |
| `src/app/api/quality/inspections/route.ts` | `GET`, `POST`, `DELETE` | No `PATCH` |
| `src/app/api/risks/[projectId]/route.ts` | `GET`, `POST` | No `PATCH`, `DELETE` |
| `src/app/api/issues/[projectId]/route.ts` | `GET`, `POST`, `PATCH` | No `DELETE`, no richer workflow endpoints |
| `src/app/api/documents/[projectId]/route.ts` | `GET` | Missing all write endpoints |
| `src/app/api/change-requests/route.ts` | `GET` | Missing all write endpoints |
| `src/app/api/evaluation/[projectId]/route.ts` | `GET` | Missing create/update workflow |
| `src/app/api/users/route.ts` | `GET` | Missing all write endpoints |
| `src/app/api/org-structure/route.ts` | `GET` | Missing all write endpoints |
| `src/app/api/audit-logs/route.ts` | `GET` | Read-only by design |
| `src/app/api/notifications/route.ts` | `GET`, `PATCH` | No persisted settings/config |

## Test Coverage Matrix

| Spec | Current Focus | Gaps Remaining |
|---|---|---|
| `tests/e2e/project-create-and-shell.spec.ts` | Login, create project, shell continuity | Does not prove deeper admin/doc/change-request flows |
| `tests/e2e/project-bootstrap-empty-state.spec.ts` | New-project starter state | Does not cover richer module writes |
| `tests/e2e/project-wbs-boq-coverage.spec.ts` | Seeded WBS/BOQ rendering | No WBS/BOQ edit/delete coverage |
| `tests/e2e/project-gantt-crud.spec.ts` | Gantt task CRUD and timeline correctness | No dependency/baseline coverage |
| `tests/e2e/project-gantt-propagation.spec.ts` | Gantt-to-WBS/project propagation | Does not cover approval interactions |
| `tests/e2e/project-schedule-health.spec.ts` | Schedule health derivation | No broader executive/dashboard drill-down coverage |
| `tests/e2e/project-evm-quality-crud.spec.ts` | EVM snapshot and quality inspection CRUD | No quality gate workflow coverage |
| `tests/e2e/project-evm-metrics-consistency.spec.ts` | Single-project EVM consistency | No approval/lock workflow coverage |
| `tests/e2e/project-evm-all-projects-consistency.spec.ts` | Cross-project EVM consistency | Seeded projects only |
| `tests/e2e/project-outsourced-evm-mode.spec.ts` | Internal vs outsourced EVM split | No mixed operational workflows |

### Missing High-Value E2E Specs
- `documents-crud.spec.ts`
- `change-request-workflow.spec.ts`
- `admin-user-management.spec.ts`
- `approval-workflow.spec.ts`
- `daily-report-rich-capture.spec.ts`
- `quality-gate-transition.spec.ts`

## Recommended Delivery Batches

### Batch 1: High-Severity Write Gaps
1. Documents CRUD
   - Add upload/create-folder/delete/version endpoints
   - Wire buttons already present in the UI
   - Add one E2E proving upload and folder creation
2. Change Request workflow
   - Add create/edit/approve/reject transitions
   - Persist featured detail view from real workflow data
   - Add one E2E from create to approval
3. Admin writes
   - Add user create/edit/suspend/reactivate
   - Add org unit create/edit
   - Add audit entries for admin actions

### Batch 2: Operational Depth
1. Daily Report rich capture
   - Photos, GPS, signature, WBS-linked output
2. Approval workflow
   - Persisted approvals, step transitions, audit trail
3. Quality gate transitions
   - Gate status changes and inspection resolution path

### Batch 3: Planning / Control Depth
1. Gantt dependency CRUD
2. WBS/BOQ edit/delete
3. Issue and risk lifecycle depth

## Definition Of Done For A Module
- The page reads from a real API/store rather than local mock state.
- The main user action buttons are wired to real writes.
- API permissions match UI visibility rules.
- One happy-path E2E exists for the module.
- The module does not rely on route-order side effects to initialize state.

## Suggested Ownership Of Next Work
- `Documents` -> first, because the UI is already present and the API gap is clear.
- `Change Requests` -> second, because the screen is already structured around a workflow that needs persistence.
- `Admin` -> third, because the page currently advertises capabilities the backend does not support.
