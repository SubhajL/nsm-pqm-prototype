# Coding Log: hierarchical-agents-md-system

## Planning Context
- Timestamp: `2026-03-14-21-12-50`
- Repo path: `/Users/subhajlimanond/dev/nsm-pqm-prototype`
- Auggie semantic search unavailable; plan is based on direct file inspection plus exact-string searches.
- Inspected paths: `CLAUDE.md`, `IMPLEMENTATION_PLAN.md`, `src/components/charts/CLAUDE.md`, `src/components/gantt/CLAUDE.md`, `src/`, `.claude/`

## Plan Draft A

### Overview
Create a lightweight root `AGENTS.md` plus nested source-folder files that mirror the actual directory boundaries in the checkout. Keep the root short, push specific rules down into `src/` and deeper folders, and use existing `CLAUDE.md` files as the factual basis for commands and conventions.

### Files To Change
- `AGENTS.md`: root navigation, universal rules, and quick-find commands
- `src/AGENTS.md`: source-tree rules spanning app, components, and mock data
- `src/app/AGENTS.md`: route/layout guidance
- `src/app/api/AGENTS.md`: mock API conventions
- `src/components/AGENTS.md`: reusable UI conventions
- `src/components/charts/AGENTS.md`: ECharts-specific rules
- `src/components/gantt/AGENTS.md`: dhtmlxGantt-specific rules
- `src/data/AGENTS.md`: fixture and mock-data rules

### Implementation Steps
1. Add the root `AGENTS.md` with repo snapshot, root commands, universal conventions, security, JIT map, and done criteria.
2. Add `src/AGENTS.md` so future files under `src/**` inherit a source-wide layer before any more specific folder.
3. Add focused nested `AGENTS.md` files for `src/app/`, `src/app/api/`, `src/components/`, `src/components/charts/`, `src/components/gantt/`, and `src/data/`.
4. Keep every rule grounded in current on-disk docs; explicitly call out sparse areas instead of inventing nonexistent files.
5. Validate link coverage, command consistency, and that the root file stays compact.

### Test Coverage
- `docs_reference_every_nested_agents_file`: root index links to all nested files
- `root_agents_stays_lightweight`: root file remains compact and universal
- `nested_agents_follow_nearest_wins`: package rules become more specific by depth
- `commands_match_authoritative_docs`: npm commands align with `CLAUDE.md`

### Decision Completeness
- Goal: produce a usable hierarchical AGENTS system for this repo checkout.
- Non-goals: scaffold the missing Next.js application files or invent production architecture.
- Success criteria: all planned AGENTS files exist, root links are complete, and guidance stays aligned with on-disk docs.
- Public interfaces: new markdown docs only; no runtime code, schema, env, or API changes.
- Edge cases / failure modes: sparse checkout may leave some examples undocumented; handle by citing actual docs and stating the limitation explicitly.
- Rollout & monitoring: immediate repo-local documentation change; no rollout gating required.
- Acceptance checks: `find . -name 'AGENTS.md' | sort` shows the intended hierarchy and `sed -n '1,220p' AGENTS.md` confirms root brevity.

### Dependencies
- Existing documentation files remain the source of truth until implementation files exist.

### Validation
- Open each AGENTS file and verify it only references real on-disk paths or explicitly documented future structure from `CLAUDE.md`.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `AGENTS.md` hierarchy | Human/agent reads nearest file before editing | File-system path lookup by folder depth | N/A |
| `src/app/api/AGENTS.md` | Read before editing mock handlers under `src/app/api/` | Nested under `src/app/AGENTS.md` and root index | N/A |
| `src/components/charts/AGENTS.md` | Read before editing chart files | Nested under `src/components/AGENTS.md` and root index | N/A |

## Plan Draft B

### Overview
Use fewer files by documenting only root, `src/`, `src/components/charts/`, and `src/components/gantt/`. Keep the rest of the guidance centralized to minimize maintenance burden.

### Files To Change
- `AGENTS.md`
- `src/AGENTS.md`
- `src/components/charts/AGENTS.md`
- `src/components/gantt/AGENTS.md`

### Implementation Steps
1. Put most conventions in root and `src/`.
2. Add deeper files only where there is already specialized guidance on disk.
3. Omit `src/app/`, `src/app/api/`, `src/components/`, and `src/data/` files until source code exists there.

### Test Coverage
- `minimum_agents_hierarchy_exists`: root and critical specialized folders are covered
- `specialized_rules_live_only_where_needed`: charts and Gantt keep dedicated docs

### Decision Completeness
- Goal: lower maintenance cost for the docs system.
- Non-goals: document empty folders with speculative rules.
- Success criteria: fewer docs to maintain while retaining specialized guidance for the current concrete folders.
- Public interfaces: markdown docs only.
- Edge cases / failure modes: empty folders like `src/app/api/` would have no nearest guidance, causing agents to fall back to root too often.
- Rollout & monitoring: same as Draft A.
- Acceptance checks: reduced file count with correct root links.

### Dependencies
- Relies on root docs covering more cases without becoming too heavy.

### Validation
- Compare root file size and specificity against Draft A.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| Reduced AGENTS hierarchy | Human/agent reads root or `src/` docs | File-system path lookup by folder depth | N/A |

## Comparative Analysis & Synthesis
- Draft A is better for nearest-wins behavior because `src/app/api/` and `src/data/` have different rules despite both being sparse today.
- Draft B is simpler but pushes too much context back into root and loses the folder-specific benefits the user explicitly asked for.
- The repo is sparse enough that every rule must stay documentation-first, but that does not remove the need for folder-local entry points.

## Unified Execution Plan

### Overview
Implement Draft A, but keep each nested file short and honest about the sparse checkout. The hierarchy should mirror actual directories, minimize duplication, and use `CLAUDE.md` plus the two component-level `CLAUDE.md` files as the only authoritative sources.

### Files To Change
- `AGENTS.md`
- `src/AGENTS.md`
- `src/app/AGENTS.md`
- `src/app/api/AGENTS.md`
- `src/components/AGENTS.md`
- `src/components/charts/AGENTS.md`
- `src/components/gantt/AGENTS.md`
- `src/data/AGENTS.md`
- `.codex/coding-log.current`
- `coding-logs/2026-03-14-21-12-50 Coding Log (hierarchical-agents-md-system).md`

### Implementation Steps
1. TDD sequence:
   1. Add the AGENTS files.
   2. Inspect them and confirm links/paths are correct.
   3. Tighten wording until the root file stays lightweight.
   4. Refactor duplicated guidance down into nested files.
   5. Run fast validation with `find` and `sed`.
2. Write the root file first so all nested locations can be linked immediately.
3. Add `src/AGENTS.md` as the default source-level fallback.
4. Add folder-local files for app, mock API, components, charts, Gantt, and data.
5. Create the coding-log pointer required by the active planning workflow.

### Test Coverage
- `all_agents_files_exist_in_expected_paths`: hierarchy matches current directories
- `root_contains_only_universal_guidance`: root avoids component-level detail
- `nested_files_contain_folder_specific_commands_and_hints`: depth-specific guidance is present
- `sparse_checkout_limitations_are_explicit`: docs do not pretend missing code exists

### Decision Completeness
- Goal: hierarchical AGENTS system optimized for nearest-wins and low token use.
- Non-goals: app scaffolding, runtime changes, or speculative implementation examples beyond current docs.
- Success criteria: root is lightweight, each major source folder has a local AGENTS file, and the docs only cite real paths or explicitly documented planned structure.
- Public interfaces: markdown documentation hierarchy plus coding-log metadata.
- Edge cases / failure modes:
  - Sparse checkout: solved by citing existing docs and flagging absent code.
  - Missing package manifest: solved by marking npm commands as documented, not verified.
  - Over-duplication: solved by pushing specifics downward.
- Rollout & monitoring: no rollout needed; verify the docs tree and review line counts manually.
- Acceptance checks:
  - `find . -name 'AGENTS.md' | sort`
  - `sed -n '1,220p' AGENTS.md`
  - `sed -n '1,220p' src/components/charts/AGENTS.md`

### Dependencies
- `CLAUDE.md`
- `IMPLEMENTATION_PLAN.md`
- `src/components/charts/CLAUDE.md`
- `src/components/gantt/CLAUDE.md`

### Validation
- Confirm root links to every nested AGENTS file.
- Confirm each nested file references only real on-disk files.
- Confirm command lines are copy-pasteable and consistent.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| Root `AGENTS.md` | Read when editing repo root or when no nearer file exists | Repo root path | N/A |
| `src/AGENTS.md` | Read when editing `src/**` without a deeper file | `src/` directory | N/A |
| `src/app/AGENTS.md` | Read when editing route/layout files | `src/app/` directory | N/A |
| `src/app/api/AGENTS.md` | Read when editing mock handlers | `src/app/api/` directory | N/A |
| `src/components/AGENTS.md` | Read when editing shared UI | `src/components/` directory | N/A |
| `src/components/charts/AGENTS.md` | Read when editing chart files | `src/components/charts/` directory | N/A |
| `src/components/gantt/AGENTS.md` | Read when editing Gantt files | `src/components/gantt/` directory | N/A |
| `src/data/AGENTS.md` | Read when editing fixtures | `src/data/` directory | N/A |


## Review (2026-03-14 21:18:02 +0700) - working-tree

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: working tree
- Commands Run: `find . -name 'AGENTS.md' | sort`; `wc -l AGENTS.md src/AGENTS.md src/app/AGENTS.md src/app/api/AGENTS.md src/components/AGENTS.md src/components/charts/AGENTS.md src/components/gantt/AGENTS.md src/data/AGENTS.md`; `sed -n '1,220p' AGENTS.md`; `sed -n '1,220p' src/app/api/AGENTS.md`; `nl -ba AGENTS.md | sed -n '1,220p'`; `nl -ba src/AGENTS.md | sed -n '1,220p'`; `nl -ba src/app/AGENTS.md | sed -n '1,220p'`; `nl -ba src/components/AGENTS.md | sed -n '1,220p'`; `nl -ba src/components/charts/AGENTS.md | sed -n '1,220p'`; `nl -ba src/components/gantt/AGENTS.md | sed -n '1,220p'`; `nl -ba src/data/AGENTS.md | sed -n '1,220p'`; `rg -n "[\u0E00-\u0E7F]" src/ --type ts --type tsx`; `rg -n "export (function|const) " src/components --type ts --type tsx`; `npm run typecheck`

### Findings
CRITICAL
- No findings.

HIGH
- Several “copy-paste-ready” JIT commands are invalid as written because this ripgrep does not recognize `--type tsx`. This affects the root file and most nested AGENTS files, so an agent following the docs will immediately hit command errors instead of getting fast context. Update every `rg ... --type ts --type tsx` / `--type tsx` invocation to use file globs like `-g '*.ts' -g '*.tsx'` or a verified supported type alias. Affected examples include `AGENTS.md:46`, `AGENTS.md:47`, `AGENTS.md:48`, `src/AGENTS.md:32`, `src/AGENTS.md:33`, `src/app/AGENTS.md:32`, `src/components/AGENTS.md:30`, `src/components/AGENTS.md:31`, `src/components/AGENTS.md:32`, `src/components/charts/AGENTS.md:30`, `src/components/charts/AGENTS.md:31`, `src/components/charts/AGENTS.md:32`, `src/components/gantt/AGENTS.md:30`, `src/components/gantt/AGENTS.md:31`, `src/components/gantt/AGENTS.md:32`, `src/data/AGENTS.md:30`, `src/data/AGENTS.md:31`, and `src/data/AGENTS.md:32`. Tests needed: smoke-run each documented quick-find command once after editing.

MEDIUM
- The subfolder docs present setup and pre-PR commands as normal workflow even though the current checkout has no package manifest and `npm run typecheck` fails. Because nearest-wins means agents will usually read a nested file, the root-level caveat in `AGENTS.md:16` will often be missed and the agent will waste time on commands that cannot succeed today. Either move command ownership to the root and have subfiles say “inherit root commands”, or gate the commands with “when `package.json` exists in this checkout”. Representative locations: `src/AGENTS.md:7`, `src/app/AGENTS.md:7`, `src/app/api/AGENTS.md:7`, `src/components/AGENTS.md:7`, `src/components/charts/AGENTS.md:7`, `src/components/gantt/AGENTS.md:7`, `src/data/AGENTS.md:7`. Tests needed: run every documented setup/quality command from the project root and verify the expected success/failure note is accurate.
- The hierarchy is structurally correct, but several package-level files are still too generic for the token cost they introduce. The user asked for subfolder AGENTS with more detail, real examples, and anti-pattern guidance; `src/app/AGENTS.md:14`, `src/components/AGENTS.md:14`, and `src/data/AGENTS.md:14` mostly restate `CLAUDE.md` without concrete file examples or “copy this pattern from X” references. In a sparse repo this should be handled explicitly: either collapse some folders back into `src/AGENTS.md` until code exists, or add concrete references to the only real implementation-adjacent docs available, such as `src/components/charts/CLAUDE.md` and `src/components/gantt/CLAUDE.md`. Tests needed: review each nested file against a checklist of “at least one real example path per major rule section”.

LOW
- The root JIT map uses plain path text instead of markdown links, so the navigation value is lower than it could be for tools that open linked files directly. Converting lines like `AGENTS.md:33` through `AGENTS.md:39` to markdown links would make the hierarchy more usable without adding much weight. Tests needed: open-link smoke check in the target client/editor.

### Open Questions / Assumptions
- I assumed the effective project root for AGENTS purposes is `/Users/subhajlimanond/dev/nsm-pqm-prototype`, even though `git rev-parse --show-toplevel` resolves to `/Users/subhajlimanond`.
- I assumed the missing `package.json` is a real characteristic of the current checkout, not a temporary omission.
- If these AGENTS files are meant for a future fuller scaffold rather than this checkout, some “missing example” comments should instead become explicit TODO placeholders.

### Recommended Tests / Validation
- Replace each ripgrep command with a verified variant and run every one once.
- Audit every sub-AGENTS file for at least one concrete path example or explicitly mark the section as intentionally deferred until code exists.
- Decide whether nested files should inherit root commands to avoid stale duplication.
- If you keep command sections in nested files, add a single-line caveat wherever the commands are not currently runnable.

### Rollout Notes
- This is a documentation-only change, but bad commands degrade agent behavior immediately, so fix the quick-find snippets before relying on the hierarchy for automated coding sessions.
- Because the repo is nested inside a larger git root, keep future coding-log and repo-root assumptions explicit in the root AGENTS file to avoid tool confusion.


## Implementation Summary (2026-03-14 21:34:00 +0700) - lhs-menu-performance

### Goal
Speed up the left-hand sidebar interactions by removing unnecessary route-navigation overhead and reducing layout work tied to sidebar collapse state.

### What Changed
- `src/components/layout/Sidebar.tsx`
  - Replaced nested `next/link` labels with a single menu click handler using `router.push(...)`.
  - Removed blanket per-item link prefetching from the sidebar menu.
  - Added optimistic `pendingPath` selection so the active row updates immediately on click.
  - Added longest-prefix key matching once at module scope so nested project routes still resolve to the correct menu item.
  - Synced the live sidebar width into a CSS variable on `document.documentElement` so the shell can respond without reading store state at the layout root.
- `src/app/(dashboard)/layout.tsx`
  - Removed the top-level Zustand subscription for `sidebarCollapsed`.
  - Switched the main shell offset to `var(--dashboard-sidebar-width, 240px)` so collapse/expand no longer depends on a layout-level React state read.

### TDD Evidence
- No dedicated automated test harness exists in this repo for client-side navigation performance or component interaction tests, so I could not produce a meaningful RED unit/integration test first.
- Closest RED signal during implementation:
  - `npm run build`
  - Failed with `Could not find the module ... antd/es/index.js#Layout#Content in the React Client Manifest` after an intermediate server/client boundary refactor.
- GREEN commands after the final fix:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Tests Run
- `npm run lint` -> pass
- `npm run build` -> pass
- `npm run typecheck` -> pass

### Wiring Verification
- Sidebar navigation entry point: `src/components/layout/Sidebar.tsx` -> `Menu onClick={handleMenuClick}` -> `router.push(nextPath)`
- Collapse width propagation: `src/components/layout/Sidebar.tsx` effect writes `--dashboard-sidebar-width` -> `src/app/(dashboard)/layout.tsx` reads it via `marginLeft`
- Toggle entry point remains unchanged: `src/components/layout/Header.tsx` -> `toggleSidebar()` in `useAppStore`

### Behavior Changes And Risk Notes
- Clicking a sidebar row now updates selection immediately and navigates through a single handler instead of nested links.
- Sidebar collapse/expand no longer requires the dashboard layout to subscribe to store state directly.
- Fail mode: if client navigation fails, the optimistic highlight will reset on the next pathname update; no data loss or persistent bad state.

### Follow-Ups / Known Gaps
- There is still no automated interaction/performance test coverage for the navigation shell.
- If the menu later grows significantly, consider explicit route metadata objects shared by sidebar and breadcrumb generation to avoid duplicated path logic.
- Auggie semantic search timed out repeatedly, so this debug was based on direct file inspection.


## Implementation Summary (2026-03-14 21:38:20 +0700) - undo-lhs-menu-performance

### Goal
Undo the sidebar-performance changes made in the previous step.

### What Changed
- `src/components/layout/Sidebar.tsx`
  - Restored menu labels back to `next/link` entries with the original `prefetch` behavior.
  - Removed the optimistic selection state and manual `router.push(...)` click handler.
  - Removed CSS variable side effects tied to sidebar width.
- `src/app/(dashboard)/layout.tsx`
  - Restored the direct Zustand subscription for `sidebarCollapsed`.
  - Restored `marginLeft` calculation from store state.

### TDD Evidence
- No RED/ GREEN test cycle was applicable; this was a direct rollback of the prior change.
- Validation commands run after rollback:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Tests Run
- `npm run lint` -> pass
- `npm run build` -> pass
- `npm run typecheck` -> fails with pre-existing `.next/types/**/*.ts` missing-file errors from `tsconfig.json` include patterns

### Wiring Verification
- Sidebar navigation wiring restored to `Link` labels inside `src/components/layout/Sidebar.tsx`.
- Dashboard shell offset wiring restored to `useAppStore((s) => s.sidebarCollapsed)` in `src/app/(dashboard)/layout.tsx`.

### Behavior Changes And Risk Notes
- All menu-performance changes from the prior step have been removed.
- Current behavior should match the pre-change baseline.

### Follow-Ups / Known Gaps
- The original left-hand menu slowness remains unresolved after this rollback.
- The `tsconfig.json` / `.next/types` typecheck issue remains independent of the sidebar work.


## Implementation Summary (2026-03-15 00:02:00 +0700) - dashboard-kpi-sum-fix

### Goal
Fix the portfolio dashboard KPI cards so the displayed counts no longer imply an invalid sum.

### What Changed
- `src/app/(dashboard)/dashboard/page.tsx`
  - Replaced the hardcoded `delayedCount = 2` with data-derived KPI calculations inside `useMemo`.
  - Derived delayed projects from the current in-progress set using `spiValue < 1`.
  - Added `planningCount` so the in-progress card can explain why the visible cards do not partition the total project count.
  - Updated the delayed KPI label/subtitle to explicitly state it is a subset of in-progress, not a separate status bucket.

### TDD Evidence
- No dedicated test runner exists for this dashboard KPI logic, so I could not add a RED unit test first without introducing new test infrastructure.
- The bug was reproducible by inspecting the page logic plus source data:
  - `src/app/(dashboard)/dashboard/page.tsx` showed `const delayedCount = 2; // Hardcoded for demo`
  - `src/data/projects.json` showed project statuses `3 in_progress`, `1 planning`, `1 completed`, proving delayed could not be a separate top-level status count.
- GREEN validation commands after the fix:
  - `npm run lint`
  - `npm run build`

### Tests Run
- `npm run lint` -> pass
- `npm run build` -> pass
- `npm run typecheck` -> fails with pre-existing missing `.next/types/**/*.ts` files referenced by `tsconfig.json`

### Wiring Verification
- Dashboard KPI entry point remains `src/app/(dashboard)/dashboard/page.tsx`.
- Data source remains `useProjects()` from `src/hooks/useProjects.ts` -> `/api/projects` -> `src/data/projects.json`.
- No new runtime wiring or registrations were added.

### Behavior Changes And Risk Notes
- Delayed count is now derived from live project data instead of a hardcoded constant.
- The UI now clarifies that delayed projects are included within in-progress projects, which removes the misleading implication that all visible KPI cards should sum cleanly.
- Risk is low: this only changes derived display logic on the dashboard.

### Follow-Ups / Known Gaps
- If the product wants KPI buckets that fully partition the portfolio total, the card set should be redesigned to include planning/on-hold/cancelled explicitly instead of mixing status buckets with schedule health.
- Typecheck still has an unrelated `.next/types` configuration problem.
- Auggie semantic search was unavailable, so this fix was based on direct file inspection.


## Implementation Summary (2026-03-15 00:17:00 +0700) - dashboard-kpi-layout-clarify-planning-delayed

### Goal
Make the dashboard KPI row unambiguous by removing planning from the in-progress subtitle and showing delayed as a subset inside the in-progress card.

### What Changed
- `src/components/common/KPICard.tsx`
  - Added optional `extraContent` support so a KPI card can render a secondary nested visual without duplicating the base card layout.
- `src/app/(dashboard)/dashboard/page.tsx`
  - Removed the confusing `รอเริ่ม` note from the in-progress subtitle.
  - Replaced the top-level delayed KPI card with a top-level planning KPI card.
  - Added a compact delayed subset panel inside the in-progress card showing both count and percentage of in-progress projects.
  - Added `planningPct` derivation for the new planning card.

### TDD Evidence
- No component test harness exists in this repo for dashboard card rendering, so I could not produce a RED unit/integration test first without introducing new test infrastructure.
- Validation commands after the UI change:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Tests Run
- `npm run lint` -> pass
- `npm run build` -> pass
- `npm run typecheck` -> fails with pre-existing missing `.next/types/**/*.ts` files referenced by `tsconfig.json`

### Wiring Verification
- Dashboard KPI rendering remains in `src/app/(dashboard)/dashboard/page.tsx`.
- `KPICard` nested subset UI is wired through the new `extraContent` prop in `src/components/common/KPICard.tsx`.
- No route, API, or store wiring changed.

### Behavior Changes And Risk Notes
- `Planning` is now a top-level KPI, so it is no longer implied inside the in-progress card.
- `Delayed` now reads visually as part of in-progress, which matches the underlying data model.
- Risk is low and limited to dashboard presentation.

### Follow-Ups / Known Gaps
- The dashboard still has no automated render/assertion tests.
- Typecheck still has an unrelated `.next/types` configuration problem.
- Auggie was skipped per the 2-second fallback policy and the change was based on direct file inspection.


## Implementation Summary (2026-03-15 00:23:00 +0700) - dashboard-kpi-height-align

### Goal
Keep the KPI cards visually consistent in height by replacing the nested delayed subset box with simple text in the in-progress subtitle.

### What Changed
- `src/app/(dashboard)/dashboard/page.tsx`
  - Flattened the delayed subset display to subtitle text: `(<count> ล่าช้า)` inside the in-progress card.
  - Removed the no-longer-used delayed percentage and icon import tied to the nested subset box.

### TDD Evidence
- No dashboard component test harness exists in this repo, so no RED UI test was added.
- Validation commands after the tweak:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Tests Run
- `npm run lint` -> pass
- `npm run build` -> pass
- `npm run typecheck` -> fails with pre-existing missing `.next/types/**/*.ts` files referenced by `tsconfig.json`

### Wiring Verification
- Dashboard KPI rendering remains in `src/app/(dashboard)/dashboard/page.tsx`.
- No routing, API, or shared state wiring changed.

### Behavior Changes And Risk Notes
- In-progress now shows delayed count as compact text instead of a nested box.
- Card heights stay aligned because all KPI cards return to a similar content footprint.

### Follow-Ups / Known Gaps
- The generic `extraContent` support remains in `src/components/common/KPICard.tsx` even though it is not used by this dashboard after the latest tweak.
- Typecheck still has an unrelated `.next/types` configuration problem.


## Implementation Summary (2026-03-15 00:34:00 +0700) - dashboard-consistency-fix

### Goal
Align the dashboard KPI cards, department chart, and project table so they all reflect the same underlying project data and status reasoning.

### What Changed
- `src/app/(dashboard)/dashboard/page.tsx`
  - Removed the hardcoded department status data.
  - Added `departmentStatusData` derived directly from `projects`, grouped by department and counted into `inProgress`, `planning`, and `completed` buckets.
  - Kept KPI cards driven from the same `projects` list.
  - Renamed the table title from `Projects to Monitor` to `All Projects` so the UI matches the actual table contents.
- `src/components/charts/PortfolioBarChart.tsx`
  - Changed the chart series from old demo-only buckets (`On Track`, `At Risk`, `Delayed`, `Completed`) to the same top-level buckets used by the dashboard (`In Progress`, `Planning`, `Completed`).
  - Updated series colors and legend labels accordingly.

### TDD Evidence
- No dedicated dashboard test harness exists for this page, so I used the broken behavior in the live UI plus build/lint validation rather than RED unit tests.
- Validation commands after the fix:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Tests Run
- `npm run lint` -> pass
- `npm run build` -> pass
- `npm run typecheck` -> fails with pre-existing missing `.next/types/**/*.ts` files referenced by `tsconfig.json`

### Wiring Verification
- Dashboard entry point remains `src/app/(dashboard)/dashboard/page.tsx`.
- Department chart continues to render through `PortfolioBarChart`, now fed from computed data instead of the deleted hardcoded array.
- Project table still reads from `filteredProjects`, which still derives from `projects`.

### Behavior Changes And Risk Notes
- KPI cards, department chart, and table header now agree on what dataset they represent.
- The department chart now shows the same status families as the KPI row, instead of a separate hardcoded demo taxonomy.
- Risk is low and limited to dashboard presentation logic.

### Follow-Ups / Known Gaps
- The donut chart was already consistent with the type distribution and was left unchanged.
- `npm run typecheck` still fails due to the unrelated `.next/types` include issue.
- This fix used direct file inspection under the Auggie fallback rule.


## Implementation Summary (2026-03-15 09:52:00 +0700) - dev-server-restart-after-stale-next-cache

### Goal
Recover from the blank-screen runtime failure on `localhost:3002` caused by a stale `next dev` process.

### What Changed
- No source files were changed for this recovery step.
- Stopped the stale `next dev` process listening on port `3002`.
- Started a fresh `next dev --port 3002` process.
- Verified `/dashboard` responds with HTTP 200 from the restarted dev server.

### TDD Evidence
- No RED/GREEN unit test cycle applied; this was a live dev-server recovery.
- Evidence of the issue:
  - user-provided `MODULE_NOT_FOUND` stack from the running `next dev` process on `:3002`
- GREEN validation commands:
  - `curl -I http://localhost:3002/dashboard`
  - `curl -s http://localhost:3002/dashboard`

### Tests Run
- `curl -I http://localhost:3002/dashboard` -> HTTP 200
- `curl -s http://localhost:3002/dashboard` -> HTML returned successfully

### Wiring Verification
- Verified the restarted process is now the active listener for `:3002`.
- Verified the dev server compiled `/dashboard` successfully after restart.

### Behavior Changes And Risk Notes
- This was an operational reset only; application code behavior is unchanged.
- The previous blank screen was consistent with a stale `.next` / dev-runtime state, not a new source import bug.

### Follow-Ups / Known Gaps
- If the browser still shows the stale blank state, a hard refresh is the next step.
- `npm run typecheck` still has the unrelated `.next/types` configuration issue.

## 2026-03-15 21:53:58 +0700
- Goal: Make the dashboard status model consistent by keeping KPI cards at the project-lifecycle level while changing the department chart and project table to show active work as `ตามแผน (On Schedule)` or `ล่าช้า (Delayed)`.
- What changed:
  - `src/app/(dashboard)/dashboard/page.tsx`: added `getProjectDisplayStatus(project)` to derive active-project display status from `spiValue`; removed delayed text from the In Progress KPI card; changed department chart aggregation to `onSchedule` / `delayed` / `planning` / `completed`; changed the project table status column to render the derived display status instead of raw `in_progress`.
  - `src/components/charts/PortfolioBarChart.tsx`: changed the stacked bar chart schema and legend from `In Progress / Planning / Completed` to `On Schedule / Delayed / Planning / Completed`.
  - `src/components/common/StatusBadge.tsx`: added project badge labels for `on_schedule` and `delayed`.
- TDD evidence:
  - No automated test harness exists for this dashboard slice, and this change was a wiring/UI consistency fix across existing page composition rather than a unit-isolated function change.
  - RED: not produced because there is no focused dashboard test target in the repo today.
  - GREEN: `npm run lint` and `npm run build` after the patch.
- Tests run:
  - `npm run lint` -> passed, with pre-existing `react-hooks/exhaustive-deps` warnings in other dashboard pages.
  - `npm run build` -> passed.
  - `npm run typecheck` -> failed with the pre-existing `TS6053` missing `.next/types/**/*.ts` files from `tsconfig.json` include patterns.
- Wiring verification evidence:
  - `PortfolioDashboardPage` passes derived `departmentStatusData` into `PortfolioBarChart`.
  - The table status column in `PortfolioDashboardPage` now calls `StatusBadge` with `getProjectDisplayStatus(record)`.
  - `StatusBadge` has explicit display mappings for `on_schedule` and `delayed`, so the table rendering is wired to concrete labels/colors.
- Behavior changes and risk notes:
  - KPI cards still communicate lifecycle counts (`In Progress`, `Planning`, `Completed`).
  - The department chart and project table now communicate execution health for active projects, which is more informative but means the chart legend is intentionally not a 1:1 copy of the KPI row.
  - Classification currently uses `spiValue < 1` as delayed and `spiValue >= 1` as on-schedule for `in_progress` projects.
- Follow-ups / known gaps:
  - If the product wants a distinct `At Risk` bucket later, the current helper is the single place to extend the active-project display model.
  - Auggie semantic search timed out; implementation was based on direct file inspection and verified local build/lint results.

## 2026-03-15 22:00:40 +0700
- Goal: Make the dashboard KPI boxes drive the two charts and the table so the user can demo filtered portfolio views by clicking each box.
- What changed:
  - `src/app/(dashboard)/dashboard/page.tsx`: added `statusFilter` state for `all`, `in_progress`, `planning`, and `completed`; introduced `scopedProjects` so both charts and the table derive from the selected KPI box; kept KPI counts themselves based on the full project portfolio; wired each KPI card to update the selection state.
  - `src/components/common/KPICard.tsx`: made KPI cards optionally interactive with active-state styling, pointer/keyboard support, and `aria-pressed` so the selected filter is visible during the demo.
- TDD evidence:
  - No targeted RED test was added because the repo does not currently have a focused dashboard interaction test harness for this page-level client behavior.
  - RED: not produced for the reason above.
  - GREEN: `npm run lint`, `npm run build`, and `npm run typecheck` after the patch.
- Tests run:
  - `npm run lint` -> passed, with pre-existing `react-hooks/exhaustive-deps` warnings in other dashboard pages.
  - `npm run build` -> passed.
  - `npm run typecheck` -> passed after a fresh build generated the current `.next/types` output.
- Wiring verification evidence:
  - `PortfolioDashboardPage` now passes chart data derived from `scopedProjects` into `PortfolioBarChart` and `ProjectDonutChart`.
  - The project table `dataSource` now comes from `filteredProjects`, which itself is derived from `scopedProjects` plus search/type filters.
  - Each `KPICard` in `PortfolioDashboardPage` now calls `setStatusFilter(...)`, so user clicks update the lower dashboard sections.
- Behavior changes and risk notes:
  - Clicking `Total Projects` resets the lower section to the full portfolio.
  - Clicking `In Progress`, `Planning`, or `Completed` filters both charts and the table to that lifecycle bucket.
  - The department chart still shows execution-health status for active projects (`On Schedule` vs `Delayed`) and will naturally collapse to only the relevant buckets for the selected KPI filter.
- Follow-ups / known gaps:
  - For a stronger demo, the next improvement would be a small label above the lower section that says which KPI filter is active.
  - Auggie semantic search timed out again; the implementation was completed via direct file inspection and local verification.

## 2026-03-15 22:15:25 +0700
- Goal: Add a status filter control to the All Projects table and move pagination away from the floating create button.
- What changed:
  - `src/app/(dashboard)/dashboard/page.tsx`: added a searchable project-status `Select` filter for the table using the displayed status model (`on_schedule`, `delayed`, `planning`, `completed`); updated table filtering logic to apply that derived status filter; changed table pagination position to `bottomLeft` so it no longer collides with the floating `สร้างโครงการใหม่` button.
- TDD evidence:
  - No focused RED test was added because this repo still lacks a targeted dashboard interaction test harness for page-level client UI behavior.
  - RED: not produced for the reason above.
  - GREEN: `npm run lint`, `npm run build`, and `npm run typecheck` after the patch.
- Tests run:
  - `npm run lint` -> passed, with pre-existing `react-hooks/exhaustive-deps` warnings in other dashboard pages.
  - `npm run build` -> passed.
  - `npm run typecheck` -> passed after the fresh build regenerated `.next/types`.
- Wiring verification evidence:
  - `PortfolioDashboardPage` now keeps `tableStatusFilter` state and applies it inside `filteredProjects` using `getProjectDisplayStatus(p)`.
  - The new `Select` control is wired to `setTableStatusFilter`.
  - The `Table` pagination config now explicitly sets `position: ['bottomLeft']`.
- Behavior changes and risk notes:
  - Users can now search/filter by the same status wording shown in the table badges.
  - Pagination controls no longer sit under the floating action button.
- Follow-ups / known gaps:
  - If the table gets more filters later, a dedicated filter toolbar component would make the layout easier to maintain.

## 2026-03-15 22:27:39 +0700
- Goal: Improve the new-project form by explaining progress calculation methods, making payment milestone amount/percent behavior consistent, and turning Save Draft into a real recallable draft flow.
- What changed:
  - `src/app/(dashboard)/projects/new/page.tsx`: added three progress-method explanation cards under the method selector and highlighted the currently selected method.
  - `src/app/(dashboard)/projects/new/page.tsx`: implemented deterministic milestone recalculation rules:
    - editing `%` recalculates that milestone amount from the current project budget
    - editing amount recalculates the total and redistributes all milestone percentages from the entered amounts
    - adding a new milestone clears all milestone amounts and percentages so the payment plan is redefined explicitly
  - `src/app/(dashboard)/projects/new/page.tsx`: added milestone guidance text and improved the summary row to show whether milestone totals match, exceed, or fall short of the project budget.
  - `src/app/(dashboard)/projects/new/page.tsx`: replaced the fake draft toast with real `localStorage` persistence plus a visible recall banner with `Load Draft` and `Delete Draft` actions when the user returns to `/projects/new`.
  - `src/app/(dashboard)/projects/new/page.tsx`: clearing draft storage on successful project creation so stale drafts are not left behind.
- TDD evidence:
  - No focused RED test was added because this repo still lacks a targeted interaction test harness for this page-level form behavior.
  - RED: not produced for the reason above.
  - GREEN: `npm run lint`, `npm run build`, and `npm run typecheck` after the patch.
- Tests run:
  - `npm run lint` -> passed, with pre-existing `react-hooks/exhaustive-deps` warnings in other dashboard pages.
  - `npm run build` -> passed.
  - `npm run typecheck` -> passed after the completed build regenerated `.next/types`.
- Wiring verification evidence:
  - The progress-method select is still the source of truth for `progressMethod`, and the explanation cards are driven from `Form.useWatch('progressMethod', form)`.
  - Milestone table inputs still flow through `handleMilestoneChange`, which now contains the recalculation rules for amount and percentage edits.
  - `handleSaveDraft`, `handleLoadDraft`, and `handleDiscardDraft` are all wired to the bottom action bar and the top draft alert, using the shared `DRAFT_STORAGE_KEY`.
- Behavior changes and risk notes:
  - Save Draft is now local to the current browser via `localStorage`; it is not shared across users or devices.
  - Adding a milestone intentionally clears the prior payment allocation, which is destructive by design because the user requested a full redistribution.
  - Amount-driven percentage recalculation uses the milestone total as the denominator, so percentages always reflect the current payment-plan split.
- Follow-ups / known gaps:
  - If drafts need to be shared or persisted beyond the current browser, the next step would be a server-side draft API instead of `localStorage`.
  - If the team wants softer behavior for adding a milestone, the next change would be to preserve existing amounts and only clear percentages after an explicit confirmation.

## 2026-03-15 22:43:37 +0700
- Goal: Adjust the new-project milestone/add-method UX to match the latest direction and inspect the current role/login implementation.
- What changed:
  - `src/app/(dashboard)/projects/new/page.tsx`: changed `addMilestone` so it preserves existing milestone amounts and percentages and only appends a new blank row.
  - `src/app/(dashboard)/projects/new/page.tsx`: replaced the always-visible progress-method explanation cards with hover popups on each method option using `Popover` and an info icon.
  - `src/app/(dashboard)/projects/new/page.tsx`: updated the milestone guidance text to reflect the new non-destructive add-milestone behavior.
- TDD evidence:
  - No focused RED test was added because this repo still lacks a targeted interaction test harness for page-level client behavior.
  - RED: not produced for the reason above.
  - GREEN: `npm run lint`, clean `npm run build`, and `npm run typecheck` after regenerating `.next`.
- Tests run:
  - `npm run lint` -> passed, with pre-existing `react-hooks/exhaustive-deps` warnings in other dashboard pages.
  - `node -e "require('fs').rmSync('.next', { recursive: true, force: true })"` -> cleared stale build output.
  - `npm run build` -> passed after clean rebuild.
  - `npm run typecheck` -> passed after clean rebuild.
- Wiring verification evidence:
  - `Select` options for `progressMethod` now render through `renderProgressMethodLabel`, which attaches the hover popup to the actual method labels in the form control.
  - `addMilestone` still drives the milestone table row set and now appends without mutating existing allocations.
- Behavior changes and risk notes:
  - Users can keep their existing payment split when adding a new milestone.
  - Method explanations are now contextual and lower-noise, but require hover interaction to discover.
- Relevant auth/role analysis from inspected files:
  - `src/app/page.tsx` immediately redirects to `/dashboard`; there is no login page.
  - `src/components/layout/Header.tsx` shows a hardcoded current user (`สมศรี ว.`).
  - `src/components/layout/Sidebar.tsx` exposes `/executive` and `/admin` for everyone; there is no role-based menu filtering.
  - `src/app/(dashboard)/layout.tsx` has no auth/role guard.
  - `src/data/users.json` and `src/app/(dashboard)/admin/page.tsx` define/display mock roles (`System Admin`, `Project Manager`, `Engineer`, `Coordinator`, `Team Member`, `Executive`, `Consultant`), but those roles are not enforced anywhere in routing or API access.
  - `src/app/api/users/route.ts` is an open mock data endpoint with no authentication.
- Follow-ups / known gaps:
  - If you want real role-based login next, the first missing pieces are a login page, session storage, a current-user source of truth, route guards, and sidebar filtering by role.
