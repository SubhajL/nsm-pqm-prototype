# Plan Draft A

## Overview
- Add an explicit project-membership model and a shared access helper so menu visibility and project visibility are driven by the same rules.
- Filter `/api/projects` and project detail access server-side, then update the sidebar and login screen to reflect each role's allowed menus and accessible projects.
- Auggie semantic search was skipped because it is unreliable in this repo; plan is based on direct file inspection and exact-string searches.

## Files to Change
- `src/data/project-memberships.json`
  - Seed per-project user assignments for prototype visibility.
- `src/lib/project-membership-store.ts`
  - Shared in-memory membership store, parallel to `project-store.ts`.
- `src/lib/project-access.ts`
  - Shared helpers for role-based menu visibility and project access.
- `src/lib/auth.ts`
  - Export shared role/menu configuration and route defaults.
- `src/app/api/projects/route.ts`
  - Filter visible projects by current user and register creator membership on POST.
- `src/app/api/projects/[id]/route.ts`
  - Reject access to projects outside the current user's visibility scope.
- `src/app/api/notifications/route.ts`
  - Filter project-scoped notifications by visible project IDs.
- `src/components/layout/Sidebar.tsx`
  - Show only menus allowed for the current role and default project context.
- `src/components/auth/LoginScreen.tsx`
  - Show clearer role/menu expectations at login.

## Implementation Steps
1. TDD sequence
   1) Add/shared data-access helpers and run fast gates to catch type issues
   2) Patch project APIs to use access helpers
   3) Patch sidebar/login UI to use the same menu rules
   4) Run lint/typecheck/build and verify role scenarios manually
2. `getProjectMembershipStore()`
   - Provide a single mutable membership dataset so project creation can add the creator's membership and access checks stay consistent across routes.
3. `filterProjectsForUser()` and `canUserAccessProject()`
   - Centralize all visibility logic so every caller uses the same answer.
4. `canAccessMenuItem()` and `getRoleMenuLabels()`
   - Define the exact sidebar menu matrix per role and reuse it in both sidebar rendering and login expectations.
5. API filtering
   - Use the auth cookie to resolve the current user, then return only visible projects and project-scoped notifications.

## Test Coverage
- `projects api filters by current user visibility`
  - Only assigned projects are returned.
- `project detail rejects unauthorized project`
  - Hidden projects do not load by direct ID.
- `sidebar renders only allowed menu items`
  - Role sees permitted modules only.
- `new project creation adds creator membership`
  - Creator can see the project immediately.

## Decision Completeness
- Goal
  - Make role-based menus explicit and ensure PM/staff users only see their own assigned projects.
- Non-goals
  - Full workflow RBAC for every mutation in every domain endpoint.
- Success criteria
  - PM/staff dashboard data and project access are limited to assigned projects.
  - Sidebar menus differ by role according to one shared rule set.
  - Admin/executive retain broader visibility.
- Public interfaces
  - New mock data file: `src/data/project-memberships.json`
  - No external API contract changes.
- Edge cases / failure modes
  - No assigned projects: user still reaches dashboard but sees no project-scoped menu links.
  - New project created by PM/staff: creator is auto-assigned and can open it immediately.
  - Manual deep-link to hidden project: fail closed with API `403`.
- Rollout & monitoring
  - No flags; verify with seeded login users from the login screen.
- Acceptance checks
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## Dependencies
- Existing auth cookie/session flow
- Existing project store and create-project flow

## Validation
- Login as Admin, Executive, PM, Engineer, Coordinator, Consultant, and Team Member.
- Confirm menu differences in the sidebar.
- Confirm PM/staff dashboard table only contains assigned projects.
- Try opening a hidden project by URL and verify it is blocked or empty.

## Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `project-membership-store.ts` | project API handlers | imported by project access helpers | in-memory membership store |
| `project-access.ts` | sidebar/login/project APIs | imported by UI + route handlers | project + membership datasets |
| filtered `/api/projects` | dashboard + sidebar consumers | `src/hooks/useProjects.ts` | project store |
| filtered `/api/notifications` | notifications page | `src/hooks/useNotifications.ts` | notification store |

# Plan Draft B

## Overview
- Keep project visibility logic mostly on the client by fetching all projects, then filtering in React based on the current user and a new membership dataset.
- This is lighter-touch for route handlers but weaker, because direct API access would still expose hidden projects.

## Files to Change
- `src/data/project-memberships.json`
- `src/lib/project-access.ts`
- `src/components/layout/Sidebar.tsx`
- `src/components/auth/LoginScreen.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/hooks/useProjects.ts` or client selectors

## Implementation Steps
1. TDD sequence
   1) Add membership dataset and client-side helper
   2) Update dashboard/sidebar/login to filter menus/projects client-side
   3) Run gates
2. Client visibility helper
   - Filter projects and menu items in React from auth store user data.
3. Sidebar/login updates
   - Reflect role-specific menus and first visible project.

## Test Coverage
- `dashboard hides other projects client-side`
  - Table/charts scoped to visible set.
- `sidebar hides menu items by role`
  - Unauthorized modules omitted.

## Decision Completeness
- Goal
  - Improve UI visibility and menu clarity.
- Non-goals
  - Server-side enforcement.
- Success criteria
  - Users visually stop seeing unauthorized projects or menus in the UI.
- Public interfaces
  - New mock membership dataset only.
- Edge cases / failure modes
  - Direct URL/API access remains open; this is fail-open.
- Rollout & monitoring
  - None.
- Acceptance checks
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## Dependencies
- Auth store user data on the client

## Validation
- Login as several users and compare dashboard/sidebar visibility.

## Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| client visibility helper | dashboard/sidebar render | imported by UI only | project + membership datasets |

# Unified Execution Plan

## Overview
- Implement explicit project memberships plus shared role/menu access helpers, then enforce project visibility at the project APIs so PM/staff users only receive their own projects.
- Use the same helper set to render role-specific menus in the sidebar and clearer access expectations on the login screen.
- Chosen over Draft B because it fails closed for project data instead of relying only on UI filtering.

## Files to Change
- `src/data/project-memberships.json`
- `src/lib/project-membership-store.ts`
- `src/lib/project-access.ts`
- `src/lib/auth.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/notifications/route.ts`
- `src/components/layout/Sidebar.tsx`
- `src/components/auth/LoginScreen.tsx`

## Implementation Steps
1. TDD sequence
   1) Add membership dataset/store and access helpers
   2) Run `npm run typecheck` to catch contract mistakes
   3) Patch project and notification APIs to use the helpers
   4) Patch sidebar and login screen to use the same role/menu rules
   5) Run `npm run lint && npm run build`
2. Seed project memberships
   - Define which users belong to which projects so “their projects” is explicit and not guessed from broken `managerId` values.
3. Build shared access helpers
   - Export project visibility functions and role-based menu permissions from one place.
4. Enforce access in APIs
   - Filter the project list, deny hidden project detail access, and hide notifications tied to inaccessible projects.
5. Update role-aware UI
   - Sidebar shows only allowed menus and only project-scoped links when an accessible project exists.
   - Login screen shows menu visibility and project-scope expectations for the selected user.

## Test Coverage
- `api projects returns only memberships for engineer`
  - Engineer sees assigned projects only.
- `api project detail forbids hidden project`
  - Unauthorized project ID is blocked.
- `sidebar menu matrix matches role`
  - Each role gets the right modules.
- `create project adds current user membership`
  - Creator sees new project immediately.
- `notifications exclude hidden project records`
  - Staff see only relevant project notifications.

## Decision Completeness
- Goal
  - Role-based sidebar menus and project visibility consistent with explicit project assignments.
- Non-goals
  - Fine-grained per-action RBAC for every domain mutation.
- Success criteria
  - PM/Engineer/Coordinator/Team Member/Consultant only see assigned projects in dashboard/API responses.
  - Sidebar menu matrix is role-specific and shared from one source.
  - Admin sees all menus/projects; Executive sees executive reporting plus broader read visibility.
- Public interfaces
  - New mock data file `src/data/project-memberships.json`
  - No user-facing API shape changes; only filtered payload contents.
- Edge cases / failure modes
  - User with zero project memberships: dashboard loads with zero projects and no project module shortcuts.
  - Hidden project by direct ID: API returns `403` fail closed.
  - New project creation by non-admin: creator membership added automatically.
- Rollout & monitoring
  - No feature flag; verify with seeded login users.
- Acceptance checks
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

## Dependencies
- Existing auth cookie/session flow
- Existing project create flow and project store

## Validation
- Login as:
  - `System Admin` -> all projects + all menus
  - `Executive` -> reports-oriented menus, all projects
  - `Project Manager` -> assigned projects only, full project-management menus
  - `Engineer` -> assigned projects only, engineering/project-delivery menus
  - `Coordinator` -> assigned projects only, coordination/report/doc menus
  - `Team Member` -> assigned projects only, limited execution menus
  - `Consultant` -> assigned projects only, quality/document read-oriented menus
- Confirm dashboard table and projects API output match the expected assignments.

## Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `src/data/project-memberships.json` | access helper initialization | imported by membership store | in-memory membership dataset |
| `src/lib/project-membership-store.ts` | project list/detail/create APIs | imported by project access + project POST | membership store |
| `src/lib/project-access.ts` | sidebar, login, projects API, notifications API | shared helper import sites | project store + membership store |
| `src/app/api/projects/route.ts` | dashboard/sidebar project consumers | existing App Router route handler | project store |
| `src/app/api/projects/[id]/route.ts` | project overview/detail fetch | existing App Router route handler | project store |
| `src/app/api/notifications/route.ts` | notifications screen | existing App Router route handler | notification store |

## 2026-03-16 00:55:40 +07

### Goal
- Define role-specific menus and restrict PM/staff users to only their assigned projects.

### What Changed
- `src/data/project-memberships.json`
  - Added explicit prototype memberships because the seeded project `managerId` values do not line up with the login user IDs.
- `src/lib/project-membership-store.ts`
  - Added a shared in-memory membership store parallel to the existing project store.
- `src/lib/project-access.ts`
  - Added shared helpers for:
    - current active user lookup
    - role-to-assignment-role mapping
    - visible project filtering
    - project access checks
    - notification filtering
    - role-based menu labels and menu permissions
- `src/app/api/projects/route.ts`
  - GET now returns only visible projects for the logged-in user.
  - POST now auto-assigns the creator to the new project membership store.
- `src/app/api/projects/[id]/route.ts`
  - GET now fails closed with `403` for hidden projects.
- `src/app/api/notifications/route.ts`
  - GET now hides notifications tied to inaccessible projects for PM/staff users.
- `src/components/layout/Sidebar.tsx`
  - Sidebar now derives its project target from the filtered project list.
  - Menu items are role-specific via one shared access matrix.
  - Project-scoped menus render only when an accessible project exists.
- `src/components/auth/LoginScreen.tsx`
  - Login screen now explains that PM/staff users see only assigned projects.
  - Added visible-menu tags for the selected role.
- `src/app/(dashboard)/projects/[id]/layout.tsx`
  - Added an access check via `useProject(projectId)` and redirects hidden project routes back to `/dashboard`.

### Menu Matrix
- `System Admin`
  - `แดชบอร์ด`, `โครงการ`, `WBS/BOQ`, `แผนงาน`, `รายงานประจำวัน`, `งบประมาณ (EVM)`, `คุณภาพ`, `ความเสี่ยง`, `ปัญหา`, `เอกสาร`, `รายงาน`, `ผู้ดูแลระบบ`
- `Executive`
  - `แดชบอร์ด`, `โครงการ`, `รายงาน`
- `Project Manager`
  - `แดชบอร์ด`, `โครงการ`, `WBS/BOQ`, `แผนงาน`, `รายงานประจำวัน`, `งบประมาณ (EVM)`, `คุณภาพ`, `ความเสี่ยง`, `ปัญหา`, `เอกสาร`
- `Engineer`
  - `แดชบอร์ด`, `โครงการ`, `WBS/BOQ`, `แผนงาน`, `รายงานประจำวัน`, `คุณภาพ`, `ความเสี่ยง`, `ปัญหา`, `เอกสาร`
- `Coordinator`
  - `แดชบอร์ด`, `โครงการ`, `รายงานประจำวัน`, `ความเสี่ยง`, `ปัญหา`, `เอกสาร`
- `Team Member`
  - `แดชบอร์ด`, `โครงการ`, `รายงานประจำวัน`, `ปัญหา`, `เอกสาร`
- `Consultant`
  - `แดชบอร์ด`, `โครงการ`, `คุณภาพ`, `เอกสาร`

### TDD Evidence
- No RED unit-test run was possible because the repo still has no automated test harness or `test` script.
- Static gate evidence:
  - Initial `npm run typecheck` failed due the known stale `.next/types` issue before a fresh build.
  - After `npm run build`, `npm run typecheck` passed.

### Tests Run
- `npm run lint` -> pass with pre-existing `react-hooks/exhaustive-deps` warnings in project subpages
- `npm run build` -> pass
- `npm run typecheck` -> pass after build regenerated `.next/types`

### Wiring Verification Evidence
- `src/lib/project-access.ts`
  - runtime entry: sidebar render, login screen render, projects API, notifications API
  - registration: direct imports from UI and route handlers
- `src/app/api/projects/route.ts`
  - runtime entry: dashboard/sidebar project consumers
  - registration: existing App Router route handler
  - evidence: GET now calls `getVisibleProjectsForUser`, POST pushes creator membership
- `src/app/api/projects/[id]/route.ts`
  - runtime entry: project overview/layout access check
  - registration: existing App Router route handler
  - evidence: GET now calls `canUserAccessProject`
- `src/app/(dashboard)/projects/[id]/layout.tsx`
  - runtime entry: every `/projects/:id/*` page render
  - registration: nested App Router layout
  - evidence: blocked project fetch redirects to `/dashboard`

### Behavior Changes / Risk Notes
- PM/Engineer/Coordinator/Team Member/Consultant users now see only assigned projects in the dashboard and sidebar default project context.
- Admin and Executive retain broader project visibility.
- Hidden project deep links now fail closed at the project detail API and are redirected out of the project shell.

### Follow-ups / Known Gaps
- Project-scoped domain APIs other than `/api/projects/[id]` are still mostly guarded indirectly by the project layout redirect, not by their own per-route access check.
- Pre-existing hook dependency warnings remain in several project pages.

## 2026-03-16 01:03:59 +07

### Goal
- Close the remaining server-side access gap by enforcing project visibility directly in project-scoped domain APIs.

### What Changed
- `src/lib/project-api-access.ts`
  - Added shared API helpers:
    - `getCurrentApiUser()`
    - `requireProjectAccess(projectId)`
    - `getVisibleProjectIdsForCurrentUser()`
- Added direct project access checks to:
  - `src/app/api/issues/[projectId]/route.ts`
  - `src/app/api/risks/[projectId]/route.ts`
  - `src/app/api/wbs/[projectId]/route.ts`
  - `src/app/api/milestones/[projectId]/route.ts`
  - `src/app/api/documents/[projectId]/route.ts`
  - `src/app/api/evm/[projectId]/route.ts`
  - `src/app/api/gantt/[projectId]/route.ts`
  - `src/app/api/quality/gates/[projectId]/route.ts`
- Added query/id-based access enforcement to:
  - `src/app/api/quality/inspections/route.ts`
  - `src/app/api/change-requests/route.ts`
  - `src/app/api/daily-reports/route.ts`
  - `src/app/api/daily-reports/[id]/route.ts`
  - `src/app/api/boq/[wbsId]/route.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
  - Restricted the floating `สร้างโครงการใหม่` action to `System Admin` and `Project Manager` so the dashboard actions match the role model.

### TDD Evidence
- No RED unit-test run was possible because this repo still has no test harness or `test` script.
- Static gate evidence:
  - `npm run build` initially failed on `daily-reports/POST` because the request payload was typed too loosely for `DailyReport`.
  - After making required fallback fields explicit, the build passed.

### Tests Run
- `npm run lint` -> pass with pre-existing `react-hooks/exhaustive-deps` warnings in project subpages
- `npm run build` -> pass
- `npm run typecheck` -> pass after build regenerated `.next/types`

### Wiring Verification Evidence
- `src/lib/project-api-access.ts`
  - runtime entry: all guarded App Router API handlers
  - registration: imported directly by project-scoped route handlers
- `src/app/api/boq/[wbsId]/route.ts`
  - runtime entry: BOQ panel fetch
  - registration: existing App Router route handler
  - evidence: resolves `wbsId -> projectId` via `src/data/wbs.json`, then calls `requireProjectAccess`
- `src/app/api/daily-reports/[id]/route.ts`
  - runtime entry: daily report detail fetch
  - registration: existing App Router route handler
  - evidence: resolves report, then guards on `report.projectId`
- Query-based routes
  - `change-requests`, `daily-reports`, `quality/inspections`
  - evidence: explicit `projectId` is guarded directly; no `projectId` falls back to filtering by visible project IDs

### Behavior Changes / Risk Notes
- Hidden project data is now blocked at the API layer, not only redirected away at the page layer.
- Users who try direct API calls for inaccessible projects now receive `403`.
- Query routes without `projectId` now return only records tied to visible projects instead of the full mock dataset.

### Follow-ups / Known Gaps
- Pre-existing hook dependency warnings remain in several project pages.

## 2026-03-16 01:14:11 +07

### Goal
- Fix cross-user project leakage after login so a PM like `น.ส.วิภา ขจรศักดิ์` only sees her assigned projects, not the previous user's cached full portfolio.

### What Changed
- `src/components/auth/LoginScreen.tsx`
  - Cleared the React Query cache and reset `currentProjectId` immediately after successful login so the new session cannot reuse the previous user's project data or project context.
- `src/hooks/useProjects.ts`
  - Added the current user ID to `useProjects()` and `useProject()` query keys so project list/detail caches are scoped per authenticated user instead of globally shared in the browser session.
- `src/components/layout/Sidebar.tsx`
  - Cleared the React Query cache and reset `currentProjectId` on logout.
  - Normalized the active project selection so a stale `currentProjectId` from a previous session is replaced with the first visible project for the new user.

### TDD Evidence
- RED
  - No automated RED test was added because this repo does not currently have a focused client-side auth/session test harness for React Query cache transitions, and reproducing the bug depended on interactive session switching in a running browser.
- GREEN
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - Runtime verification:
    - `curl -s -c /tmp/pqm_pm.cookies -H 'Content-Type: application/json' -d '{"userId":"user-002"}' http://localhost:3002/api/auth/login >/tmp/pqm_login_pm.json && curl -s -b /tmp/pqm_pm.cookies http://localhost:3002/api/projects`
    - Result: exactly `proj-001` and `proj-004` returned for `user-002`
    - `curl -s -c /tmp/pqm_admin.cookies -H 'Content-Type: application/json' -d '{"userId":"user-001"}' http://localhost:3002/api/auth/login >/tmp/pqm_login_admin.json && curl -s -b /tmp/pqm_admin.cookies http://localhost:3002/api/projects`
    - Result: all 5 seeded projects returned for admin

### Tests Run
- `npm run lint` -> pass with pre-existing `react-hooks/exhaustive-deps` warnings in project pages unrelated to this fix
- `npm run build` -> pass
- `npm run typecheck` -> pass after build regenerated `.next/types`

### Wiring Verification Evidence
- Login flow entry point
  - `src/components/auth/LoginScreen.tsx` -> `apiPost('/auth/login')` -> `queryClient.clear()` -> `setCurrentProject(null)` -> `setCurrentUser(response.user)` -> `router.replace(...)`
- Logout flow entry point
  - `src/components/layout/Sidebar.tsx` -> `apiPost('/auth/logout')` -> `queryClient.clear()` -> `setCurrentProject(null)` -> `clearCurrentUser()`
- Project query consumers
  - `src/hooks/useProjects.ts` now keys project list/detail queries with the authenticated user ID, so switching users forces a new cache bucket.

### Behavior Changes / Risk Notes
- Switching from admin to PM/staff in the same browser session now fails closed: the new user gets a fresh project cache and a fresh active project context.
- Logging out now removes cached project data before redirecting to `/login`.
- Risk note: other non-project query hooks are still session-cleared by `queryClient.clear()` on login/logout, but they are not individually keyed by user yet.

### Follow-ups / Known Gaps
- The live dev server on `localhost:3002` can still accumulate stale `.next` chunk state during long sessions; restarting `next dev` remains the fastest fix when missing-module errors appear.
- There is still no automated browser-level regression test for auth-driven query cache isolation.

## 2026-03-16 06:33:34 +07

### Goal
- Fix inconsistent seeded PM metadata so `น.ส.สมศรี วรรณดี` sees only her own project and the dashboard no longer shows an engineer as the PM for that project.

### What Changed
- `src/data/projects.json`
  - Corrected seeded `managerId` values from invalid `usr-*` IDs to real `user-*` IDs.
  - Corrected `managerName` values so seeded projects show real PM/Admin owners instead of non-manager roles.
  - Specifically fixed `proj-002` to point at `user-006` / `น.ส.สมศรี วรรณดี`.
- `src/data/project-memberships.json`
  - Added explicit manager memberships for `proj-003` and `proj-005` so the seeded ownership model is internally consistent.

### TDD Evidence
- RED
  - No automated RED test was added because this repo still does not have a dedicated seed-data integrity test harness, and the bug was a mismatch inside mock seed records rather than a failing unit.
- GREEN
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - Runtime verification:
    - `curl -s -c /tmp/pqm_somsri.cookies -H 'Content-Type: application/json' -d '{"userId":"user-006"}' http://localhost:3002/api/auth/login >/tmp/pqm_login_somsri.json && curl -s -b /tmp/pqm_somsri.cookies http://localhost:3002/api/projects`
    - Result: only `proj-002`, with `managerName: "น.ส.สมศรี วรรณดี"`
    - `curl -s -c /tmp/pqm_vipa.cookies -H 'Content-Type: application/json' -d '{"userId":"user-002"}' http://localhost:3002/api/auth/login >/tmp/pqm_login_vipa.json && curl -s -b /tmp/pqm_vipa.cookies http://localhost:3002/api/projects`
    - Result: still `proj-001` and `proj-004` for `น.ส.วิภา ขจรศักดิ์`

### Tests Run
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project pages
- `npm run build` -> pass
- `npm run typecheck` -> pass

### Wiring Verification Evidence
- `src/data/projects.json`
  - runtime entry: `getProjectStore()` seed load used by `/api/projects` and dashboard consumers
- `src/data/project-memberships.json`
  - runtime entry: `getProjectMembershipStore()` used by `getVisibleProjectsForUser()`
- Live runtime validation
  - Restarted `next dev --port 3002` so the in-memory project store reloaded the corrected seed data before verification.

### Behavior Changes / Risk Notes
- `สมศรี` now sees only her own project and the PM column is consistent with her role.
- The seeded dataset is more internally consistent, but it is still a mock prototype dataset rather than normalized relational data.

### Follow-ups / Known Gaps
- A future hardening step would be to derive displayed PM labels from manager memberships rather than trusting duplicated `managerName` fields inside project records.

## Review (2026-03-16 06:35:34 +07) - non-pm seed/access audit

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: runtime seed/access audit
- Commands Run: `sed -n '1,220p' src/data/users.json`; `sed -n '1,220p' src/data/project-memberships.json`; `sed -n '1,260p' src/lib/project-access.ts`; `sed -n '1,220p' src/app/api/auth/login/route.ts`; `node - <<'NODE' ... NODE`; `curl -s -b ... /api/projects`; `curl -s -o ... -w '%{http_code}' ... /api/projects/proj-005`; `curl -s -o ... -w '%{http_code}' ... /api/auth/login`

### Findings
CRITICAL
- No findings.

HIGH
- `น.ส.พิมพ์ลดา งามวงศ์` has stale seeded `projectCount: 1` in [src/data/users.json:5](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/data/users.json#L5), but the active membership map grants her two projects in [src/data/project-memberships.json:4](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/data/project-memberships.json#L4) and [src/data/project-memberships.json:9](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/data/project-memberships.json#L9). The admin users table renders the raw `projectCount` field at [src/app/(dashboard)/admin/page.tsx:164](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/app/%28dashboard%29/admin/page.tsx#L164), so the UI will underreport her project load even though `/api/projects` correctly returns two projects. Fix direction: either update `user-004.projectCount` to `2` or stop storing this duplicated counter and derive it from memberships. Test needed: admin user list should show the same project count that `/api/projects` returns for the selected user.

MEDIUM
- `projectCount` is no longer a reliable source of truth for privileged roles either. `System Admin` `user-001` is seeded with `projectCount: 3` in [src/data/users.json:2](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/data/users.json#L2), but explicit seeded ownership is only two projects and live access is all five because admin bypasses membership checks in [src/lib/project-access.ts:117](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/lib/project-access.ts#L117). `Executive` `user-007` is seeded with `projectCount: 0` in [src/data/users.json:8](/Users/subhajlimanond/dev/nsm-pqm-prototype/src/data/users.json#L8) while live access is all five for the same reason. If the admin page intends `projectCount` to mean “projects this user can currently see/work on,” those rows are misleading. Fix direction: define whether `projectCount` means assigned projects or visible projects, then derive/display it consistently. Test needed: role matrix snapshot for admin page counts vs API visibility rules.

LOW
- No additional access-control bugs were found for the non-PM staff roles checked. Runtime verification showed: `Engineer` `user-003` -> 2 projects, hidden `proj-005` -> `403`; `Coordinator` `user-004` -> 2 projects; `Coordinator` `user-008` -> 1 project, hidden `proj-005` -> `403`; `Consultant` `user-009` -> 1 project, hidden `proj-005` -> `403`; `Team Member` `user-010` -> 1 project, hidden `proj-001` -> `403`; suspended `user-005` login -> `400`.

### Open Questions / Assumptions
- Assumed `projectCount` is meant to describe assignment/workload and should match seeded memberships rather than broad role-based visibility.
- If `projectCount` is only decorative demo metadata, the access-control layer itself is currently behaving correctly for the audited non-PM roles.

### Recommended Tests / Validation
- Add a seed-integrity test that compares `users.projectCount` with derived membership counts for non-privileged roles.
- Add a role-matrix integration test for `/api/projects` covering Engineer, Coordinator, Consultant, Team Member, Executive, and suspended users.
- Add an admin-page assertion that the “โครงการ” column uses derived counts or documented semantics.

### Rollout Notes
- No rollout blocker for access control itself; the only concrete defect found is stale demo metadata displayed in admin views.
- Because project/member data is held in-memory, restarting `next dev` is still required after seed changes to guarantee runtime parity.

## 2026-03-16 06:59:16 +07

### Goal
- Remove stale `projectCount` drift by deriving user project counts from the same membership/manager rules that drive project access.

### What Changed
- `src/lib/project-access.ts`
  - Added `getAssignedProjectCountForUser(user, projects)` so user workload can be computed from memberships plus manager ownership instead of duplicated seed metadata.
  - Refactored `getVisibleProjectsForUser()` to reuse the same assigned-project ID set for non-admin, non-executive access decisions.
- `src/app/api/users/route.ts`
  - Stopped returning the raw seeded `projectCount`.
  - Now maps each user to a derived `projectCount` at request time using `getAssignedProjectCountForUser(...)`.

### TDD Evidence
- RED
  - No automated RED test was added because this repo still has no test harness around the admin users API, and the bug was stale demo metadata rather than broken compile-time behavior.
- GREEN
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - Runtime verification:
    - `curl -s -c /tmp/admin-users.cookies -H 'Content-Type: application/json' -d '{"userId":"user-001"}' http://localhost:3002/api/auth/login >/dev/null; curl -s -b /tmp/admin-users.cookies http://localhost:3002/api/users`
    - Result: `user-004` now returns `projectCount: 2`, matching memberships; all other users return counts derived from the current project/membership seeds.

### Tests Run
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project pages
- `npm run build` -> pass
- `npm run typecheck` -> pass

### Wiring Verification Evidence
- `src/app/api/users/route.ts`
  - runtime entry: admin user-management screen via `useUsers()`
  - registration: existing App Router API handler
  - evidence: `GET /api/users` now derives `projectCount` from `getAssignedProjectCountForUser(...)`
- `src/lib/project-access.ts`
  - shared access helper now owns both project visibility and assigned-project counting logic, keeping them aligned.

### Behavior Changes / Risk Notes
- The admin user table now reflects assigned project counts derived from memberships/manager ownership, not manually maintained seed values.
- `System Admin` and `Executive` users now show assigned-project counts rather than “all visible projects” counts, which matches the chosen “assignment/workload” meaning for this field.

### Follow-ups / Known Gaps
- The stale `projectCount` fields still exist in `src/data/users.json`, but they are now ignored by the admin API. A later cleanup could remove that field from the seed file entirely.

## 2026-03-16 07:48:34 +07

### Goal
- Add a real project team page and sidebar entry so project member information exists for existing projects, not only in the create-project form.

### What Changed
- `src/lib/project-access.ts`
  - Added a new project-scoped menu key: `team`.
  - Exposed the team module to project roles that should see project member information.
- `src/components/layout/Sidebar.tsx`
  - Added `ทีมโครงการ (Team)` to the project-scoped sidebar section.
  - It follows the same rule as the other project modules: it only renders when there is an active project context.
- `src/app/api/team/[projectId]/route.ts`
  - Added a guarded team-members API for a specific project.
  - Joins project memberships with user records and returns role labels such as `manager`, `engineer`, `coordinator`, `team_member`, and `consultant`.
  - Normalized returned `projectCount` values to use derived counts rather than stale seed metadata.
- `src/hooks/useProjectTeam.ts`
  - Added a React Query hook for the new team API.
- `src/app/(dashboard)/projects/[id]/team/page.tsx`
  - Added the new project team page with:
    - project header
    - member counts by assignment role
    - member cards with contact info and assignment tags
    - a top note explicitly stating that this is project-scoped information and only makes sense when a project is selected
- `src/types/team.ts`
  - Added the typed shape for team API responses.

### TDD Evidence
- RED
  - No automated RED test was added because the repo still has no focused test harness for new App Router pages and APIs. The work was validated through compile/build/runtime checks instead.
- GREEN
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - Runtime verification:
    - `curl -s -c /tmp/team-vipa-api.cookies -H 'Content-Type: application/json' -d '{"userId":"user-002"}' http://localhost:3002/api/auth/login >/dev/null; curl -s -b /tmp/team-vipa-api.cookies http://localhost:3002/api/team/proj-001`
    - Result: project team returned for `proj-001`
    - `curl -s -c /tmp/team-napa-api.cookies -H 'Content-Type: application/json' -d '{"userId":"user-010"}' http://localhost:3002/api/auth/login >/dev/null; curl -s -o /tmp/team-hidden.out -w '%{http_code}' -b /tmp/team-napa-api.cookies http://localhost:3002/api/team/proj-001`
    - Result: `403` for hidden project access
    - `curl -s -c /tmp/team-vipa-page.cookies -H 'Content-Type: application/json' -d '{"userId":"user-002"}' http://localhost:3002/api/auth/login >/dev/null; curl -s -I -b /tmp/team-vipa-page.cookies http://localhost:3002/projects/proj-001/team`
    - Result: `200 OK` after restarting the stale dev server

### Tests Run
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project pages
- `npm run build` -> pass
- `npm run typecheck` -> pass

### Wiring Verification Evidence
- Sidebar entry
  - `src/components/layout/Sidebar.tsx` now points `ทีมโครงการ (Team)` to `/projects/[id]/team`
- API entry
  - `src/app/api/team/[projectId]/route.ts` is registered as `GET /api/team/:projectId`
- Page entry
  - `src/app/(dashboard)/projects/[id]/team/page.tsx` is registered as `/projects/:id/team`
- Data flow
  - `useProjectTeam(projectId)` -> `/api/team/:projectId` -> membership store + user seed join

### Behavior Changes / Risk Notes
- There is now a dedicated member-information page for existing projects.
- The new team menu follows the same project-selection rule as `WBS/BOQ`, `Gantt`, `Daily Report`, `EVM`, `Quality`, `Risk`, `Issues`, and `Documents`: without an active project, the menu is hidden because the data would not be meaningful.
- The recurring `next dev` missing-chunk problem still exists in this repo; a clean dev-server restart was required again to validate the new page route.

### Follow-ups / Known Gaps
- The `เชิญสมาชิก` button on the new team page is present as a UI stub only; invite/edit membership flows are not implemented yet.

## 2026-03-16 07:58:17 +07

### Goal
- Turn the project team page into a real management surface and enforce the demo rule that users with no remaining project duties cannot log in.

### What Changed
- `src/app/api/auth/login/route.ts`
  - Added a login guard for non-admin/non-executive users with zero assigned project duties.
  - Login now returns `NO_PROJECT_DUTIES` with a Thai error message instead of silently allowing access.
- `src/lib/auth.ts`
  - Added `requiresProjectDuty(...)` to centralize which roles must still hold a project duty to log in.
- `src/lib/api-client.ts`
  - Improved API error propagation so UI code can show the real backend error message.
  - Added `apiDelete(...)` for team-member removal.
- `src/lib/project-membership-store.ts`
  - Added membership mutation helpers: `hasProjectMembership`, `addProjectMembership`, and `removeProjectMembership`.
- `src/app/api/team/[projectId]/route.ts`
  - Added `POST` to invite/add a team member.
  - Added `DELETE` to remove a team member.
  - Restricted team management to `System Admin` and `Project Manager`.
  - Protected against removing the primary project manager.
  - Normalized returned `projectCount` values to derived counts.
- `src/hooks/useProjectTeam.ts`
  - Added `useAddProjectTeamMember(...)` and `useRemoveProjectTeamMember(...)`.
- `src/app/(dashboard)/projects/[id]/team/page.tsx`
  - Added real invite modal and remove-member actions.
  - Added a demo warning banner when a member only has one remaining project duty.
  - Added confirmation text that explicitly warns when removing a user's last project duty will prevent future login.
- `src/components/auth/LoginScreen.tsx`
  - Now shows backend login errors directly, including the new no-duties message.

### TDD Evidence
- RED
  - No automated RED test was added because the repo still has no dedicated test harness around auth/session and project-team mutations. Validation used build/typecheck plus reversible runtime checks instead.
- GREEN
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - Runtime verification:
    - Removed `user-008` from `proj-004` through `DELETE /api/team/proj-004`
    - Verified login then failed with `NO_PROJECT_DUTIES`
    - Re-added `user-008` with `POST /api/team/proj-004`
    - Verified login then succeeded again

### Tests Run
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project pages
- `npm run build` -> pass
- `npm run typecheck` -> pass
- Runtime demo checks:
  - `curl -s -c /tmp/vipa-manage.cookies -H 'Content-Type: application/json' -d '{"userId":"user-002"}' http://localhost:3002/api/auth/login >/dev/null; curl -s -X DELETE -b /tmp/vipa-manage.cookies -H 'Content-Type: application/json' -d '{"userId":"user-008"}' http://localhost:3002/api/team/proj-004`
  - `curl -s -H 'Content-Type: application/json' -d '{"userId":"user-008"}' http://localhost:3002/api/auth/login`
  - `curl -s -X POST -b /tmp/vipa-manage.cookies -H 'Content-Type: application/json' -d '{"userId":"user-008"}' http://localhost:3002/api/team/proj-004`
  - `curl -s -H 'Content-Type: application/json' -d '{"userId":"user-008"}' http://localhost:3002/api/auth/login`

### Wiring Verification Evidence
- Team management page
  - `src/app/(dashboard)/projects/[id]/team/page.tsx` -> `useAddProjectTeamMember` / `useRemoveProjectTeamMember`
- Team API
  - `src/app/api/team/[projectId]/route.ts` handles `GET`, `POST`, and `DELETE`
- Login enforcement
  - `src/app/api/auth/login/route.ts` now checks derived project duties before issuing session cookies

### Behavior Changes / Risk Notes
- Users in project-operational roles now require at least one project duty to log in.
- Removing a user's last project assignment immediately prevents future login until a project duty is added back.
- The reversible demo was run using `user-008`, and the final state was restored.

### Follow-ups / Known Gaps
- There is still no audit/history trail for team membership changes.
- Invite/remove actions are implemented, but there is not yet a richer member-role editing flow beyond add/remove.

## 2026-03-16 08:47:06 +07

### Goal
- Verify whether saving a new project really lets the user continue through the left-hand project menus, then add honest E2E coverage for the implemented flow.

### What Changed
- `src/components/auth/AuthBootstrap.tsx`
  - Refetched session on pathname changes so a stale `/login` session response no longer wipes the logged-in user after navigation.
- `src/app/api/wbs/[projectId]/route.ts`
  - Added `POST` support for creating WBS nodes, including PM/admin-only authorization, parent validation, and in-memory persistence.
- `src/hooks/useWBS.ts`
  - Added `useCreateWBSNode()` mutation and shared create payload type.
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - Wired the existing `เพิ่ม WBS Node` button to a real modal form and mutation flow.
  - Fixed selection behavior so newly created WBS nodes become visible and selected instead of leaking unrelated BOQ data.
- `playwright.config.ts`
  - Moved Playwright onto an isolated dev server at `127.0.0.1:3101` with `reuseExistingServer: false` so tests no longer depend on the stale interactive `:3002` server.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Hardened login selection to the real PM radio value.
  - Added an end-to-end flow that creates a project, lands on the new project detail route, opens Team, adds a WBS node, and verifies project-scoped LHS navigation preserves the same project ID.

### TDD Evidence
- RED
  - `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`
  - Key failing reasons observed before the fixes:
    - login page never hydrated on the stale `:3002` server because `_next` assets were 404ing
    - the initial auth bootstrap could overwrite the logged-in PM with a stale anonymous session
    - WBS had no create path even though the UI exposed `เพิ่ม WBS Node`
- GREEN
  - `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts` -> pass
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project pages
- `npm run build` -> pass
- `npm run typecheck` -> pass after `build` regenerated `.next/types`

### Wiring Verification Evidence
- Create-project flow
  - `src/app/(dashboard)/projects/new/page.tsx` calls `createProject.mutateAsync(payload)`, then `setCurrentProject(createdProject.id)`, then routes to `/projects/${createdProject.id}`
- Project shell continuity
  - `src/app/(dashboard)/projects/[id]/layout.tsx` writes the route param back into app state via `setCurrentProject(projectId ?? null)`
  - `src/components/layout/Sidebar.tsx` builds all project-scoped LHS links from the active project ID
- WBS creation
  - `src/app/(dashboard)/projects/[id]/wbs/page.tsx` -> `useCreateWBSNode(projectId)`
  - `src/hooks/useWBS.ts` -> `apiPost('/wbs/${projectId}', payload)`
  - `src/app/api/wbs/[projectId]/route.ts` persists the new node and returns it

### Behavior Changes / Risk Notes
- It is now true that, after saving a project, the user can continue into the project-scoped LHS modules under that new project context.
- The implemented E2E path now proves:
  - PM login
  - project creation
  - redirect into the new project route
  - team page access for that new project
  - WBS node creation for that new project
  - project ID continuity across Gantt, Daily Report, EVM, Quality, Risk, Issues, and Documents routes
- Important limitation:
  - several lower modules are still demo or read-only for newly created projects, so “meaningful data” currently means correct project scoping and page wiring, not full CRUD depth in every module yet.
- Auggie/codebase retrieval was skipped because it is known to hang in this repo; this work was verified via direct file inspection plus runtime/E2E checks.

### Follow-ups / Known Gaps
- Newly created projects still do not get seeded Gantt/EVM/document datasets automatically; those pages route correctly but may be empty or demo-light.
- WBS now supports node creation, but BOQ item creation is still only a UI stub.
- The repo still has a build-order quirk where `npm run typecheck` fails before `npm run build` regenerates `.next/types`.

## 2026-03-16 09:16:48 +07

### Goal
- Make more of the project-scoped LHS modules writable for newly created projects, specifically BOQ, Daily Report, Risk, and Issues, and prove the flow with Playwright.

### What Changed
- `src/lib/wbs-store.ts`
  - Added a shared global in-memory WBS store so new WBS nodes can be reused across API routes.
- `src/lib/boq-store.ts`
  - Added a shared global BOQ store.
- `src/lib/daily-report-store.ts`
  - Added a shared global Daily Report store so list and detail endpoints read the same data.
- `src/lib/risk-store.ts`
  - Added a shared global Risk store.
- `src/lib/issue-store.ts`
  - Added a shared global Issue store.
- `src/app/api/boq/[wbsId]/route.ts`
  - Switched to the shared WBS/BOQ stores.
  - Added `POST` so BOQ items can be created for the selected WBS node.
- `src/app/api/daily-reports/route.ts`
  - Switched to the shared Daily Report store so created reports persist within the running server.
- `src/app/api/daily-reports/[id]/route.ts`
  - Switched to the same shared Daily Report store used by the collection route.
- `src/app/api/risks/[projectId]/route.ts`
  - Added `POST` and derived `score` / `level` on create.
- `src/app/api/issues/[projectId]/route.ts`
  - Added `POST` for creating new issue records.
- `src/hooks/useBOQ.ts`
  - Added `useCreateBOQItem()`.
- `src/hooks/useRisks.ts`
  - Added `useCreateRisk()`.
- `src/hooks/useIssues.ts`
  - Added `useCreateIssue()`.
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - Wired the existing `+ เพิ่มรายการ BOQ` button to a real modal and mutation.
- `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
  - Wired `สร้างรายงานใหม่` to a real modal form and create mutation.
- `src/app/(dashboard)/projects/[id]/risk/page.tsx`
  - Wired `บันทึกความเสี่ยงใหม่` to a real modal form and create mutation.
- `src/app/(dashboard)/projects/[id]/issues/page.tsx`
  - Wired `เปิดเคสใหม่` to a real modal form and create mutation.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Expanded the passing flow so it now:
    - creates a project
    - creates a WBS node
    - creates a BOQ item under that WBS
    - creates a Daily Report
    - creates a Risk
    - creates an Issue
    - verifies project ID continuity across the remaining LHS routes

### TDD Evidence
- RED
  - `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`
  - Key failing reasons before the fixes:
    - BOQ had no create path
    - Daily Report / Risk / Issue had UI buttons but no end-to-end create flow for a new project
    - newly created WBS nodes were not visible to the BOQ API because WBS state was not shared
    - the Playwright spec exposed selector and routing issues while these flows were being wired
- GREEN
  - `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts`
  - Result: `1 passed`

### Tests Run
- `npm run e2e -- tests/e2e/project-create-and-shell.spec.ts` -> pass
- `npm run build` -> pass
- `npm run typecheck` -> pass
- `npm run lint` -> pass with the same pre-existing hook warnings in unrelated pages

### Wiring Verification Evidence
- BOQ
  - `src/app/(dashboard)/projects/[id]/wbs/page.tsx` -> `useCreateBOQItem(selectedWbsId)` -> `POST /api/boq/[wbsId]`
- Daily Report
  - `src/app/(dashboard)/projects/[id]/daily-report/page.tsx` -> `useCreateDailyReport()` -> `POST /api/daily-reports`
- Risk
  - `src/app/(dashboard)/projects/[id]/risk/page.tsx` -> `useCreateRisk(projectId)` -> `POST /api/risks/[projectId]`
- Issue
  - `src/app/(dashboard)/projects/[id]/issues/page.tsx` -> `useCreateIssue(projectId)` -> `POST /api/issues/[projectId]`
- Shared stores
  - WBS / BOQ / Daily Report / Risk / Issue routes now resolve through their respective `src/lib/*-store.ts` modules so created records remain visible during the dev session

### Behavior Changes / Risk Notes
- Newly created projects can now accumulate meaningful records in:
  - `WBS/BOQ`
  - `รายงานประจำวัน`
  - `ความเสี่ยง`
  - `ปัญหา`
- The write model is still in-memory prototype state only. Data persists for the lifetime of the running Next.js server and resets on restart.
- Remaining project-scoped routes like Gantt, EVM, and Documents are still mostly demo/read-only for brand-new projects, although project scoping and navigation remain correct.

### Follow-ups / Known Gaps
- BOQ supports item creation, but there is still no edit/delete flow.
- Daily Reports / Risks / Issues now support creation, but not full edit/delete workflows.
- Gantt / EVM / Documents still need similar create or seed-on-project-create behavior if the goal is full project initialization from the left menu.

## 2026-03-16 10:05:40 +07

### Goal
- Make newly created projects start with no fake recent activity.
- Restrict project creation to `Project Manager` only and make the new-project team default to only the creator PM.
- Add a real project-status update path and verify the create-project shell flow with Playwright.

### What Changed
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Replaced the hardcoded recent-activity timeline with activity derived from Daily Reports, Issues, and Risks for the current project.
  - Added the empty-state message `ยังไม่มีกิจกรรมล่าสุดสำหรับโครงการนี้` when a new project has no activity records.
  - Added a PM-only status selector in the project header.
  - Switched `openIssues` and `highRisks` cards to derive from project data instead of static fallback content where available.
- `src/app/api/projects/[id]/route.ts`
  - Added `PATCH` support for updating persisted project status.
  - Enforced PM-only status changes and validated allowed status values.
- `src/hooks/useProjects.ts`
  - Added `useUpdateProject(id)` mutation for the new status selector.
- `src/app/api/projects/route.ts`
  - Tightened `POST /api/projects` so only `Project Manager` users can create projects.
  - Kept creator auto-assignment as the initial project membership.
- `src/app/(dashboard)/dashboard/page.tsx`
  - Restricted the floating `สร้างโครงการใหม่` button to `Project Manager` only.
- `src/app/(dashboard)/projects/new/page.tsx`
  - Redirects non-PM users away from `/projects/new`.
  - Blocks submit for non-PM users even if they reach the form.
  - Changed the default project team preview so it contains only the current PM creator.
  - Updated the invite hint to make clear that additional members are added later on the Team page.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Added assertions that a new project shows no recent activity.
  - Added coverage for PM-only project creation visibility.
  - Added assertions that only the creator appears in the initial team list.
  - Added project-status selection in the created-project flow.
  - Fixed the Ant Design select interaction by clicking the visible select wrapper instead of the hidden combobox input.

### TDD Evidence
- RED
  - `npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - Key failure reason:
    - the new status-step test initially failed because Playwright clicked the hidden combobox input for the Ant Design select, and the visible selection item intercepted pointer events
- GREEN
  - `npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - Result: `2 passed`
- Why there was no separate RED for the activity/team/create restrictions:
  - those behaviors were implemented and then verified in the same end-to-end flow rather than through isolated unit tests

### Tests Run
- `npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line` -> pass (`2 passed`)
- `npm run lint` -> pass with the same pre-existing React hook dependency warnings in unrelated pages
- `npm run build` -> pass
- `npm run typecheck` -> pass after `npm run build` regenerated `.next/types`

### Wiring Verification Evidence
- New project activity
  - `src/app/(dashboard)/projects/[id]/page.tsx` -> `useDailyReports(projectId)` / `useIssues(projectId)` / `useRisks(projectId)` -> project-scoped APIs -> dynamic timeline / empty state
- Manual project status
  - `src/app/(dashboard)/projects/[id]/page.tsx` -> `useUpdateProject(projectId)` -> `PATCH /api/projects/[id]`
- PM-only project creation
  - dashboard FAB visibility in `src/app/(dashboard)/dashboard/page.tsx`
  - route-level guard in `src/app/(dashboard)/projects/new/page.tsx`
  - server enforcement in `src/app/api/projects/route.ts`
- Initial team membership
  - `POST /api/projects` auto-adds only the current creator membership
  - Team page data comes from `GET /api/team/[projectId]`, so newly created projects show only that creator until members are added

### Behavior Changes / Risk Notes
- A newly created project no longer shows fake legacy activity in `Recent Activity`.
- Persisted project statuses are now manually updated by a PM from the project overview header.
- Dashboard-only labels such as `ตามแผน (On Schedule)` and `ล่าช้า (Delayed)` remain derived display states, not persisted project statuses.
- Project creation is now fail-closed for non-PM roles at both the UI and API layers.

### Follow-ups / Known Gaps
- The status selector currently allows any visible PM to update the status of a project they can access; there is no finer-grained “only the assigned PM” distinction yet.
- The overview page still uses fallback KPI defaults for some fields when project data is incomplete; recent activity is now correctly project-specific, but some non-activity tiles are still prototype-biased.

## 2026-03-16 10:14:00 +07

### Goal
- Let `System Admin` users who also act as project owners, especially `นายสมชาย กิตติพงษ์`, create projects just like a PM.
- Make the create-project capability consistent across dashboard button visibility, `/projects/new`, API create, and project status management.

### What Changed
- `src/lib/auth.ts`
  - Added `canCreateProject(role)` as the shared permission rule for project creation/management entry points.
  - The rule now allows both `System Admin` and `Project Manager`.
- `src/app/(dashboard)/dashboard/page.tsx`
  - Switched the `สร้างโครงการใหม่` button visibility to the shared `canCreateProject()` capability instead of hardcoding `Project Manager`.
- `src/app/(dashboard)/projects/new/page.tsx`
  - Switched route guard and submit guard to the shared `canCreateProject()` capability.
  - Updated the warning/error text so it no longer incorrectly says PM-only.
- `src/app/api/projects/route.ts`
  - Switched `POST /api/projects` authorization to the shared `canCreateProject()` capability.
  - Updated the API error message to reflect admin-or-PM behavior.
- `src/app/api/projects/[id]/route.ts`
  - Switched project status updates to the same shared capability so admin users who can create/manage projects can also update status.
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Switched project status selector visibility to the same shared capability.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Added a new browser test proving `user-001` (`System Admin`) can see the create button and access `/projects/new`.

### TDD Evidence
- RED
  - There was no separate failing test run captured before the permission helper refactor.
  - The gap was established by direct file inspection:
    - dashboard button used `currentUser?.role === 'Project Manager'`
    - `/projects/new` redirect and submit guard were PM-only
    - `POST /api/projects` was PM-only
- GREEN
  - `npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - Result: `3 passed`

### Tests Run
- `npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line` -> pass (`3 passed`)
- `npm run lint` -> pass with the same pre-existing React hook dependency warnings in unrelated pages
- `npm run build` -> pass
- `npm run typecheck` -> pass after build regenerated `.next/types`

### Wiring Verification Evidence
- Dashboard create button
  - `src/app/(dashboard)/dashboard/page.tsx` -> `canCreateProject(currentUser?.role)`
- New project page
  - `src/app/(dashboard)/projects/new/page.tsx` -> route guard + submit guard both use the same helper
- Server create path
  - `src/app/api/projects/route.ts` -> `POST` uses the same helper
- Project status management
  - `src/app/(dashboard)/projects/[id]/page.tsx` shows the selector from the same helper
  - `src/app/api/projects/[id]/route.ts` enforces the same helper on `PATCH`

### Behavior Changes / Risk Notes
- `System Admin` users now have the same project-creation entry point as PM users.
- This matches the seeded identity of `นายสมชาย กิตติพงษ์`, who is modeled as `System Admin` but also acts as a project owner in seeded projects.
- The capability is now fail-closed by a shared helper instead of scattered role string checks.

### Follow-ups / Known Gaps
- The role model is still single-valued in `users.json`; this change treats project creation as a capability, not a true multi-role user model.
- If you later want explicit dual-role UI semantics, the seed/user schema should evolve from a single `role` to role sets or capability flags.

## 2026-03-16 11:11:18 +07

### Goal
- Add meaningful write flows for the previously read-only `EVM` and `Quality` modules.
- Keep the implementation aligned with the current prototype data model instead of inventing a larger subsystem.

### What Changed
- `src/types/evm.ts`
  - Extended EVM snapshots with `id` and `projectId` so snapshots can be created and deleted per project.
- `src/lib/evm-store.ts`
  - Added a shared in-memory EVM snapshot store seeded from the existing EVM fixture data.
- `src/hooks/useEVM.ts`
  - Added `useCreateEVMPoint()` and `useDeleteEVMPoint()`.
- `src/app/api/evm/[projectId]/route.ts`
  - Replaced the old read-only/special-case route with a project-scoped store-backed route.
  - Added `POST` for new monthly EVM snapshots.
  - Added `DELETE` for snapshot removal.
  - Restricted write actions to `System Admin` and `Project Manager`.
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
  - Added an `EVM Snapshots` table.
  - Added a `บันทึกงวด EVM ใหม่` modal form.
  - Added delete actions for snapshots.
  - Kept charts/KPIs driven by the same live EVM dataset so add/delete changes are immediately reflected.
- `src/lib/quality-store.ts`
  - Added a shared in-memory store for `itpItems` and `inspectionRecords`.
- `src/hooks/useQuality.ts`
  - Added `useCreateInspection()` and `useDeleteInspection()`.
- `src/app/api/quality/inspections/route.ts`
  - Replaced the read-only inspection collection with a store-backed route.
  - Added `POST` to create inspection records tied to an ITP item.
  - Added `DELETE` to remove inspection records.
  - Added quality-management write permissions for `System Admin`, `Project Manager`, and `Engineer`.
  - Synced linked `ITP` status after create/delete.
- `src/app/(dashboard)/projects/[id]/quality/page.tsx`
  - Added an `Inspection Records` table.
  - Added a `บันทึกผลตรวจใหม่` modal form.
  - Added delete actions for inspection records.
- `src/app/(dashboard)/projects/[id]/quality/inspection/[inspectionId]/page.tsx`
  - Stopped hardcoding `insp-001`; the detail page now reads the actual route param.
- `tests/e2e/project-evm-quality-crud.spec.ts`
  - Added an end-to-end spec that proves:
    - a PM can add and delete an EVM snapshot
    - a PM can add and delete a Quality inspection record

### TDD Evidence
- RED
  - `npx playwright test tests/e2e/project-evm-quality-crud.spec.ts --reporter=line`
  - Key failing reason before implementation:
    - the test could not find `บันทึกงวด EVM ใหม่` because the `EVM` page had no add flow at all
- GREEN
  - `npx playwright test tests/e2e/project-evm-quality-crud.spec.ts --reporter=line`
  - Result: `1 passed`
- Additional note
  - There were two intermediate selector-only failures in the new spec while wiring Ant Design selects; those were test issues, not product regressions.

### Tests Run
- `npx playwright test tests/e2e/project-evm-quality-crud.spec.ts --reporter=line` -> pass
- `npm run lint` -> pass with the same pre-existing React hook dependency warnings in unrelated pages
- `npm run build` -> pass
- `npm run typecheck` -> pass after build regenerated `.next/types`

### Wiring Verification Evidence
- EVM
  - `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` -> `useCreateEVMPoint(projectId)` / `useDeleteEVMPoint(projectId)` -> `POST` / `DELETE /api/evm/[projectId]`
  - `useEVM(projectId)` still feeds the same charts and KPI calculations, so writes immediately affect the displayed EVM metrics
- Quality
  - `src/app/(dashboard)/projects/[id]/quality/page.tsx` -> `useCreateInspection(projectId)` / `useDeleteInspection(projectId)` -> `POST` / `DELETE /api/quality/inspections`
  - `src/app/(dashboard)/projects/[id]/quality/inspection/[inspectionId]/page.tsx` now opens the actual created inspection route
  - `ITP` rows and inspection records both read from the same shared quality store, so writes stay consistent during the session

### Behavior Changes / Risk Notes
- `EVM` now has meaningful add/delete operations as monthly snapshot management.
- `Quality` now has meaningful add/delete operations as inspection-record management tied to existing ITP items.
- `Quality Gate` stages remain fixed lifecycle milestones; I did not add arbitrary gate creation/deletion because that would weaken the gate pipeline model instead of fitting it.
- `Documents`, `Gantt`, and other modules are unchanged by this work.

### Follow-ups / Known Gaps
- `EVM` snapshots are still prototype-level monthly snapshots only; there is no edit flow yet.
- `Quality` inspection records are created from a simplified checklist template; there is no checklist editor yet.
- `Quality` writes are intentionally broader than `EVM`: `Engineer` can manage inspection records, but cannot manage EVM snapshots.


## Review (2026-03-16 10:49:38 +07) - system

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: team-member management access control
- Commands Run: inspected role/menu/auth files; checked team page UI guard; checked team API guard; executed live login + GET/POST/DELETE API probes against `http://127.0.0.1:3002`
- Sources: `src/app/(dashboard)/projects/[id]/team/page.tsx`, `src/app/api/team/[projectId]/route.ts`, `src/lib/project-api-access.ts`, `src/lib/project-access.ts`, `src/lib/auth.ts`, `src/data/project-memberships.json`

### High-Level Assessment
- Team membership is readable by any user who can access the project.
- Team membership management is restricted in both the UI and the API.
- The effective manage-team privilege is: `System Admin` or `Project Manager`, plus project access.
- Non-privileged roles such as `Consultant` can open the Team page for projects they belong to, but cannot add or remove members.
- Live API checks confirmed that both Admin and PM can add/remove members for `proj-001`, while Consultant receives `403`.

### Strengths
- UI and API enforcement match for team management.
- `requireProjectAccess(projectId)` prevents cross-project management attempts before role checks run.
- Add/remove behavior is reversible and returns meaningful payloads, including remaining assigned-project count on removal.

### Key Risks / Gaps (severity ordered)
LOW
- Project team management is capability-based, not ownership-based: any `Project Manager` with access to a project can manage its team, not only the assigned primary PM.

### Open Questions / Assumptions
- Assumes the intended rule is “Admin or PM with project access can manage team.” If the intended rule is “only the assigned PM for that project,” the current implementation is broader than that.


## Review (2026-03-16 10:56:00 +07) - system

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: module-by-module add/delete permissions across project-scoped menus
- Commands Run: inspected sidebar/menu role map; inspected project/team/WBS/BOQ/daily-report/risk/issues/document/gantt/evm/quality APIs and page actions
- Sources: `src/lib/project-access.ts`, `src/lib/auth.ts`, `src/app/api/projects/route.ts`, `src/app/api/team/[projectId]/route.ts`, `src/app/api/wbs/[projectId]/route.ts`, `src/app/api/boq/[wbsId]/route.ts`, `src/app/api/daily-reports/route.ts`, `src/app/api/risks/[projectId]/route.ts`, `src/app/api/issues/[projectId]/route.ts`, `src/app/api/gantt/[projectId]/route.ts`, `src/app/api/evm/[projectId]/route.ts`, `src/app/api/documents/[projectId]/route.ts`, `src/app/api/quality/gates/[projectId]/route.ts`, `src/app/api/quality/inspections/route.ts`

### High-Level Assessment
- Project creation and team/WBS/BOQ writes are explicitly restricted to admin-or-PM.
- Several other project modules (`Daily Report`, `Risk`, `Issues`) allow writes for any authenticated user with project access; they are not role-restricted server-side.
- `Gantt`, `EVM`, `Quality`, and `Documents` are effectively read-only today despite some UI affordances.
- Documents has visible upload/create-folder buttons, but no write API behind them yet.

### Key Risks / Gaps (severity ordered)
MEDIUM
- Write permissions are inconsistent across modules: some use role-based checks (`Projects`, `Team`, `WBS/BOQ`), while others use project-access-only checks (`Daily Report`, `Risk`, `Issues`).
LOW
- The `Documents` UI implies add actions, but the API is read-only.

### Open Questions / Assumptions
- Assumes the desired policy is a simple role summary by implemented behavior, not an idealized future-state permissions matrix.


## Review (2026-03-16 11:18:00 +07) - system

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: WBS/BOQ vs Gantt ownership and edit-surface design
- Commands Run: inspected Gantt page, WBS hook, Gantt seed data, WBS seed data
- Sources: `src/app/(dashboard)/projects/[id]/gantt/page.tsx`, `src/hooks/useWBS.ts`, `src/data/gantt-tasks.json`, `src/data/wbs.json`

### High-Level Assessment
- The current prototype keeps `WBS` and `Gantt` as separate stores.
- They overlap heavily in task names, but they are not the same object model.
- `WBS` describes scope/work-package hierarchy and BOQ linkage.
- `Gantt` describes schedule semantics: dates, duration, dependencies, milestones, and owners.
- Because of that, making WBS the only edit surface for Gantt would be too lossy.

### Key Risks / Gaps (severity ordered)
MEDIUM
- If Gantt is edited only through WBS/BOQ, the system has no proper place to manage schedule-only fields like dependencies, milestone dates, and owner sequencing.
LOW
- If WBS and Gantt stay fully separate forever, task-name drift between scope and schedule will grow.

### Tactical Improvements (1–3 days)
1. Let `Project Manager` and `Coordinator` add/edit/delete Gantt tasks directly.
2. Keep WBS as the source for work-package hierarchy and BOQ structure.
3. When creating a Gantt task, optionally link it to a WBS node instead of forcing a strict 1:1 sync.

### Strategic Improvements (1–6 weeks)
1. Introduce a shared `work package` identity so a Gantt task can reference a WBS node cleanly.
2. Separate ownership by concern:
   - WBS: scope, decomposition, weights, BOQ linkage
   - Gantt: dates, dependencies, milestones, assignees, schedule progress

### Open Questions / Assumptions
- Assumes the desired UX is practical project control, not rigid ERP-style master-data normalization.
