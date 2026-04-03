# Coding Log: schedule-health-watch-forecast

## Plan Draft A

### Overview
- Replace the current fake future reporting-date rule with a schedule-health model that evaluates tasks as of March 17, 2026 and introduces a `watch` state between `on_schedule` and `delayed`.
- Keep project business status derivation intact, but improve project `scheduleHealth` so incomplete future tasks are no longer mislabeled delayed.

### Files to Change
- `src/lib/project-progress-derivations.ts`
  - Replace the fixed future-date logic with task-level `on_schedule` / `watch` / `delayed` derivation using current demo date and forecast.
- `src/types/project.ts`
  - Extend `ProjectScheduleHealth` to include `watch`.
- `src/components/common/StatusBadge.tsx`
  - Add a project badge for `watch`.
- `src/app/(dashboard)/dashboard/page.tsx`
  - Surface `watch` in project display status, table filter, and department chart aggregation.
- `src/components/charts/PortfolioBarChart.tsx`
  - Add a `watch` series.
- `src/app/(dashboard)/executive/page.tsx`
  - Respect the new `watch` project state in executive surfaces.
- `src/data/gantt-tasks.json`
  - Re-seed `proj-001` dates so delayed tasks are actually overdue on March 17, 2026.
- `src/data/projects.json`
  - Align seeded project date ranges for `proj-001` if required.
- `src/lib/generated-project-data.ts`
  - Re-seed generated `proj-002` and `proj-003` Gantt timing so one is delayed and one is watch as of March 17, 2026.
- `tests/e2e/project-schedule-health.spec.ts`
  - New focused test for API/dashboard schedule-health results.
- `tests/e2e/project-gantt-propagation.spec.ts`
  - Keep propagation expectations aligned with new schedule-health semantics.

### Implementation Steps
1. Add/stub a focused failing test around project schedule health.
2. Implement task-level health derivation:
   - completed -> on_schedule
   - progress = 0 -> on_schedule unless already past due
   - started + forecast slip 1-3 days -> watch
   - started + forecast slip > 3 days -> delayed
   - due within 7 days + started + incomplete -> watch
3. Roll task health up to project health:
   - delayed if any executable task delayed
   - else watch if any executable task watch
   - else on_schedule
4. Update dashboard/executive/UI status labels and filters.
5. Re-seed Gantt dates so dashboard demo is credible on March 17, 2026.

### Test Coverage
- `project-schedule-health.spec.ts`
  - `dashboard shows delayed/watch/on-schedule based on current demo date`
  - `projects API returns scheduleHealth matching dashboard logic`
- `project-gantt-propagation.spec.ts`
  - `completing overdue seeded tasks clears delayed/watch state`

### Decision Completeness
- Goal:
  - Make schedule health logically consistent for March 17, 2026 demo usage.
- Non-goals:
  - Full critical-path analysis
  - Real forecast engine with actual completion dates stored in DB
- Success criteria:
  - Future tasks are not marked delayed only because they are incomplete
  - At least one seeded project is delayed for a believable overdue reason
  - At least one seeded project is watch for a believable near-risk reason
  - Dashboard and API agree on `scheduleHealth`
- Public interfaces:
  - `Project.scheduleHealth` enum expands to include `watch`
- Edge cases / failure modes:
  - zero-progress future task -> fail open to `on_schedule`
  - zero-progress past-due task -> `delayed`
  - task not yet started -> `on_schedule`
- Rollout & monitoring:
  - no flag; demo-only seed and UI update
  - verify dashboard counts and API output manually
- Acceptance checks:
  - run focused Playwright
  - run lint/build/typecheck

### Dependencies
- Existing Gantt task progress and date fields
- Current demo date assumption anchored to 2026-03-17

### Validation
- Compare `/api/projects` schedule health to dashboard table badges.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `deriveTaskScheduleHealth` helper | `syncProjectExecutionState()` | `src/lib/project-execution-sync.ts` import/call | N/A |
| `watch` project badge | Dashboard/Executive/Project overview render | direct component imports | N/A |
| re-seeded Gantt dates | `getGanttDataForProject()` | `src/lib/gantt-store.ts` seed load | mock JSON / generated scenario |

## Plan Draft B

### Overview
- Keep project schedule health simpler by evaluating only task due dates relative to March 17, 2026 and use `watch` strictly for tasks due within the next 7 days, without forecast math.
- Re-seed dates to make the demo credible and avoid introducing forecast assumptions from sparse mock data.

### Files to Change
- Same UI/type call sites as Draft A
- `src/lib/project-progress-derivations.ts`
  - Implement a date-window-only rule instead of pace-based forecast
- Same seed files and tests as Draft A

### Implementation Steps
1. Add failing dashboard/API test for desired delayed/watch distribution.
2. Implement simple rule:
   - past due + incomplete -> delayed
   - due within 7 days + incomplete + started -> watch
   - else on_schedule
3. Update badges, filters, and chart series.
4. Re-seed Gantt dates to create credible delayed/watch examples.

### Test Coverage
- Same as Draft A, but no direct forecast-specific assertions

### Decision Completeness
- Goal:
  - Eliminate obviously incorrect delayed statuses for future tasks
- Non-goals:
  - Forecasting finish dates from current pace
- Success criteria:
  - no future incomplete task becomes delayed
  - watch appears only for near-due tasks
- Public interfaces:
  - `Project.scheduleHealth` enum expands to include `watch`
- Edge cases / failure modes:
  - zero-progress future task -> on_schedule
  - zero-progress near-due task -> on_schedule per user request
  - started near-due task -> watch
- Rollout & monitoring:
  - same as Draft A

### Dependencies
- Same as Draft A

### Validation
- Same as Draft A

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| date-window schedule health | `syncProjectExecutionState()` | `src/lib/project-execution-sync.ts` import/call | N/A |
| `watch` dashboard state | dashboard/executive render paths | direct imports | N/A |

## Comparative Analysis & Synthesis
- Draft A is more faithful to the user's "actual time to complete" idea because it uses forecast from current pace.
- Draft B is simpler and less assumption-heavy, but it misses the user's explicit request to consider expected time remaining.
- The best plan is a hybrid:
  - use current date as March 17, 2026 demo date
  - use forecast only for tasks that have started (`progress > 0`)
  - keep zero-progress future tasks on_schedule
  - use a near-due watch window for started tasks

## Unified Execution Plan

### Overview
- Implement a hybrid schedule-health model that evaluates tasks as of March 17, 2026, adds a `watch` state, and only uses pace-based forecast for tasks that have actually started.
- Re-seed Gantt schedules so delayed and watch projects are believable on that date, then surface the new state consistently in the dashboard, executive view, and status badges.

### Files to Change
- `src/types/project.ts` - add `watch` to `ProjectScheduleHealth`
- `src/lib/project-progress-derivations.ts` - add task-level health + project rollup + current demo date helper
- `src/lib/project-execution-sync.ts` - continue syncing `scheduleHealth` from live Gantt using the new helper
- `src/components/common/StatusBadge.tsx` - render `watch`
- `src/app/(dashboard)/dashboard/page.tsx` - support `watch` in display status, filters, aggregation
- `src/components/charts/PortfolioBarChart.tsx` - add watch legend/series
- `src/app/(dashboard)/executive/page.tsx` - surface `watch` in executive status views as needed
- `src/data/gantt-tasks.json` - adjust `proj-001` dates
- `src/data/projects.json` - align `proj-001` top-level dates if needed
- `src/lib/generated-project-data.ts` - adjust `proj-002` and `proj-003` phase timing
- `tests/e2e/project-schedule-health.spec.ts` - focused RED/GREEN test
- `tests/e2e/project-gantt-propagation.spec.ts` - ensure completed overdue tasks clear health

### Implementation Steps
- **TDD sequence**
  1. Add a focused Playwright spec that asserts current dashboard/API schedule-health distribution.
  2. Run it and confirm failure because the current code only knows `on_schedule`/`delayed`.
  3. Implement the smallest logic/type/UI changes to pass.
  4. Refactor minimally if needed around helper naming.
  5. Run focused Playwright, then lint/build/typecheck.
- Functions / helpers:
  - `getScheduleEvaluationDate()`
    - Returns the current demo date (`2026-03-17`) so logic is explicit and testable.
  - `deriveTaskScheduleHealth(task, now)`
    - Computes `on_schedule` / `watch` / `delayed` for a single Gantt task.
  - `deriveProjectScheduleHealth(tasks, now)`
    - Rolls task health up to a project-level state.
- Behavior and edge cases:
  - future incomplete tasks are not delayed
  - zero-progress future tasks stay on_schedule
  - started tasks forecast slightly late become watch
  - started tasks forecast materially late or already overdue become delayed

### Test Coverage
- `tests/e2e/project-schedule-health.spec.ts`
  - `dashboard shows proj-001 delayed proj-002 delayed proj-003 watch`
  - `projects api returns watch in scheduleHealth enum`
- `tests/e2e/project-gantt-propagation.spec.ts`
  - `editing delayed seeded tasks to 100 clears schedule health`

### Decision Completeness
- Goal:
  - Make schedule health credible for the March 17, 2026 demo
- Non-goals:
  - true CPM/critical path logic
  - storing actual finish dates in persistence
- Success criteria:
  - `watch` exists and is visible in UI
  - future tasks are not falsely delayed
  - dashboard/API agree on delayed/watch/on-schedule classification
  - seed data produces a believable delayed/watch mix
- Public interfaces:
  - `ProjectScheduleHealth = 'on_schedule' | 'watch' | 'delayed'`
- Edge cases / failure modes:
  - fail open to `on_schedule` when there is not enough evidence of lateness
  - fail closed to `delayed` only for overdue or materially slipping started tasks
- Rollout & monitoring:
  - no migration or flag
  - manually verify dashboard counts and table badges
- Acceptance checks:
  - `npx playwright test tests/e2e/project-schedule-health.spec.ts tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing Gantt task fields: `start_date`, `end_date`, `progress`
- Mock seed control in `gantt-tasks.json` and `generated-project-data.ts`

### Validation
- Dashboard table, status filter, and department chart all show the same delayed/watch story as `/api/projects`.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `deriveTaskScheduleHealth()` | called during project execution sync | `src/lib/project-execution-sync.ts` import + `syncProjectExecutionState()` | N/A |
| `watch` enum on `Project.scheduleHealth` | consumed by dashboard/executive/project views | `src/types/project.ts` shared type import | N/A |
| watch chart series | dashboard department chart render | `src/components/charts/PortfolioBarChart.tsx` direct import in dashboard page | N/A |
| adjusted delayed/watch demo timing | Gantt seed load | `src/data/gantt-tasks.json` and `src/lib/generated-project-data.ts` via gantt stores | mock seed data |

## Implementation Summary - 2026-03-17 11:32:20 +07

### Goal
- Replace the misleading future-report-date schedule rule with a current-date forecast rule.
- Add a real `watch` state between `on_schedule` and `delayed`.
- Keep brand-new / zero-progress tasks on `on_schedule` by default.
- Reseed the in-progress project timelines so the March 17, 2026 demo shows credible delayed/watch examples.

### What Changed
- `src/lib/project-progress-derivations.ts`
  - Replaced the fixed July 15 reporting date with a March 17, 2026 evaluation date for the demo.
  - Added `deriveTaskScheduleHealth()` and forecast-based slip calculation from current pace.
  - Added the explicit `progress <= 0 => on_schedule` rule for new/not-started tasks.
  - Project schedule health is now aggregated as `delayed > watch > on_schedule`.
- `src/types/project.ts`
  - Expanded `ProjectScheduleHealth` to `on_schedule | watch | delayed`.
- `src/components/common/StatusBadge.tsx`
  - Added project badge rendering for `เฝ้าระวัง (Watch)`.
- `src/components/charts/PortfolioBarChart.tsx`
  - Added a separate `watch` series to the department status chart.
- `src/app/(dashboard)/dashboard/page.tsx`
  - Dashboard table/filter/chart now treat `watch` as a first-class display state.
  - In-progress projects now display `scheduleHealth` directly instead of collapsing everything to on-schedule vs delayed.
- `src/app/(dashboard)/executive/page.tsx`
  - Executive status list and delayed KPI now use the same display-status logic for in-progress projects.
- `src/data/projects.json`
  - Moved seeded start dates so the March 17 demo has a credible current timeline.
- `src/data/gantt-tasks.json`
  - Shifted `proj-001` schedule earlier so its incomplete tasks are genuinely overdue on March 17.
- `src/lib/generated-project-data.ts`
  - Moved `proj-003` earlier and reshaped its phases so it lands in a narrow forecast slip (`watch`) rather than an outright delay.
  - `proj-002` now becomes credibly delayed under the March 17 rule because its core implementation task is past its planned end date and unfinished.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Added an assertion that a newly created project starts as `planning` with `scheduleHealth = on_schedule`.

### TDD Evidence
- RED command:
  - `npm run e2e -- tests/e2e/project-schedule-health.spec.ts --reporter=line`
- RED failure:
  - `proj-003` returned `scheduleHealth = "delayed"` instead of `"watch"`.
- GREEN commands:
  - `npm run e2e -- tests/e2e/project-schedule-health.spec.ts tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - `npm run e2e -- tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
- GREEN result:
  - all focused Playwright specs passed after the derivation and seed-date changes.

### Tests Run
- `npm run e2e -- tests/e2e/project-schedule-health.spec.ts --reporter=line`
  - failed as expected before the fix
- `npm run e2e -- tests/e2e/project-schedule-health.spec.ts tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - passed
- `npm run e2e -- tests/e2e/project-gantt-propagation.spec.ts --reporter=line`
  - passed
- `npm run lint`
  - passed with the pre-existing hook dependency warnings in `issues/page.tsx` and `risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - first failed in parallel before `.next/types` existed; passed after `build` regenerated `.next/types`

### Wiring Verification
- Schedule health is recomputed server-side from live Gantt data via `syncProjectExecutionState()` in `src/lib/project-execution-sync.ts`.
- Project list and project detail both pass through that sync path:
  - `src/app/api/projects/route.ts`
  - `src/app/api/projects/[id]/route.ts`
- Dashboard and executive views consume the synced `project.scheduleHealth`:
  - `src/app/(dashboard)/dashboard/page.tsx`
  - `src/app/(dashboard)/executive/page.tsx`

### Behavior Changes / Risk Notes
- `watch` is now a real state in the data model and UI.
- The model is fail-open for brand-new tasks: `progress = 0` stays `on_schedule` until there is stronger evidence.
- The forecast rule is intentionally simple and based on current pace; it does not yet use critical-path analysis or explicit actual-finish dates.
- Demo data is more credible on March 17, 2026 for schedule health, but some non-Gantt module timestamps in generated scenarios still reflect broader demo dates and may be worth normalizing later.

### Follow-ups
- If the team wants more realism, add `actual_start_date` / `actual_end_date` or explicit forecast fields to Gantt tasks instead of inferring pace from progress alone.
- Consider making the executive “Critical Watchlist” cards dynamic from `scheduleHealth` instead of leaving them mostly static.

## Implementation Summary - 2026-03-17 13:35:29 +07

### Goal
- Fix the Gantt-page date/visual mismatch the user saw on `proj-002`.
- Make it explicit on the Gantt page how task progress relates to `on_schedule / watch / delayed`.

### What Changed
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - Removed the hardcoded astronomy-project timeline anchors (`2026-04-01 .. 2026-09-30`) from the chart math.
  - Added a per-project `TimelineConfig` derived from the current project’s actual `startDate` / `endDate` plus current Gantt rows.
  - Timeline header month labels now render dynamically from that project’s range.
  - The red “today” marker now uses the shared schedule-evaluation date from `project-progress-derivations.ts`, not the old hardcoded July 15 marker.
  - The row `สถานะ` column now shows:
    - execution state (`Not Started / In Progress / Complete / Milestone`)
    - schedule state (`ตามแผน / เฝ้าระวัง / ล่าช้า`) for task and phase rows where applicable
- `tests/e2e/project-gantt-crud.spec.ts`
  - Added a regression covering the exact `proj-002` scenario:
    - project-specific month labels
    - edit-dialog dates matching stored task dates
    - delayed task clearing its delayed tag after progress reaches 100%

### TDD Evidence
- RED was reproduced from the user report by direct inspection rather than a prior failing automated spec:
  - `proj-002` Gantt page used hardcoded `PROJECT_START`, `PROJECT_END`, and `TODAY`, so the timeline was being rendered against the wrong project window.
  - The Gantt row `สถานะ` column showed only execution progress tags, not the schedule-health state used elsewhere.
- GREEN command:
  - `npm run e2e -- tests/e2e/project-gantt-crud.spec.ts --reporter=line`

### Tests Run
- `npm run build`
  - passed
- `npm run lint`
  - passed with the same pre-existing hook warnings in `issues/page.tsx` and `risk/page.tsx`
- `npm run typecheck`
  - passed
- `npm run e2e -- tests/e2e/project-gantt-crud.spec.ts --reporter=line`
  - passed (`4 passed`)

### Wiring Verification
- Gantt edit modal still writes through the same path:
  - `src/app/(dashboard)/projects/[id]/gantt/page.tsx` -> `useUpdateGanttTask()`
  - `src/hooks/useGantt.ts` -> `PATCH /api/gantt/[projectId]`
  - `src/app/api/gantt/[projectId]/route.ts`
  - `src/lib/project-execution-sync.ts`
- The new Gantt-page status badges do not create a second source of truth:
  - they reuse `deriveTaskScheduleHealth()` / `deriveProjectScheduleHealth()` from `src/lib/project-progress-derivations.ts`

### Behavior Changes / Risk Notes
- The Gantt page is now aligned with each project’s real schedule window.
- Updating `% ความคืบหน้า` in the edit modal can now visibly change the task’s schedule badge on that same page, instead of only affecting downstream dashboard/project-level views.
- The page still uses the repo’s demo evaluation date for “today,” by design, so this remains a controlled demo timeline rather than machine-clock time.

## Implementation Summary - 2026-03-17 14:11:02 +07

### Goal
- Resolve the contradiction where a main Gantt phase could show `Complete` while one of its child tasks was still incomplete and delayed.
- Make that fix apply across all projects, not just the booking-system screen the user showed.

### What Changed
- `src/lib/gantt-store.ts`
  - Added `normalizeParentTaskProgress()` which recalculates every non-milestone parent task’s progress from its direct child tasks.
  - This runs inside `getGanttDataForProject()`, so every project now gets normalized parent progress before the page/API consumes the data.
- `tests/e2e/project-gantt-crud.spec.ts`
  - Expanded the `proj-002` regression:
    - parent phase `วิเคราะห์ความต้องการ` must no longer show `เสร็จสิ้น (Complete)` while a child task is still at `85%`
    - it should show `กำลังดำเนินการ (In Progress)` instead

### TDD Evidence
- RED was reproduced from the user screenshot and direct code inspection:
  - parent phase progress was stored independently from child task progress in the seed/store
  - therefore `100% complete + delayed child` was possible
- GREEN command:
  - `npm run e2e -- tests/e2e/project-gantt-crud.spec.ts --reporter=line`

### Tests Run
- `npm run e2e -- tests/e2e/project-gantt-crud.spec.ts --reporter=line`
  - passed (`4 passed`)
- `npm run build`
  - passed
- `npm run lint`
  - passed with the same pre-existing hook warnings in `issues/page.tsx` and `risk/page.tsx`
- `npm run typecheck`
  - passed

### Wiring Verification
- All project Gantt consumers already go through `getGanttDataForProject()`:
  - `src/app/api/gantt/[projectId]/route.ts`
  - `src/lib/project-execution-sync.ts`
  - Gantt page fetch via `src/hooks/useGantt.ts`
- Because normalization happens in the store getter, the fix applies to all seeded and generated projects without touching each page separately.

### Behavior Changes / Risk Notes
- Main phases can no longer remain visually completed while child tasks are incomplete.
- Parent phase progress is now derived as the average of its non-milestone child tasks, since the current Gantt data model does not store per-child task weights.
- If weighted parent progress is needed later, the Gantt task model will need explicit weights rather than inferred averages.

## Implementation Summary - 2026-03-17 14:38:40 +07

### Goal
- Fix the admin dashboard case where the header/menu still showed `System Admin`, but the dashboard rendered `0` projects and hid project-scoped data.
- Eliminate client/server auth drift so project queries only run after the cookie-backed session has been revalidated.

### What Changed
- `src/lib/api-client.ts`
  - Added `credentials: 'same-origin'` to every API fetch so auth cookies are explicitly sent and accepted on same-origin requests.
- `src/components/auth/AuthBootstrap.tsx`
  - Mark auth as not ready before each session refresh, then set the store only from `/api/auth/session`.
  - This makes the bootstrap path authoritative instead of letting stale client state linger.
- `src/components/auth/LoginScreen.tsx`
  - Removed the optimistic `setCurrentUser(response.user)` on login.
  - After a successful login, the app now clears query state, resets project context, sets `authReady` to `false`, and waits for `AuthBootstrap` to confirm the cookie-backed session.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Added a regression that logs in as `user-001`, reloads `/dashboard`, and verifies the admin still sees the portfolio data and the create-project button.

### TDD Evidence
- RED:
  - I could not reproduce a deterministic RED in headless Playwright; the failure was user-reported from the live dev session and the existing admin dashboard specs were still green.
  - Direct evidence showed the risky path: the login screen was setting `currentUser` optimistically before the session bootstrap had revalidated the cookie-backed session, which could let the UI look logged in while server-backed project data was still out of sync.
- GREEN commands:
  - `npx playwright test tests/e2e/project-create-and-shell.spec.ts --grep "system admin" --reporter=line`
  - `npx playwright test tests/e2e/project-schedule-health.spec.ts --reporter=line`

### Tests Run
- `npx playwright test tests/e2e/project-create-and-shell.spec.ts --grep "system admin" --reporter=line`
  - passed (`2 passed`)
- `npx playwright test tests/e2e/project-schedule-health.spec.ts --reporter=line`
  - passed (`1 passed`)
- `npm run lint`
  - passed with the same pre-existing hook warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - passed after `build` regenerated `.next/types`

### Wiring Verification
- Login success still flows through:
  - `src/components/auth/LoginScreen.tsx` -> `POST /api/auth/login`
  - then route change / refresh
  - then `src/components/auth/AuthBootstrap.tsx` -> `GET /api/auth/session`
  - then `useAuthStore.setCurrentUser(...)`
- Project data still enters the dashboard through:
  - `src/hooks/useProjects.ts` -> `/api/projects`
  - `src/app/(dashboard)/dashboard/page.tsx`
- The new behavior only changes when auth becomes trusted, not where project data is read.

### Behavior Changes / Risk Notes
- After login or reload, the app now prefers a brief loading state over showing a stale user context with empty project data.
- This fix is fail-closed for auth readiness: project queries wait for the session bootstrap instead of using optimistic client-only identity.
- I did not change the existing warning-only lint issues in `issues` and `risk`; they remain unrelated follow-ups.

## Implementation Summary - 2026-03-17 15:00:18 +07

### Goal
- Clarify the project-status meaning of `planning`.
- Make `planning` and `watch` render with clearly distinct colors everywhere, especially on the dashboard and charts.

### What Changed
- `src/theme/antd-theme.ts`
  - Added centralized `PROJECT_STATUS_COLORS` so status colors come from one place.
  - Kept `watch` as amber and standardized `planning` as blue.
- `src/components/common/StatusBadge.tsx`
  - Switched project status tags to the centralized colors instead of mixed Ant Design named colors.
- `src/components/charts/PortfolioBarChart.tsx`
  - Stopped using the same warning/orange color for both `watch` and `planning`.
  - `watch` now uses the amber watch color; `planning` uses the blue planning color; `completed` uses green.
- `src/app/(dashboard)/dashboard/page.tsx`
  - Updated the `Planning` KPI card to the centralized planning blue.
- `src/app/(dashboard)/executive/page.tsx`
  - Updated the executive progress/status color map to the same centralized status colors.
- `src/types/project.ts`
  - Aligned the `planning` metadata color with the blue planning status.

### TDD Evidence
- RED:
  - I did not add a new failing test for this change because the issue was visual/status-consistency work rather than a broken logic path, and there is no existing focused visual regression harness for badge/chart colors.
  - The discrepancy was verified directly in the live UI and in code: `planning` was blue in badges but orange in charts/KPIs, while `watch` was also orange.
- GREEN commands:
  - `npx playwright test tests/e2e/project-schedule-health.spec.ts --reporter=line`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Tests Run
- `npx playwright test tests/e2e/project-schedule-health.spec.ts --reporter=line`
  - passed (`1 passed`)
- `npm run lint`
  - passed with the same pre-existing hook warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - passed

### Wiring Verification
- Project status display on the dashboard still flows through:
  - `src/app/(dashboard)/dashboard/page.tsx` -> `StatusBadge` / `PortfolioBarChart`
- Executive status display still flows through:
  - `src/app/(dashboard)/executive/page.tsx` -> `StatusBadge`
- Because color choices are centralized in `src/theme/antd-theme.ts`, dashboard/executive/chart renderers now use the same status palette instead of drifting.

### Behavior Changes / Risk Notes
- `planning` is now consistently blue across the app.
- `watch` remains amber/orange and is visually separate from `planning`.
- This change is presentation-only; it does not alter the underlying auto-status logic.

## Implementation Summary - 2026-03-17 15:24:38 +07

### Goal
- Make the EVM page internally consistent so the KPI cards, charts, metrics table, snapshot table, and analysis message all come from the same formulas.
- Fix incorrect sign/color/interpretation issues on `proj-002`, especially around `CPI`, `CV`, and `VAC`.

### What Changed
- `src/lib/evm-metrics.ts`
  - Added a shared EVM derivation helper for:
    - `BAC`, `PV`, `EV`, `AC`
    - `SV`, `CV`
    - `SPI`, `CPI`
    - `EAC`, `ETC`, `VAC`, `TCPI`
    - signed percent / compact-baht formatting
    - schedule/cost tone helpers for subtitle and color logic
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
  - Replaced mixed hardcoded fallback text with one shared `metrics` object derived from the latest snapshot.
  - Changed the page subtitle from a fixed `15 กรกฎาคม 2569` to the real latest snapshot label, e.g. `ข้อมูลล่าสุด ณ งวด มิ.ย. 69`.
  - Fixed `CPI` interpretation so values below `1.00` are no longer shown as under budget.
  - Fixed `CV` and `VAC` sign handling so negative variances render negative and use warning/error semantics instead of always `+` green.
  - Made the schedule/cost variance tags derive from real `SV%` and `CV%` values instead of stale hardcoded text.
  - Made the project analysis alert dynamic instead of using the astronomy-project demo sentence for every project.
  - Removed misleading metric fallbacks so the page no longer invents unrelated numbers when project data differs.
- `src/components/charts/SCurveChart.tsx`
  - Renamed the vertical marker label from `ปัจจุบัน (Today)` to `ข้อมูลงวดล่าสุด` because the marker is the latest snapshot point, not the real current date.
- `tests/e2e/project-evm-metrics-consistency.spec.ts`
  - Added a regression that exercises the exact `proj-002` scenario from the user screenshots.
- `tests/e2e/project-evm-quality-crud.spec.ts`
  - Tightened the post-create assertion so it targets the EVM snapshot table cell instead of the now-duplicated month text in both the page subtitle and table.

### TDD Evidence
- RED command:
  - `npx playwright test tests/e2e/project-evm-metrics-consistency.spec.ts --reporter=line`
  - failing reason:
    - the old page rendered a fixed date label instead of the latest snapshot label
    - the page also used incorrect sign/interpretation logic for `CPI`, `CV`, and `VAC`
- GREEN commands:
  - `npx playwright test tests/e2e/project-evm-metrics-consistency.spec.ts --reporter=line`
  - `npx playwright test tests/e2e/project-evm-quality-crud.spec.ts --reporter=line`

### Tests Run
- `npx playwright test tests/e2e/project-evm-metrics-consistency.spec.ts --reporter=line`
  - passed (`1 passed`)
- `npx playwright test tests/e2e/project-evm-quality-crud.spec.ts --reporter=line`
  - passed (`1 passed`)
- `npm run lint`
  - passed with the same pre-existing hook warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - passed

### Wiring Verification
- The EVM page still reads snapshots through:
  - `src/hooks/useEVM.ts` -> `GET /api/evm/[projectId]`
  - `src/app/api/evm/[projectId]/route.ts`
- The newly added derivation layer is read-only and local to the page:
  - `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` -> `src/lib/evm-metrics.ts`
- Snapshot creation/deletion still goes through the same API mutation path and the CRUD E2E remained green after the read-model changes.

### Behavior Changes / Risk Notes
- `VAC` now correctly shows negative when `EAC` exceeds `BAC`; `proj-002` therefore displays a small overrun rather than a false positive remaining budget.
- `CPI < 1.00` is now treated as over budget / slightly over budget, which matches standard EVM interpretation.
- The S-curve marker still indicates the last snapshot index, but it is no longer mislabeled as the real current day.

## Implementation Summary - 2026-03-17 15:32:41 +07

### Goal
- Verify that the EVM consistency fixes hold across all five seeded projects, not just `proj-002`.
- Add a regression that proves each project’s EVM page matches its own latest API snapshot and derived formulas.

### What Changed
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - Added a new admin E2E sweep over all visible seeded projects.
  - For each project:
    - fetches `/api/projects`
    - fetches `/api/evm/:projectId`
    - derives latest-snapshot `SPI`, `CPI`, `EAC`, `VAC`, `CV`, and `SV`
    - verifies the EVM page shows values consistent with that project’s own data

### TDD Evidence
- RED:
  - `npx playwright test tests/e2e/project-evm-all-projects-consistency.spec.ts --reporter=line`
  - initial failure reason:
    - selector ambiguity because the same EVM values appear in both the metrics details and the snapshot table
- GREEN:
  - `npx playwright test tests/e2e/project-evm-all-projects-consistency.spec.ts --reporter=line`

### Tests Run
- `npx playwright test tests/e2e/project-evm-all-projects-consistency.spec.ts --reporter=line`
  - passed (`1 passed`)
- `npm run lint`
  - passed with the same pre-existing hook warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run typecheck`
  - passed

### Wiring Verification
- The new sweep verifies the full read path, not just local helper math:
  - `/api/projects`
  - `/api/evm/[projectId]`
  - `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
- This means the regression covers API data, page derivation, and visible rendering together.

### Behavior Changes / Risk Notes
- No production behavior changed in this step; this was coverage-only hardening.
- Result: all five seeded project EVM pages now verify against their own snapshot data and formulas under Playwright.

## Implementation Summary - 2026-03-17 15:43:57 +07

### Goal
- Make brand-new projects behave consistently on the EVM page even when they have no snapshots yet.
- Replace the accidental “empty array” behavior with an explicit initialized no-data state.

### What Changed
- `src/lib/evm-store.ts`
  - Added a lightweight EVM project registry so newly created projects are explicitly initialized in the EVM domain even before their first snapshot exists.
  - Added `ensureEvmProjectInitialized(projectId)`.
- `src/lib/project-bootstrap.ts`
  - Calls `ensureEvmProjectInitialized(project.id)` during new-project bootstrap.
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
  - Added a proper no-snapshot state for new projects:
    - subtitle now says `ยังไม่มีข้อมูลงวด EVM กรุณาบันทึกงวดแรกของโครงการ`
    - S-curve card now shows an empty-state message instead of a blank chart
    - CPI/SPI trend card now shows an empty-state message instead of a blank chart
    - `BAC` remains visible from the project budget even when no metrics exist
    - derived metrics stay `-` until the first snapshot is recorded
    - project analysis alert now explains that EVM analysis cannot start until the first snapshot is entered
- `tests/e2e/project-bootstrap-empty-state.spec.ts`
  - Expanded to assert the explicit EVM empty-state copy for brand-new projects.

### TDD Evidence
- RED:
  - `npx playwright test tests/e2e/project-bootstrap-empty-state.spec.ts --reporter=line`
  - initial failures were selector ambiguities in the existing test while exercising the new-project path; the EVM empty-state expectations themselves were added as part of this RED/GREEN cycle.
- GREEN:
  - `npx playwright test tests/e2e/project-bootstrap-empty-state.spec.ts --reporter=line`
  - `npx playwright test tests/e2e/project-evm-all-projects-consistency.spec.ts --reporter=line`

### Tests Run
- `npx playwright test tests/e2e/project-bootstrap-empty-state.spec.ts --reporter=line`
  - passed (`1 passed`)
- `npx playwright test tests/e2e/project-evm-all-projects-consistency.spec.ts --reporter=line`
  - passed (`1 passed`)
- `npm run lint`
  - passed with the same pre-existing hook warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - passed

### Wiring Verification
- New-project bootstrap path still flows through:
  - `POST /api/projects`
  - `src/lib/project-bootstrap.ts`
  - `src/lib/evm-store.ts`
- The EVM page still reads only from:
  - `src/hooks/useEVM.ts`
  - `GET /api/evm/[projectId]`
  - local derived metrics in `src/lib/evm-metrics.ts`
- Result: a brand-new project now reaches the EVM page through the same runtime path as seeded projects, but with a deliberate no-snapshot state instead of implicit emptiness.

### Behavior Changes / Risk Notes
- Brand-new projects no longer pretend to have partial EVM analytics before the first snapshot exists.
- The page now distinguishes clearly between:
  - approved budget available (`BAC`)
  - no earned/planned/actual performance data yet
- This is intentionally fail-closed: until the first snapshot is recorded, derived EVM metrics remain blank rather than guessed.
