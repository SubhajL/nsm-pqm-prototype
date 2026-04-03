# 2026-03-15 23:19:31 +0700

## Plan Draft A

### Overview
Fix the project shell so it follows the actual route project ID instead of the baked-in demo project. This includes making project creation call the API and redirect to the created project, syncing the active project ID into shared UI state, and updating project-scoped pages/sidebar links to use that dynamic ID.

### Files to Change
- `src/stores/useAppStore.ts` — active project state defaults/behavior
- `src/components/layout/Sidebar.tsx` — use active project ID for project menu links
- `src/app/(dashboard)/projects/[id]/layout.tsx` — new sync layer from route param to app store
- `src/app/(dashboard)/projects/new/page.tsx` — create project via API and redirect to returned ID
- `src/app/(dashboard)/projects/[id]/page.tsx` — use dynamic route project ID
- `src/app/(dashboard)/projects/[id]/*/page.tsx` — replace hardcoded `proj-001`
- `src/components/layout/Header.tsx` — optional breadcrumb cleanup if needed

### Implementation Steps
1. TDD sequence:
   1) identify hardcoded `proj-001` call sites
   2) run a failing build/typecheck if wiring breaks during extraction
   3) add a route-to-store sync layer
   4) patch sidebar and create flow
   5) patch project-scoped pages to read the route/store ID
   6) run lint/build/typecheck
2. `projects/[id]/layout.tsx`
   - Mount a small client sync component that writes the current `[id]` into `useAppStore`.
3. `Sidebar.tsx`
   - Build project menu links from the current active project ID instead of a constant.
4. `projects/new/page.tsx`
   - Use `useCreateProject()` to POST a real project payload.
   - Redirect to `/projects/<new-id>` from the returned project object.
5. Project-scoped pages
   - Replace hardcoded `PROJECT_ID = 'proj-001'` usages with the actual route ID for data hooks and links.

### Test Coverage
- `create project redirect`
  - redirects to created project ID
- `sidebar active project links`
  - project menu uses current route project ID
- `project subpage data routing`
  - hooks read the route param, not demo constant

### Decision Completeness
- Goal:
  - Keep the current project context consistent across create flow, overview page, and sidebar menu navigation.
- Non-goals:
  - Full dynamic data population for every project-specific mock dataset.
- Success criteria:
  - creating a project lands on `/projects/<new-id>`
  - sidebar project menu points to the active project route
  - clicking WBS/Gantt/etc from a non-`proj-001` project stays under that project ID
- Public interfaces:
  - no new external APIs beyond existing create-project flow
- Edge cases / failure modes:
  - create API fails: stay on form and show error
  - project route missing ID: fail open to store fallback demo project
  - pages with no per-project mock data: still route correctly, may show empty/default content
- Rollout & monitoring:
  - no feature flag; smoke in browser by creating a new project and clicking project menus
- Acceptance checks:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing `useCreateProject()` mutation
- Existing `useAppStore` active-project state

### Validation
- Create a project from `/projects/new`
- Confirm redirect lands on a new project ID
- Click every left-nav project menu item and verify the project ID stays the same

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `projects/[id]/layout.tsx` | project route render | App Router file convention | N/A |
| `Sidebar.tsx` dynamic links | dashboard shell render | mounted in `src/app/(dashboard)/layout.tsx` | current project store |
| `projects/new/page.tsx` create redirect | create form submit | App Router page component | `/api/projects` |
| project subpages dynamic IDs | each project page render | App Router `[id]` pages | route param/store |

## Plan Draft B

### Overview
Skip the store and make every project-scoped component derive its ID directly from `useParams()`. This is simpler locally but duplicates project-ID extraction in many files and leaves the sidebar with its own special-case logic.

### Files to Change
- `src/components/layout/Sidebar.tsx`
- `src/app/(dashboard)/projects/new/page.tsx`
- all project `[id]` pages using hardcoded `proj-001`

### Implementation Steps
1. Replace each constant with `useParams()`.
2. Build sidebar links from `pathname` parsing.
3. Wire create-project redirect to returned ID.

### Test Coverage
- `useParams project routing`
  - route param drives hook requests
- `sidebar route parsing`
  - project links follow current pathname

### Decision Completeness
- Goal:
  - Remove hardcoded demo project references
- Non-goals:
  - shared active project state for other UI consumers
- Success criteria:
  - no `proj-001` in project-scoped navigation flow
- Edge cases / failure modes:
  - non-project pages need custom fallback handling
- Rollout & monitoring:
  - simplest patch, more repeated logic

### Dependencies
- `useParams` in client pages/components

### Validation
- Manual route click-through on project pages

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| individual project pages | page render | App Router `[id]` pages | route param |
| sidebar path parser | shell render | `Sidebar.tsx` | pathname |

## Comparative Analysis & Synthesis

### Draft A strengths
- Central active-project state
- Cleaner shell behavior and easier future reuse
- Fewer ad hoc pathname parsers

### Draft A gaps
- One extra layout file and store sync step

### Draft B strengths
- Fewer concepts
- Direct and local to each page

### Draft B gaps
- More duplication
- Sidebar still needs custom parsing logic
- Harder to keep consistent across shell and page actions

### Choice
Use Draft A. The project shell already has `currentProjectId` state, so the cleanest fix is to actually use it and sync it from `[id]`.

## Unified Execution Plan

### Overview
Implement dynamic project routing by syncing the route `[id]` into the app store, using that active project ID in the sidebar, and replacing all remaining hardcoded `proj-001` references in project pages. Also make the create-project form call the existing create mutation and redirect to the created project ID instead of the demo project.

### Files to Change
- `src/stores/useAppStore.ts`
- `src/components/layout/Sidebar.tsx`
- `src/app/(dashboard)/projects/[id]/layout.tsx`
- `src/app/(dashboard)/projects/new/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/[id]/change-request/page.tsx`
- `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
- `src/app/(dashboard)/projects/[id]/documents/page.tsx`
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
- `src/app/(dashboard)/projects/[id]/issues/page.tsx`
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
- `src/app/(dashboard)/projects/[id]/quality/page.tsx`
- `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`

### Implementation Steps
1. TDD sequence:
   1) patch route-sync/store primitives
   2) run build/typecheck to catch missing imports or param usage
   3) patch sidebar and create flow
   4) patch project-scoped pages and links
   5) run full gates
2. Add `projects/[id]/layout.tsx`
   - Sync route `id` into `useAppStore.setCurrentProject()`.
3. Update `Sidebar.tsx`
   - Replace the constant demo project ID with `currentProjectId ?? 'proj-001'`.
4. Update `projects/new/page.tsx`
   - Submit through `useCreateProject()`.
   - Build a minimal but valid `Project` payload from the form and current user.
   - Set the active project in store and redirect to the returned ID.
5. Update project `[id]` pages
   - Use `useParams()` or store-backed active project ID for all hooks and links.
   - Replace hardcoded `proj-001` deep links with the current route ID.

### Test Coverage
- `create project uses API result`
  - redirect uses created project ID
- `sidebar menu keeps current project`
  - links are rooted at active project ID
- `project subpages follow route param`
  - hook fetches and CTA links use current project ID

### Decision Completeness
- Goal:
  - Ensure the active project route drives navigation and data lookups across the project shell.
- Non-goals:
  - generating full per-project mock datasets for every module
- Success criteria:
  - new project creation no longer redirects to `proj-001`
  - clicking project-side menu items from any project stays under the same `[id]`
  - remaining hardcoded `proj-001` references in project pages are removed or intentionally left only for static demo copy
- Public interfaces:
  - unchanged API surface; existing `/api/projects` create endpoint is now actually used
- Edge cases / failure modes:
  - create mutation fails: form remains, error message shown, no redirect
  - project pages with no data for new project: route still works and components should degrade safely
  - active project state missing on non-project pages: sidebar falls back to demo project
- Rollout & monitoring:
  - smoke in browser with one newly created project and one existing project
- Acceptance checks:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- `useCreateProject`
- `useAppStore`
- App Router `[id]` params

### Validation
- Create a project and confirm the URL and page use the new ID
- From that project, click WBS/Gantt/Daily Report/EVM/Quality/Risk/Issues/Documents and verify the URL stays under the same project ID
- Navigate back to the original demo project and confirm both still work

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `projects/[id]/layout.tsx` | `/projects/:id/*` route render | App Router nested layout | current project store |
| `Sidebar.tsx` dynamic project links | dashboard shell render | `src/app/(dashboard)/layout.tsx` | current project store |
| `projects/new/page.tsx` create submit | form button click | App Router page | `/api/projects` |
| project overview/subpages | route render | App Router `[id]` pages | route param |

## 2026-03-15 23:28:48 +07

### Goal
- Fix project creation and project-shell routing so a newly created project stays in its own `[id]` context instead of snapping back to `proj-001`.

### What Changed
- `src/lib/project-store.ts`
  - Added a shared in-memory project store so list, create, and detail routes read/write the same project data.
- `src/app/api/projects/route.ts`
  - Switched GET/POST to the shared store and made server-generated `id`/`code` authoritative.
- `src/app/api/projects/[id]/route.ts`
  - Switched detail lookup to the shared store so newly created projects are fetchable immediately.
- `src/hooks/useRouteProjectId.ts`
  - Added a small route-param helper for project-scoped pages.
- `src/app/(dashboard)/projects/[id]/layout.tsx`
  - Syncs the route `id` into `useAppStore.currentProjectId`.
- `src/stores/useAppStore.ts`
  - Removed the hardcoded default project from state; non-project pages now fall back in the shell instead.
- `src/components/layout/Sidebar.tsx`
  - Project menu links now use the active project ID from store instead of `proj-001`.
- `src/app/(dashboard)/layout.tsx`
  - Route prefetching now follows the active project ID instead of prewarming only `proj-001`.
- `src/components/layout/Header.tsx`
  - Breadcrumbs now resolve the current project name dynamically instead of mapping only `proj-001`.
- `src/app/(dashboard)/projects/new/page.tsx`
  - The create form now calls `useCreateProject()`, builds a valid project payload, clears the user draft on success, sets the active project, and redirects to the returned ID.
  - Removed the misleading fixed project code from initial form values.
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Overview data and internal links now follow the route project ID.
  - Project type badge is driven from real project data.
- `src/app/(dashboard)/projects/[id]/change-request/page.tsx`
- `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
- `src/app/(dashboard)/projects/[id]/documents/page.tsx`
- `src/app/(dashboard)/projects/[id]/quality/page.tsx`
- `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `src/app/(dashboard)/projects/[id]/issues/page.tsx`
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
- `src/app/(dashboard)/projects/[id]/approval/page.tsx`
  - Replaced hardcoded `proj-001` hook calls, links, and project-title text with the active route ID and/or fetched project name.

### TDD Evidence
- No RED unit-test run was possible because this repo currently has no test runner or test files configured (`find src -name '*.test.*' -o -name '*.spec.*'` returned none, and `package.json` has no `test` script).
- Fast failing signal was instead taken from static gates during implementation:
  - `npm run lint`
  - initial failure reason: unused import in `src/app/api/projects/[id]/route.ts`
- GREEN runs:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Tests Run
- `npm run typecheck` -> pass
- `npm run lint` -> pass with pre-existing `react-hooks/exhaustive-deps` warnings in project subpages
- `npm run build` -> pass

### Wiring Verification Evidence
- `src/app/(dashboard)/projects/[id]/layout.tsx`
  - runtime entry: every `/projects/:id/*` render
  - registration: nested App Router layout under `projects/[id]`
  - effect: writes route `id` into `useAppStore.setCurrentProject()`
- `src/components/layout/Sidebar.tsx`
  - runtime entry: dashboard shell render
  - registration: imported by `src/app/(dashboard)/layout.tsx`
  - effect: menu hrefs derive from `currentProjectId ?? 'proj-001'`
- `src/app/(dashboard)/projects/new/page.tsx`
  - runtime entry: create button click
  - registration: App Router page under `/projects/new`
  - effect: calls `useCreateProject().mutateAsync`, then `setCurrentProject(created.id)` and `router.push(...)`
- `src/app/api/projects/route.ts` + `src/app/api/projects/[id]/route.ts`
  - runtime entry: `/api/projects` and `/api/projects/:id`
  - registration: App Router route handlers
  - effect: both share `getProjectStore()` from `src/lib/project-store.ts`

### Behavior Changes / Risk Notes
- New projects now land on their own overview route and keep that ID through the left-side project menu.
- Project subpages with no seeded module data still load, but many lower-level widgets will show empty states because only the core project record is created.
- The shared project store is intentionally in-memory only; data resets on server restart.

### Follow-ups / Known Gaps
- Pre-existing hook dependency warnings remain in several project pages.
- Creating a project does not yet seed WBS, Gantt, milestone, issue, risk, or document records for that new project.
- Some non-project demo datasets and notifications still reference `proj-001` by design.

## 2026-03-16 00:38:51 +07

### Goal
- Move `ออกจากระบบ` out of the top-right header and into the lower-left sidebar area with an icon.

### What Changed
- `src/components/layout/Sidebar.tsx`
  - Added a sidebar footer section with a logout button and `LogoutOutlined` icon.
  - Moved the logout handler here so the action now lives in the left navigation area.
  - Made the sider body flex vertically so the menu stays above and logout stays pinned near the bottom.
- `src/components/layout/Header.tsx`
  - Removed the header logout button and kept only the current-user avatar/name display.

### TDD Evidence
- No RED test run was available because the repo still has no automated test harness or `test` script.
- Static verification used instead:
  - `npm run typecheck`
  - `npm run lint`

### Tests Run
- `npm run typecheck` -> pass
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project subpages

## 2026-03-16 00:43:52 +07

### Goal
- Align the sidebar logout action vertically with the dashboard `สร้างโครงการใหม่` floating button.

### What Changed
- `src/components/layout/Sidebar.tsx`
  - Increased the footer bottom padding from `16px` to `32px` so the logout button sits on the same bottom line as the dashboard CTA.

### Tests Run
- `npm run typecheck` -> pass
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project subpages

### Wiring Verification Evidence
- `src/components/layout/Sidebar.tsx`
  - runtime entry: dashboard shell render
  - registration: imported by `src/app/(dashboard)/layout.tsx`
  - effect: logout button calls `/api/auth/logout`, clears auth store, and routes to `/login`
- `src/components/layout/Header.tsx`
  - runtime entry: dashboard shell render
  - registration: imported by `src/app/(dashboard)/layout.tsx`
  - effect: no longer owns logout behavior

### Behavior Changes / Risk Notes
- Logout is now discoverable in the left sidebar footer instead of the header.
- In collapsed sidebar mode, only the logout icon is shown.

## 2026-03-16 00:41:14 +07

### Goal
- Push the sidebar logout action harder to the bottom and make its label more prominent.

### What Changed
- `src/components/layout/Sidebar.tsx`
  - Added `marginTop: 'auto'` to the logout footer container so it stays visually anchored at the bottom.
  - Increased the logout button height, icon size, font size, and font weight.

### Tests Run
- `npm run typecheck` -> pass
- `npm run lint` -> pass with the same pre-existing `react-hooks/exhaustive-deps` warnings in project subpages
