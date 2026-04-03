# Coding Log

Feature: `internal-vs-outsourced-project-evm-model`
Date: `2026-03-17 19:49:37 +0700`

Note: Auggie semantic search unavailable; plan is based on direct file inspection + exact-string searches.
Inspected files:
- `src/types/project.ts`
- `src/types/evm.ts`
- `src/app/(dashboard)/projects/new/page.tsx`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/evm/[projectId]/route.ts`
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/lib/evm-metrics.ts`
- `src/lib/project-progress-derivations.ts`
- `src/lib/project-bootstrap.ts`
- `src/lib/evm-store.ts`
- `src/lib/generated-project-data.ts`
- `src/data/projects.json`
- `src/data/evm-data.json`

## Plan Draft A

### Overview
Add an explicit project execution model that distinguishes `internal` projects from `outsourced_lump_sum` projects. Keep full cost-EVM only for internal projects, and switch outsourced projects to owner-side contract progress/payment tracking so NSM no longer pretends to know contractor internal `AC`.

### Files to Change
- `src/types/project.ts` - add execution model type and labels
- `src/types/evm.ts` - add owner-side paid/disbursed field semantics
- `src/data/projects.json` - seed execution models per project
- `src/data/evm-data.json` - convert seeded internal/outsourced snapshot shapes as needed
- `src/lib/generated-project-data.ts` - generate consistent snapshots for outsourced projects
- `src/lib/evm-store.ts` - normalize old/new snapshot records
- `src/lib/evm-metrics.ts` - branch formulas by execution model
- `src/lib/project-progress-derivations.ts` - make progress-page EVM summary execution-model aware
- `src/lib/project-bootstrap.ts` - initialize new projects with execution model and empty EVM state
- `src/app/(dashboard)/projects/new/page.tsx` - let PM/Admin choose execution model
- `src/app/api/projects/route.ts` - persist execution model on create
- `src/app/api/evm/[projectId]/route.ts` - validate snapshot payload by execution model
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` - branch UI/labels/cards/charts/tables by execution model
- `src/app/(dashboard)/projects/[id]/progress/page.tsx` - branch summary card by execution model
- `src/app/(dashboard)/projects/[id]/page.tsx` - overview KPI wording for outsourced projects
- `tests/e2e/project-evm-all-projects-consistency.spec.ts` - expand for both execution models
- `tests/e2e/project-bootstrap-empty-state.spec.ts` - assert new-project empty state remains coherent
- `tests/e2e/project-outsourced-evm-mode.spec.ts` - new outsourced-mode regression

### Implementation Steps
TDD sequence:
1. Add outsourced-mode E2E/spec coverage and confirm failure.
2. Add execution model to the project type and seed data.
3. Implement model-aware EVM derivation helpers.
4. Branch page/API behavior with the smallest passing changes.
5. Run focused Playwright, then lint/build/typecheck.

Functions / components:
- `deriveProjectExecutionModel(...)`
  Determines whether a project is `internal` or `outsourced_lump_sum`.
- `deriveInternalEvmMetrics(...)`
  Keeps current BAC/PV/EV/AC/CPI/EAC behavior for internal projects.
- `deriveOutsourcedContractMetrics(...)`
  Computes owner-side BAC/PV/EV/Paid/Remaining/Payment Gap/SPI without contractor-cost metrics.
- `buildProjectEvmViewModel(project, evmData)`
  Produces one UI-ready object for the EVM page and progress page.
- `normalizeEvmSnapshot(project, snapshot)`
  Keeps stored snapshots backward compatible while exposing correct labels/fields.

Expected behavior / edge cases:
- Internal projects keep current full EVM formulas.
- Outsourced projects do not show CPI/CV/EAC/VAC/TCPI.
- Outsourced projects show `Paid to Date`, `Remaining Payable`, and `Earned vs Paid Gap`.
- Brand-new internal/outsourced projects both show deliberate no-snapshot empty states.
- If an outsourced snapshot has no paid amount yet, treat it as `0`, not contractor cost.

### Test Coverage
- `tests/e2e/project-outsourced-evm-mode.spec.ts`
  - `shows owner-side payment labels for outsourced project`
  - `hides internal cost metrics for outsourced project`
  - `creates outsourced snapshot using paid-to-date field`
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - `internal projects match derived cost-EVM values`
  - `outsourced projects match derived owner-side values`
- `tests/e2e/project-bootstrap-empty-state.spec.ts`
  - `new internal project shows internal empty EVM state`
  - `new outsourced project shows outsourced empty EVM state`

### Decision Completeness
- Goal: model internal and outsourced projects correctly in EVM/progress surfaces
- Non-goals: contractor profitability modeling, procurement workflow redesign
- Success criteria:
  - Every project has an explicit execution model
  - Internal projects show full cost-EVM
  - Outsourced projects never label unknown contractor cost as `AC`
  - New project create flow supports both models
  - Seeded + brand-new projects pass E2E consistency checks
- Public interfaces:
  - Project create payload gains `executionModel`
  - EVM snapshot payload for outsourced projects accepts `paidToDate`
  - Project API responses include `executionModel`
- Edge cases / failure modes:
  - Missing execution model -> fail closed to `internal` only for legacy seeded data, then normalize on read
  - Outsourced snapshot missing payment -> treat as zero paid
  - Mixed legacy `ac` data -> normalize for display without dropping stored records
- Rollout & monitoring:
  - No flag; local mock-data migration only
  - Backout: revert to previous `ac`-only rendering
  - Watch E2E failures around seeded projects and new-project bootstrap
- Acceptance checks:
  - `npx playwright test tests/e2e/project-outsourced-evm-mode.spec.ts --reporter=line`
  - `npx playwright test tests/e2e/project-evm-all-projects-consistency.spec.ts --reporter=line`
  - `npm run lint && npm run build && npm run typecheck`

### Dependencies
- Existing Ant Design + ECharts components
- Existing EVM stores and project bootstrap flow

### Validation
- Check one internal project and one outsourced project manually on `/projects/[id]/s-curve`
- Create a new outsourced project and confirm the empty state shows no contractor-cost metrics

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `Project.executionModel` | `POST /api/projects` and project seed load | `src/app/api/projects/route.ts`, `src/data/projects.json` | in-memory `Project` objects |
| `EVM execution-mode derivation` | `/projects/[id]/s-curve`, `/projects/[id]/progress`, overview page | imports from `src/lib/evm-metrics.ts` and `src/lib/project-progress-derivations.ts` | in-memory `EVMDataPoint[]` |
| `Outsourced snapshot validation` | `POST /api/evm/[projectId]` | `src/app/api/evm/[projectId]/route.ts` | in-memory `EVMDataPoint[]` |
| `Create-project execution model field` | `/projects/new` submit | `src/app/(dashboard)/projects/new/page.tsx` -> `useCreateProject` -> `POST /api/projects` | request body |

### Decision-Complete Checklist
- No open decisions remain for the implementer.
- Every changed public interface is listed.
- Each behavior change has tests.
- Validation commands are scoped.
- Wiring table covers every new/changed component.

## Plan Draft B

### Overview
Keep the existing `EVMDataPoint` storage shape untouched and make the change primarily at the view-model layer. Use a new project-level execution model to reinterpret `ac` as `paidToDate` for outsourced projects, minimizing migration risk and file churn.

### Files to Change
- `src/types/project.ts`
- `src/data/projects.json`
- `src/lib/evm-metrics.ts`
- `src/lib/project-progress-derivations.ts`
- `src/lib/project-bootstrap.ts`
- `src/app/(dashboard)/projects/new/page.tsx`
- `src/app/api/projects/route.ts`
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
- `src/app/(dashboard)/projects/[id]/progress/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `tests/e2e/project-outsourced-evm-mode.spec.ts`
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`

### Implementation Steps
TDD sequence:
1. Add a failing outsourced-project E2E asserting no CPI/EAC/VAC/TCPI.
2. Add `executionModel` to projects and create flow.
3. Rework `evm-metrics.ts` to return a discriminated union view model.
4. Branch EVM/progress/overview rendering using that view model.
5. Run focused Playwright and repo gates.

Functions / components:
- `deriveEvmPresentationModel(project, evmData)`
  Returns either `internal` metrics or `outsourced` contract metrics with shared chart/table data.
- `getOutsourcedSnapshotPaid(snapshot)`
  Reads legacy `ac` as owner payment for outsourced projects.
- `getProjectExecutionModelLabel(...)`
  Central label helper for the create form and project header.

Expected behavior / edge cases:
- Existing seeded data remains readable without rewriting every snapshot.
- New outsourced projects still store no-snapshot EVM state cleanly.
- Snapshot create modal label changes based on project execution model.

### Test Coverage
- `tests/e2e/project-outsourced-evm-mode.spec.ts`
  - `outsourced project relabels AC as paid to date`
  - `outsourced project hides cost-efficiency cards`
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - `every project page matches derived mode-aware metrics`
- `tests/e2e/project-bootstrap-empty-state.spec.ts`
  - `new outsourced project empty state stays mode-aware`

### Decision Completeness
- Goal: fix user-facing semantics with minimal data-model churn
- Non-goals: backfilling historical contractor-cost data
- Success criteria:
  - No outsourced page shows unknown contractor cost as actual cost
  - Internal pages remain unchanged in meaning
  - New-project creation exposes execution model
- Public interfaces:
  - `Project.executionModel`
  - create-project form/API field
- Edge cases / failure modes:
  - legacy snapshots without explicit paid field -> interpreted from `ac`
  - missing execution model on old records -> default by seeded migration script/data
  - no snapshots -> same explicit empty state
- Rollout & monitoring:
  - local mock-only rollout
  - backout by removing execution-model branching
- Acceptance checks:
  - focused Playwright for internal + outsourced
  - lint/build/typecheck

### Dependencies
- Current stores/hooks/pages remain intact

### Validation
- Compare one internal and one outsourced project side by side
- Create an outsourced project and inspect snapshot modal labels

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `executionModel` | project create and project reads | `src/app/api/projects/route.ts`, `src/types/project.ts` | `Project` objects |
| `mode-aware EVM view model` | EVM page + progress page + overview | `src/lib/evm-metrics.ts`, `src/lib/project-progress-derivations.ts` | `EVMDataPoint[]` |
| `mode-aware create form` | `/projects/new` | `src/app/(dashboard)/projects/new/page.tsx` | request body |

### Decision-Complete Checklist
- No open design questions remain.
- The changed surface is narrow and named consistently.
- Tests cover each new behavior.

## Comparative Analysis & Synthesis

### Strengths
- Draft A is cleaner semantically and prepares for explicit `paidToDate`.
- Draft B is safer and smaller because it preserves the existing snapshot storage shape.

### Gaps
- Draft A touches more files and risks unnecessary data churn in a mock-data app.
- Draft B can leave storage semantics a bit muddy if not documented clearly.

### Trade-offs
- Draft A favors model purity.
- Draft B favors lower-risk delivery with faster consistency across pages.

### Compliance
- Both drafts follow repo conventions: direct file inspection, tests-first, no extra libraries, explicit API/UI changes.

## Unified Execution Plan

### Overview
Implement an explicit project `executionModel` and branch EVM/progress rendering by that model. Use the lower-risk Draft B storage strategy now: keep the existing snapshot shape, reinterpret snapshot `ac` as `paid to date` for outsourced lump-sum projects, and hide contractor-cost metrics that NSM cannot know.

### Files to Change
- `src/types/project.ts` - add `ProjectExecutionModel` and labels
- `src/data/projects.json` - seed each project as `internal` or `outsourced_lump_sum`
- `src/app/(dashboard)/projects/new/page.tsx` - add execution-model field, defaults, draft persistence
- `src/app/api/projects/route.ts` - persist execution model on create
- `src/lib/project-bootstrap.ts` - initialize new project with mode-aware empty EVM registry only
- `src/lib/evm-metrics.ts` - return discriminated union `internal` vs `outsourced`
- `src/lib/project-progress-derivations.ts` - mode-aware summary card values
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` - branch cards, charts, table labels, modal fields, analysis text
- `src/app/(dashboard)/projects/[id]/progress/page.tsx` - branch metric list/tagging
- `src/app/(dashboard)/projects/[id]/page.tsx` - replace CPI card with paid/remaining contract metric for outsourced mode
- `tests/e2e/project-outsourced-evm-mode.spec.ts` - new regression
- `tests/e2e/project-evm-all-projects-consistency.spec.ts` - extend matrix
- `tests/e2e/project-bootstrap-empty-state.spec.ts` - cover new outsourced project bootstrap

### Implementation Steps
TDD sequence:
1. Add failing Playwright coverage for outsourced EVM mode and new outsourced-project bootstrap.
2. Add `ProjectExecutionModel` to `Project` plus seed data and create-project field.
3. Refactor `evm-metrics.ts` into a discriminated union view model:
   - `internal`: `bac/pv/ev/ac/sv/cv/spi/cpi/eac/etc/vac/tcpi`
   - `outsourced`: `bac/pv/ev/paid/sv/spi/paymentGap/paidPercent/remainingPayable`
4. Update `s-curve/page.tsx` to consume that view model:
   - internal keeps existing layout
   - outsourced relabels AC to `Paid to Date`, replaces CPI/EAC/VAC card set and detail rows, keeps charts coherent
5. Update `progress/page.tsx` and `projects/[id]/page.tsx` so outsourced mode no longer shows CPI as if NSM knew contractor cost.
6. Run focused Playwright, then lint/build/typecheck.

Functions / components:
- `deriveProjectExecutionModel(project)`
  Reads the project’s execution model with a safe fallback for legacy records.
- `deriveEvmPresentationModel(project, evmData)`
  Produces one mode-aware data object for cards, charts, tables, and analysis copy.
- `deriveOutsourcedContractMetrics(bac, latestSnapshot)`
  Computes owner-side progress/payment metrics from `PV`, `EV`, and paid-to-date.
- `buildProgressEvmSummary(project, evmData)`
  Returns the correct metric set for the progress page without duplicating formulas.

Expected behavior / edge cases:
- Internal projects still show full EVM.
- Outsourced projects show contract value, earned value, paid-to-date, remaining payable, and SPI; they do not show CPI/CV/EAC/VAC/TCPI.
- The snapshot table and create modal relabel `AC` to `Paid to Date` for outsourced projects.
- No-snapshot empty states remain explicit for both modes.
- Legacy seeded snapshots remain valid without rewriting the underlying store.

### Test Coverage
- `tests/e2e/project-outsourced-evm-mode.spec.ts`
  - `outsourced project hides cost-efficiency metrics`
  - `outsourced project shows paid-to-date labels and values`
  - `outsourced snapshot creation uses paid field semantics`
- `tests/e2e/project-evm-all-projects-consistency.spec.ts`
  - `internal projects match full EVM derivation`
  - `outsourced projects match contract-progress derivation`
- `tests/e2e/project-bootstrap-empty-state.spec.ts`
  - `new outsourced project shows outsourced empty-state copy`
  - `new internal project keeps internal empty-state copy`

### Decision Completeness
- Goal: represent internal and outsourced projects truthfully in EVM-related pages
- Non-goals:
  - contractor-side profit/cost analytics
  - procurement approval redesign
  - payment certificate workflow
- Success criteria:
  - Every project carries an explicit execution model
  - Outsourced projects never render unknown contractor cost as `AC`
  - Internal projects preserve existing EVM semantics
  - New projects can be created in either mode
  - Seeded + brand-new projects pass mode-aware E2E tests
- Public interfaces:
  - `Project.executionModel: 'internal' | 'outsourced_lump_sum'`
  - create-project API/body adds `executionModel`
  - EVM snapshot modal/API for outsourced projects labels the third field as `paid to date`
- Edge cases / failure modes:
  - missing `executionModel`: fail closed to `internal` for compatibility
  - outsourced snapshot with missing paid amount: treat as `0`
  - no snapshots: explicit empty-state copy, no fake metrics
  - invalid create payload: reject with `400`
- Rollout & monitoring:
  - mock-data only, no feature flag
  - backout: revert `executionModel` branching and labels
  - monitor focused Playwright specs and manual page smoke
- Acceptance checks:
  - `npx playwright test tests/e2e/project-outsourced-evm-mode.spec.ts --reporter=line`
  - `npx playwright test tests/e2e/project-evm-all-projects-consistency.spec.ts tests/e2e/project-bootstrap-empty-state.spec.ts --reporter=line`
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`

### Dependencies
- Existing project create flow
- Existing EVM hooks/stores
- Existing seeded project scenarios

### Validation
- Manual smoke:
  - one internal seeded project
  - one outsourced seeded project
  - one brand-new outsourced project
- Confirm cards, charts, tables, progress page, and overview all align with the chosen mode

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `Project.executionModel` | project list/detail reads and create flow | `src/types/project.ts`, `src/app/api/projects/route.ts`, `src/data/projects.json` | in-memory `Project` objects |
| `Mode-aware EVM derivation` | `/projects/[id]/s-curve`, `/projects/[id]/progress`, `/projects/[id]` | `src/lib/evm-metrics.ts`, `src/lib/project-progress-derivations.ts` | in-memory `EVMDataPoint[]` |
| `Create-project execution model field` | `/projects/new` submit | `src/app/(dashboard)/projects/new/page.tsx` -> `useCreateProject` -> `POST /api/projects` | request body |
| `Outsourced snapshot relabeling` | EVM snapshot modal and table | `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`, `src/app/api/evm/[projectId]/route.ts` | in-memory `EVMDataPoint[]` |

### Decision-Complete Checklist
- No open decisions remain for the implementer.
- Every changed public interface is listed.
- Every behavior change has at least one test.
- Validation commands are concrete.
- Wiring coverage is explicit.

## Implementation Summary
- Added `executionModel` support across the project model and create flow:
  - `internal`
  - `outsourced_lump_sum`
- Split EVM derivation logic in `src/lib/evm-metrics.ts`:
  - internal projects keep full CPI/CV/EAC/VAC/TCPI cost tracking
  - outsourced lump-sum projects use owner-side contract tracking with `Paid to Date`, `Remaining Payable`, and `Earned vs Paid Gap`
- Updated seeded and generated project data so outsourced projects carry payment-style EVM snapshots, while planning-stage outsourced projects can start with zero snapshots.
- Updated the EVM page, progress page, and project overview so internal and outsourced projects render the correct metric family and copy.
- Fixed a brand-new outsourced-project bug where the EVM page could fall back to internal KPI cards before the first snapshot existed; the page now keys KPI rendering off the project execution model, not snapshot presence.
- Added / updated Playwright coverage for:
  - outsourced seeded project EVM mode
  - all-project EVM consistency
  - brand-new outsourced project EVM empty state
  - snapshot CRUD moved to a brand-new internal project to avoid mutating seeded fixtures during consistency tests

## Final Validation
- `npx playwright test tests/e2e/project-outsourced-evm-mode.spec.ts tests/e2e/project-bootstrap-empty-state.spec.ts tests/e2e/project-evm-all-projects-consistency.spec.ts --reporter=line` -> passed (`4 passed`)
- `npm run typecheck` -> passed
- `npm run lint` -> passed with pre-existing warnings in:
  - `src/app/(dashboard)/projects/[id]/issues/page.tsx`
  - `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build` -> passed


## Review (2026-03-18 20:37:52 +07) - system

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: entire system vs external demo specification DOCX
- Commands Run: read `AGENTS.md`, `CLAUDE.md`; extracted DOCX with `textutil`; inventoried app routes and API routes; inspected key page/API files for implemented behavior and stubs
- Sources: `AGENTS.md`, `CLAUDE.md`, `/Users/subhajlimanond/Library/CloudStorage/OneDrive-Personal/Personal/NSM/Chapter3_Mockup_Prototype_Complete.docx`, `src/app/**/page.tsx`, `src/app/api/**/route.ts`, selected hooks/components

### High-Level Assessment
- The current prototype covers the core authenticated shell, project creation, project overview, WBS/BOQ, Gantt, daily report, EVM, quality, risk, issues, documents, executive dashboard, admin shell, audit log, notifications, and evaluation.
- However, the DOCX claims materially broader coverage: 48 screens across 17 modules with 100% TOR fulfillment.
- As implemented today, several claimed screens are missing entirely, several are merged into broader pages instead of existing as dedicated screens, and multiple existing screens still expose mock-only or read-only behavior.
- The implemented app is strongest in the core project flow for seeded demos and project-scoped CRUD: team, WBS node creation, BOQ entry, Gantt CRUD, EVM snapshots, quality inspection CRUD, daily report CRUD, risk CRUD, and issue CRUD.
- The biggest drift areas are mobile, Kanban, report builder, stakeholder/resource modules, document upload/configuration control, SSO/integration, and admin/org-management write paths.

### Strengths
- Core route coverage exists for the main project-scoped workflow via `src/app/(dashboard)/projects/[id]/**`.
- Project shell and RBAC are real, with route/API guards in `middleware.ts`, `src/lib/project-access.ts`, and project-scoped APIs.
- Several project modules have working mock APIs and real UI write flows: team, WBS, BOQ, Gantt, daily reports, EVM snapshots, quality inspections, risks, and issues.
- Dashboard / executive / EVM logic has been tightened recently and is backed by Playwright coverage in `tests/e2e/*`.

### Key Risks / Gaps (severity ordered)
HIGH
- The DOCX overstates coverage. It claims 48 screens / 17 modules / 148 TOR requirements at 100%, but the implemented route inventory is substantially smaller: `find src/app -name 'page.tsx'` shows no routes for Kanban, report builder, stakeholder registry, resource/capacity management, mobile login/mobile daily report, or a digital-service-center integration UI.
- Several documented “screens” are only merged subsections, not dedicated screens. Examples:
  - WBS Tree + BOQ are combined on `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - QA/QC Checklist + Quality Gate Status + ITP are combined on `src/app/(dashboard)/projects/[id]/quality/page.tsx`
  - Organization Chart + User Management are tabs on `src/app/(dashboard)/admin/page.tsx`
- New Project Form is materially narrower than the spec. `src/app/(dashboard)/projects/new/page.tsx` supports basic project info, milestones, execution model, progress method, and draft save/load, but it does not implement the spec’s materials list, project calendar selection, methodology selector, work-template save/load, or pre-creation team invitation. The “Invite Member” action explicitly defers to after project creation at `src/app/(dashboard)/projects/new/page.tsx`.
- Change Request Management is mostly read-only. The page exists at `src/app/(dashboard)/projects/[id]/change-request/page.tsx`, but the backing API `src/app/api/change-requests/route.ts` only implements `GET`; there is no create/edit/approve workflow persisted through API writes.
- Document & Configuration Control is read-only at the API layer. `src/app/api/documents/[projectId]/route.ts` only has `GET`, while the UI still shows upload/folder affordances in `src/app/(dashboard)/projects/[id]/documents/page.tsx`. This is a spec/implementation mismatch for document upload, folder management, and configuration control.
- Admin write actions are largely non-persistent. `src/app/(dashboard)/admin/page.tsx` renders add/edit/delete/suspend buttons for org units and users, but `src/app/api/users/route.ts` is `GET` only and there are no POST/PATCH/DELETE admin APIs for users or org structure.

MEDIUM
- Mobile-specific flows in the DOCX are not present as mobile routes. There are no files under `src/app/(mobile)` even though `CLAUDE.md` documents that route group. The current daily report page is desktop route `/projects/[id]/daily-report`, not a mobile-specific screen.
- Daily Report does not implement the full scenario described in the DOCX. The create modal in `src/app/(dashboard)/projects/[id]/daily-report/page.tsx` captures date/weather/temperature/personnel/issues, but not WBS-linked quantity entry, photo capture/upload, GPS tagging, digital signature capture, or outbound email/send actions at create time.
- Gantt Chart is present and writable, but not all documented functions are implemented. `src/app/(dashboard)/projects/[id]/gantt/page.tsx` has create/edit/delete, approval link, and export button, but there is no drag-drop UI, no dependency editing UI, no critical-path visualization, and no real export implementation.
- Notifications are partially implemented. `src/app/(dashboard)/notifications/page.tsx` supports listing and marking read, but settings are local component state only; the API `src/app/api/notifications/route.ts` supports `GET` and mark-read `PATCH` only. No real Email/Mobile Push/LINE integration exists.
- Executive evaluation is read-only and hardcoded to one project. `src/app/(dashboard)/executive/evaluation/page.tsx` calls `useEvaluation('proj-005')`, so it is not a generic project evaluation workflow matching the broader spec.
- Approval page is effectively static/mock. `src/app/(dashboard)/projects/[id]/approval/page.tsx` contains hardcoded attachment data and local success/warning messages for approve/reject/comment, not persisted approval actions.
- Integration / SSO in the DOCX is not implemented as actual enterprise integration. Login is still a mock user picker in `src/components/auth/LoginScreen.tsx`, not real SSO.

LOW
- `CLAUDE.md` still describes some directories/screens that do not exist on disk, including `src/app/(mobile)` and `src/components/kanban/`, which adds internal doc drift on top of the external DOCX drift.
- Some export/print/share affordances across screens appear as placeholders without backing handlers or APIs (EVM export/drill-down, Gantt export, risk export, approval downloads, evaluation save/share).

### Nit-Picks / Nitty Gritty
- `git rev-parse --show-toplevel` resolves to `/Users/subhajlimanond`, not the project directory, because the repo lives inside a larger git root. Operationally the project-local `.codex/coding-log.current` still works, but tooling assumptions can drift.
- `git log` on branch `main` fails because the outer git root has no commits on that branch; this makes git-context review weaker than normal.
- The prototype has good e2e coverage for some core flows, but almost none for the missing/partial spec areas, which is consistent with the implementation gaps.

### Tactical Improvements (1–3 days)
1. Rewrite the Chapter 3 coverage statement to reflect the current prototype honestly: implemented, partial, missing.
2. Add a route/feature matrix document in-repo that maps each TOR screen to one of: implemented, merged, stubbed, missing.
3. Remove or label placeholder buttons on existing pages when no backing API exists, especially documents, exports, approval actions, and admin CRUD.
4. Implement the smallest missing high-value surfaces if the demo depends on them: report builder, stakeholder registry, or mobile daily report wrapper.
5. Make evaluation route project-aware instead of hardcoded to `proj-005`.

### Strategic Improvements (1–6 weeks)
1. Normalize the product model around “module coverage states” so each module explicitly declares read-only demo vs CRUD demo vs not implemented.
2. Consolidate document, approval, and notification workflows so visible UI actions always correspond to actual backend mutations.
3. Build a thin mobile route group or responsive wrappers for the few demo-critical mobile scenarios rather than claiming a separate mobile app flow that does not exist.
4. Add a spec-conformance Playwright smoke matrix keyed to the claimed demo scenarios.

### Big Architectural Changes (only if justified)
- Proposal: Introduce a formal `demo-capability registry` per module/screen.
  - Pros:
  - Makes spec-vs-implementation drift explicit.
  - Lets the UI hide or relabel unavailable capabilities automatically.
  - Simplifies bid-demo readiness reporting.
  - Cons:
  - Adds one more metadata layer to maintain.
  - Migration Plan:
  - Start with a static TypeScript map for current screens.
  - Use it to drive badges and disable unsupported actions.
  - Extend it later into docs generation and automated checks.
  - Tests/Rollout:
  - Add one unit test that every routed screen has a capability entry.
  - Add one review-time report that compares the map to the spec matrix.

### Open Questions / Assumptions
- I treated the DOCX as the target demo specification and the current codebase as the source of truth for “implemented today”.
- I counted merged pages separately from dedicated screens because the user explicitly asked whether all screens in the document are available.
- I did not count hidden static/demo buttons as “functions available” unless there was a corresponding persisted or meaningful mock action in page code or API code.

## Review (2026-03-18 21:17:35 +0700) - system

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main
- Scope: current implemented screens and functions gap matrix
- Commands Run: `git rev-parse --show-toplevel`, `git branch --show-current`, `cat .codex/coding-log.current`, prior route/API/file inspection from the current review session
- Sources: `AGENTS.md`, `CLAUDE.md`, `src/app/**/page.tsx`, `src/app/api/**/route.ts`, key hooks/stores/components previously inspected

### High-Level Assessment
- The app has a solid core around internal project execution: dashboard, project shell, team, WBS/BOQ, Gantt, daily report, EVM, quality, risk, issues, documents, executive, admin, and notifications.
- The main remaining problem is not missing navigation but uneven depth: a subset of screens have real CRUD and data propagation, while several others are still read-heavy or UI-deep but API-thin.
- The strict gap matrix should therefore be organized by current modules rather than the older DOCX screen taxonomy.
- Highest-value gaps remain admin writes, document writes, change-request workflow writes, and a few deeper project-management flows like approval/resource/stakeholder/report-builder.

### Strengths
- Core project lifecycle and project-scoped routing are present.
- Team, WBS/BOQ, Gantt, daily report, EVM, quality inspections, risk, and issues all have meaningful implemented behavior.
- Role-based access and project visibility are materially stronger than before.

### Key Risks / Gaps (severity ordered)
HIGH
- Admin page renders management actions, but users/org write APIs are still missing, so operational admin workflows remain mock-only. Evidence: `src/app/(dashboard)/admin/page.tsx`, `src/app/api/users/route.ts`.
- Documents page presents upload/folder affordances without write APIs, so document control is not functionally complete. Evidence: `src/app/(dashboard)/projects/[id]/documents/page.tsx`, `src/app/api/documents/[projectId]/route.ts`.
- Change Requests page exists, but workflow persistence is read-only. Evidence: `src/app/(dashboard)/projects/[id]/change-request/page.tsx`, `src/app/api/change-requests/route.ts`.

MEDIUM
- Approval/evaluation remain mock/read-heavy versus the rest of the project shell. Evidence: `src/app/(dashboard)/projects/[id]/approval/page.tsx`, `src/app/(dashboard)/executive/evaluation/page.tsx`.
- Daily Report does not yet capture the richer field set implied by field/mobile workflows (photos/GPS/signature/WBS quantity at creation time). Evidence: `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`.
- Gantt lacks dependency editing, drag-drop, and richer baseline/critical-path controls. Evidence: `src/app/(dashboard)/projects/[id]/gantt/page.tsx`.

LOW
- Internal docs still mention some structures not present on disk, which can mislead future agent work. Evidence: `CLAUDE.md` vs current `src/app` tree.

### Tactical Improvements (1–3 days)
1. Add POST/PATCH/DELETE APIs for users/org management and wire admin actions to them.
2. Implement document upload/folder CRUD against the existing project access model.
3. Add create/update/approve transitions for change requests.
4. Tighten daily report capture with photo/GPS/signature-first fields.

### Strategic Improvements (1–6 weeks)
1. Normalize remaining read-heavy modules into the same “real store + real API + tested UI” pattern used by Gantt/EVM/Team.
2. Split large consolidated pages where domain complexity now justifies standalone screens or route-level ownership.
3. Reconcile `CLAUDE.md` and AGENTS guidance with the actual route map so architecture docs stop overstating implemented scope.

### Open Questions / Assumptions
- The matrix below treats current routes as the source of truth, not the old DOCX taxonomy.
- “Implemented” means meaningful user-facing behavior with backing API/store logic, not just a visible page.

## Implementation (2026-03-18 22:00:13 +0700) - current-implementation-tracker

### Goal
- Turn the earlier review into a repo-local implementation tracker organized by the current app modules, APIs, and E2E coverage.

### What Changed
- Added `CURRENT_IMPLEMENTATION_TRACKER.md` at repo root.
- Documented current route inventory, per-module gap matrix, API completion matrix, test coverage matrix, recommended delivery batches, and module definition of done.
- Grounded the tracker in current routes/APIs rather than the older DOCX taxonomy.

### TDD Evidence
- RED: not applicable. This was a documentation/tracker change, not a product-code behavior change.
- GREEN: not applicable for the same reason.

### Tests Run
- No app tests were run. Verification was limited to direct file inspection and reading the new tracker file back from disk.

### Wiring Verification Evidence
- Route inventory sourced from `find src/app -name 'page.tsx'`.
- API inventory sourced from `find src/app/api -name 'route.ts'` and `rg -n "export async function (GET|POST|PATCH|PUT|DELETE)" src/app/api -g 'route.ts'`.
- Existing E2E coverage sourced from `find tests/e2e -maxdepth 1 -type f -name '*.spec.ts' | sort`.

### Behavior Changes and Risk Notes
- No runtime behavior changed.
- The tracker should now make implementation sequencing and missing backend writes much clearer for subsequent coding turns.

### Follow-ups / Known Gaps
- Highest-value next batches remain Documents CRUD, Change Request workflow, and Admin writes.
- Auggie was skipped for this turn because the environment cannot guarantee a real 2-second timeout; analysis was based on direct file inspection and exact-string search.

## 2026-03-18 23:09:01 +07 - Batch 1 implementation: Documents CRUD, Change Request workflow, Admin writes

### Goal
Implement the first tracker batch end to end:
- Documents CRUD for project document libraries
- Change Request create/update approval workflow
- Admin org/user write APIs and UI wiring

### Auggie / Context
- Auggie was intentionally skipped.
- Reason: the environment cannot guarantee a real 2-second timeout, and this work proceeded by direct file inspection plus exact-string searches.

### What Changed
- `src/lib/document-store.ts`
  - Added persistent project document initialization plus folder/file/version create and delete helpers.
  - Recalculated folder/file counts after mutations so UI summary state stays coherent.
- `src/app/api/documents/[projectId]/route.ts`
  - Added `POST` write actions for folder creation, file upload metadata, and version upload.
  - Added `DELETE` write actions for folder/file removal.
  - Added audit-log writes for document operations.
- `src/hooks/useDocuments.ts`
  - Added folder create, file upload, version upload, and delete mutations.
- `src/app/(dashboard)/projects/[id]/documents/page.tsx`
  - Wired real create-folder, upload-document, upload-version, and delete flows.
  - Removed hardcoded version/file assumptions and made the selected file drive the version panel.
  - Added accessibility labels needed for stable Playwright coverage.
- `src/lib/change-request-store.ts`
  - Added create and update helpers for change requests.
- `src/app/api/change-requests/route.ts`
  - Added `POST` create flow and `PATCH` status workflow updates.
  - Persisted workflow history, approver metadata, and audit logs.
- `src/hooks/useChangeRequests.ts`
  - Added create and status-update mutations.
- `src/app/(dashboard)/projects/[id]/change-request/page.tsx`
  - Added create modal, real approve/return actions, and live summary refresh.
  - Removed read-only assumptions so selected rows drive detail rendering.
- `src/lib/user-store.ts`
  - Added mutable user store to support admin writes and runtime auth consistency.
- `src/lib/org-structure-store.ts`
  - Added mutable org structure store with create/update/delete helpers.
- `src/lib/audit-log-store.ts`
  - Added mutable audit log store and append helper.
- `src/lib/project-access.ts`
  - Switched user reads to the mutable user store so role/access checks reflect admin writes.
- `middleware.ts`
  - Switched auth lookups to the mutable user store.
- `src/app/api/auth/login/route.ts`
  - Switched auth lookups to the mutable user store so suspended users cannot log in after admin action.
- `src/app/api/auth/session/route.ts`
  - Switched session resolution to the mutable user store.
- `src/app/api/users/route.ts`
  - Added `POST` create-user and `PATCH` update/suspend flows.
  - Kept derived project counts and added audit logging.
- `src/app/api/org-structure/route.ts`
  - Added `POST`, `PATCH`, and `DELETE` org-unit writes.
  - Guarded delete when units still have children or assigned users.
  - Derived `userCount` from the mutable user store and added audit logging.
- `src/app/api/audit-logs/route.ts`
  - Switched to mutable audit store.
- `src/hooks/useUsers.ts`
  - Added create/update mutations for admin UI.
- `src/hooks/useOrgStructure.ts`
  - Added create/update/delete mutations for admin UI.
- `src/app/(dashboard)/admin/page.tsx`
  - Wired add/edit org unit, add/edit user, and suspend/activate flows.
  - Added modal labels and selected-unit refresh behavior.
- `tests/e2e/batch1-documents-change-request-admin.spec.ts`
  - Added end-to-end coverage for the new documents, change request, and admin write flows.

### TDD Evidence
- Added/changed tests:
  - `tests/e2e/batch1-documents-change-request-admin.spec.ts`
- RED command:
  - `npx playwright test tests/e2e/batch1-documents-change-request-admin.spec.ts --reporter=line`
- RED failure reasons observed during the first failing runs:
  - no create-folder dialog / documents write path was missing
  - no create change request action or approval persistence
  - no add-org-unit dialog and no admin write path
- GREEN commands:
  - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch1-documents-change-request-admin.spec.ts --reporter=line`
  - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`

### Tests Run
- `npm run lint`
  - Passed with existing repo warnings only in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`.
- `npm run build`
  - Passed.
- `npm run typecheck`
  - Passed after `build` regenerated `.next/types`.
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch1-documents-change-request-admin.spec.ts --reporter=line`
  - Passed: `3 passed`.
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - Passed: `4 passed`.

### Wiring Verification Evidence
- Documents runtime wiring:
  - UI mutations in `src/app/(dashboard)/projects/[id]/documents/page.tsx`
  - hooks in `src/hooks/useDocuments.ts`
  - API handler in `src/app/api/documents/[projectId]/route.ts`
  - backing persistence in `src/lib/document-store.ts`
- Change Request runtime wiring:
  - UI actions in `src/app/(dashboard)/projects/[id]/change-request/page.tsx`
  - hooks in `src/hooks/useChangeRequests.ts`
  - API handler in `src/app/api/change-requests/route.ts`
  - backing persistence in `src/lib/change-request-store.ts`
- Admin runtime wiring:
  - UI actions in `src/app/(dashboard)/admin/page.tsx`
  - hooks in `src/hooks/useUsers.ts` and `src/hooks/useOrgStructure.ts`
  - APIs in `src/app/api/users/route.ts` and `src/app/api/org-structure/route.ts`
  - shared mutable stores in `src/lib/user-store.ts` and `src/lib/org-structure-store.ts`
  - auth/session integration in `src/app/api/auth/login/route.ts`, `src/app/api/auth/session/route.ts`, `middleware.ts`, and `src/lib/project-access.ts`

### Behavior Changes and Risk Notes
- Documents are now writable in the prototype instead of read-only mock shelves.
- Change Requests now support a real create/approve/return lifecycle in the prototype.
- Admin actions now mutate users/org units at runtime, and suspending a user affects subsequent login/session checks.
- Audit log entries are now appended for these new write actions.
- `typecheck` still depends on `.next/types`; running it before a successful build can fail with missing generated files.

### Follow-ups / Known Gaps
- The org-unit delete action is not yet wired in the admin UI, even though the API/hook exists.
- Newly created users do not yet appear everywhere that still reads directly from static `users.json`, especially the login picker and project-team invite candidate list.
- Existing hook dependency warnings remain in `issues` and `risk` pages and were not part of this batch.

## 2026-03-18 13:20 ICT - Batch 2 consistency: mutable users, richer daily reports, and Gantt predecessors

### Goal
Close the next implementation batch after Batch 1 by fixing two remaining consistency gaps and extending two project workflows:
- make newly created/suspended users visible to the login picker and project-team invite candidates from the mutable runtime store
- enrich Daily Report creation so it captures structured personnel, activities, photos, and signatures
- add editable/persisted Gantt predecessor dependencies
- keep prior Batch 1 and project-shell regressions green after the new wiring

### What Changed
- `src/app/api/auth/login-options/route.ts`
  - Added a public runtime-backed login-candidate endpoint using the mutable user store.
  - Derived `projectCount` and `canLogin` from current memberships instead of static `users.json`.
- `src/hooks/useLoginCandidates.ts`
  - Added a query hook for the login picker.
- `src/components/auth/LoginScreen.tsx`
  - Switched the login picker from static fixture data to live runtime candidates.
  - Disabled users with no project duties and surfaced the correct explanatory state.
  - Fixed the missing `User` type import caught by production build.
- `src/app/api/team/[projectId]/route.ts`
  - Reworked team-member and invite-candidate reads to use the mutable user store.
  - Added `?mode=candidates` support so invite options stay aligned with admin-created users.
- `src/hooks/useProjectTeam.ts`
  - Added `useProjectTeamInviteCandidates(projectId)` and candidate cache invalidation after add/remove actions.
- `src/app/(dashboard)/projects/[id]/team/page.tsx`
  - Switched invite candidates from static fixtures to the new runtime query.
- `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
  - Expanded the create modal to support linked WBS, structured personnel, structured activities, structured photos, reporter/inspector identity, and signature toggles.
  - Added accessible labels used by Playwright.
  - Fixed a hidden validation problem by starting repeatable sections as empty arrays instead of pre-seeding blank invalid rows.
  - Added a just-created-report selection path so the newly created report can be selected immediately.
- `src/app/api/daily-reports/route.ts`
  - Normalized structured personnel/activity/photo payloads, generated photo ids when needed, and derived total personnel from the submitted personnel list.
- `src/types/gantt.ts`
  - Extended `GanttTaskInput` with `predecessorIds`.
- `src/app/api/gantt/[projectId]/route.ts`
  - Added predecessor validation and persistence.
  - Replaced incoming dependency links for the edited task based on selected predecessors.
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - Added predecessor editing in the task modal and visible dependency labels on task rows.
- `tests/e2e/batch2-user-daily-report-gantt.spec.ts`
  - Added end-to-end coverage for runtime user consistency, rich Daily Report creation, and Gantt predecessor persistence.
- `tests/e2e/project-create-and-shell.spec.ts`
  - Updated the Daily Report portion of the shell regression to use the richer current modal instead of the removed direct `totalPersonnel` field.

### TDD Evidence
RED:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch2-user-daily-report-gantt.spec.ts --reporter=line`
- Initial failures exposed three gaps:
  - login picker and team invite candidates were still tied to static fixture data
  - richer Daily Report creation was not fully wired and later hit hidden form-validation failures from blank seeded rows
  - Gantt predecessor editing/persistence was missing
- Additional RED during regression verification:
  - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - Failure reason: the older shell spec still tried to fill a removed `จำนวนบุคลากร` field in the Daily Report modal
- Build RED:
  - `npm run build`
  - Failure reason: `src/components/auth/LoginScreen.tsx` referenced `User` in `LoginResponse` without importing the type
- Typecheck RED while build artifacts were not yet available:
  - `npm run typecheck`
  - Failure reason: `.next/types/**/*.ts` not found because `typecheck` was run before a fresh successful build regenerated Next types

GREEN:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch2-user-daily-report-gantt.spec.ts --reporter=line`
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line`
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch1-documents-change-request-admin.spec.ts --reporter=line`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

### Tests Run
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch2-user-daily-report-gantt.spec.ts --reporter=line` -> passed (`3 passed`)
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-create-and-shell.spec.ts --reporter=line` -> passed (`4 passed`)
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch1-documents-change-request-admin.spec.ts --reporter=line` -> passed (`3 passed`)
- `npm run lint` -> passed with pre-existing React hook dependency warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build` -> passed
- `npm run typecheck` -> passed after the successful build regenerated `.next/types`

### Wiring Verification Evidence
- Login picker runtime wiring:
  - `LoginScreen` -> `useLoginCandidates()` -> `/api/auth/login-options`
- Team invite candidate runtime wiring:
  - `TeamPage` -> `useProjectTeamInviteCandidates(projectId)` -> `/api/team/[projectId]?mode=candidates`
- Rich Daily Report persistence:
  - create modal submit -> `useCreateDailyReport()` -> `POST /api/daily-reports` -> normalized report store payload
- Gantt predecessors:
  - task modal `predecessorIds` -> `PATCH /api/gantt/[projectId]` -> link replacement in the gantt store -> visible dependency labels after reload

### Behavior Changes and Risk Notes
- Newly created active users now show up on the login screen and in project-team invite candidates without requiring a static fixture edit.
- Users with zero required project duties are visible but cannot log in from the picker.
- Daily Report creation now captures materially richer site-report structure and derives personnel totals from the entered personnel rows.
- Gantt dependency editing now persists predecessor links, but still uses the existing simple link-type model (`type: '0'`) rather than richer dependency semantics.
- Fail-open/fail-closed notes:
  - login eligibility remains fail-closed for duty-less users
  - invite candidates remain filtered to active users not already assigned to the project

### Follow-ups / Known Gaps
- `issues` and `risk` pages still have pre-existing React hook dependency warnings.
- Gantt predecessors currently support only the simple predecessor link model; richer link types and lag are not implemented.
- Daily Report detail for newly created reports is selectable immediately, but the page is still optimized for prototype/demo usage rather than a full workflow history tool.
- Auggie semantic search was intentionally skipped because a true 2-second timeout could not be enforced in this environment; the work was based on direct file inspection plus targeted exact-string searches.

## 2026-03-19 17:36 ICT

### Goal
- Improve the next three operational gaps in detail:
  - richer Gantt dependency semantics
  - remove the lingering `issues` / `risk` hook warnings
  - make Daily Report behave more like an operational history workflow

### What Changed
- `src/types/gantt.ts`
  - Added explicit dependency link types (`FS`, `SS`, `FF`, `SF`) and `lagDays`.
  - Added structured predecessor input support for task create/edit payloads.
- `src/lib/gantt-store.ts`
  - Normalized legacy seeded links into the richer dependency model and defaulted missing lag to `0`.
- `src/app/api/gantt/[projectId]/route.ts`
  - Accepted and validated structured predecessors, persisted link type + lag, and remained backward-compatible with older payloads.
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - Replaced the simple predecessor picker with row-based dependency editing.
  - Each row now captures predecessor task, link type, and lag days.
  - Inline task rendering now shows dependency summaries such as `FS`, `SS +3 วัน`.
- `src/app/(dashboard)/projects/[id]/issues/page.tsx`
  - Removed the warning-prone fallback allocation pattern with a stable empty array constant and memoized normalization.
- `src/app/(dashboard)/projects/[id]/risk/page.tsx`
  - Applied the same warning-safe normalization pattern as `issues`.
- `src/types/daily-report.ts`
  - Added `statusHistory` as a first-class part of the Daily Report model.
- `src/hooks/useDailyReports.ts`
  - Added `useUpdateDailyReportStatus()` for workflow actions.
- `src/app/api/daily-reports/route.ts`
  - New reports now get an initial status-history entry.
- `src/app/api/daily-reports/[id]/route.ts`
  - Added `PATCH` for report workflow transitions (`submitted`, `approved`, `rejected`) and persisted status history.
  - Hardened body parsing to avoid empty-body JSON crashes.
- `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
  - Added report summary cards, search, status filter, workflow actions, and visible status-history rendering.
  - Added local selection refresh so status changes reflect immediately in the detail panel.
- `src/lib/generated-project-data.ts`
  - Updated generated Gantt links to the richer dependency model.
  - Added seeded `statusHistory` for generated Daily Reports so the stricter Daily Report type stays consistent at build time.
- `tests/e2e/batch2-user-daily-report-gantt.spec.ts`
  - Updated the older Gantt dependency test to the new dependency-row UI.
- `tests/e2e/batch3-daily-report-history-gantt-links.spec.ts`
  - Added end-to-end coverage for Daily Report workflow/history and richer Gantt link editing.

### TDD Evidence
RED:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch3-daily-report-history-gantt-links.spec.ts --reporter=line`
- Failure reasons:
  - Daily Report workflow actions/history were missing.
  - Gantt still exposed only the old predecessor UI.
- `npm run build`
- Failure reason:
  - `src/lib/generated-project-data.ts` did not populate required `statusHistory` for generated Daily Reports after the type change.

GREEN:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch3-daily-report-history-gantt-links.spec.ts --reporter=line`
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch2-user-daily-report-gantt.spec.ts --reporter=line`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

### Tests Run
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch3-daily-report-history-gantt-links.spec.ts --reporter=line` -> passed (`2 passed`)
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch2-user-daily-report-gantt.spec.ts --reporter=line` -> passed (`3 passed`)
- `npm run lint` -> passed
- `npm run build` -> passed
- `npm run typecheck` -> passed

### Wiring Verification Evidence
- Daily Report workflow wiring:
  - `DailyReportPage` action buttons -> `useUpdateDailyReportStatus()` -> `PATCH /api/daily-reports/[id]` -> persisted `statusHistory` -> refreshed selected report detail.
- Gantt dependency wiring:
  - dependency rows in the task modal -> structured `predecessors` payload -> `PATCH /api/gantt/[projectId]` -> stored link `type`/`lagDays` -> inline dependency summary after reload.
- Hook warning cleanup:
  - `issues` and `risk` pages now normalize query results through stable constants, and `npm run lint` completed without the previous warnings.

### Behavior Changes and Risk Notes
- Gantt now models dependency semantics more credibly, but still does not yet support graphical dependency editing or advanced constraint logic.
- Daily Report now supports a visible submit/review trail instead of a flat status-only record.
- Generated seed data is stricter and closer to runtime shape, reducing build-only drift.
- Fail-open/fail-closed notes:
  - Daily Report approval remains fail-closed to reviewer-capable users only.
  - Gantt dependency validation rejects unsupported link types or invalid lag payloads rather than silently storing malformed links.

### Follow-ups / Known Gaps
- Gantt still lacks advanced dependency UI such as drag-connect lines, lag visualization, and richer constraint editing.
- Daily Report is stronger operationally now, but attachments/photos are still metadata-only rather than real uploads.
- The next natural batch is deeper project workflow integrity across approval, documents, and change-management timelines.
- Auggie semantic search was intentionally skipped because a true 2-second timeout could not be enforced in this environment; the work was based on direct file inspection plus targeted exact-string searches.

## 2026-03-19 18:09 ICT

### Goal
- Replace Daily Report photo/attachment metadata stubs with a real mock upload flow:
  - actual file selection in the Daily Report create modal
  - multipart upload to the backend
  - persisted file references on the report
  - preview/download rendering in report detail

### What Changed
- `src/types/daily-report.ts`
  - Expanded `PhotoEntry` with persisted file metadata (`url`, `mimeType`, `sizeBytes`).
  - Added `AttachmentEntry`.
  - Added `attachments` to `DailyReport`.
- `src/lib/mock-upload-storage.ts`
  - Added a reusable file persistence helper that writes mock uploads under `public/mock-uploads/...` and returns stable URLs.
- `src/lib/daily-report-store.ts`
  - Normalized seeded/generated Daily Reports so older records still get `attachments: []` and keep working with the stricter model.
- `src/lib/generated-project-data.ts`
  - Added `attachments: []` to generated Daily Reports so the stricter type model stays aligned.
- `src/lib/api-client.ts`
  - Hardened fetch header handling and added proper FormData support without forcing JSON headers onto multipart requests.
- `src/hooks/useDailyReports.ts`
  - `useCreateDailyReport()` now supports both legacy JSON payloads and the new multipart FormData payload.
- `src/app/api/daily-reports/route.ts`
  - Added multipart parsing for Daily Report create.
  - Persisted uploaded photos and attachments to disk.
  - Built photo metadata from uploaded files plus per-photo GPS/timestamp values.
  - Returned saved file URLs in the report payload.
- `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
  - Replaced fake typed-in photo filenames with real file selection.
  - Added per-photo metadata editing after file selection.
  - Added real attachment selection.
  - Switched report creation to multipart upload.
  - Report detail now renders uploaded photos with actual image previews and attachment download links.
  - Replaced raw `<img>` with `next/image` to keep lint clean.
- `tests/e2e/batch4-daily-report-file-uploads.spec.ts`
  - Added new end-to-end coverage for real photo + attachment uploads.

### TDD Evidence
RED:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch4-daily-report-file-uploads.spec.ts --reporter=line`
- Failure reason:
  - the Daily Report create modal had no real upload controls or persisted file links; the test could not find the expected upload path.

GREEN:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch4-daily-report-file-uploads.spec.ts --reporter=line`
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch4-daily-report-file-uploads.spec.ts tests/e2e/batch3-daily-report-history-gantt-links.spec.ts tests/e2e/project-create-and-shell.spec.ts --reporter=line`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

### Tests Run
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch4-daily-report-file-uploads.spec.ts --reporter=line` -> passed (`1 passed`)
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/batch4-daily-report-file-uploads.spec.ts tests/e2e/batch3-daily-report-history-gantt-links.spec.ts tests/e2e/project-create-and-shell.spec.ts --reporter=line` -> passed (`7 passed`)
- `npm run lint` -> passed cleanly
- `npm run build` -> passed
- `npm run typecheck` -> passed

### Wiring Verification Evidence
- Daily Report modal upload wiring:
  - create modal file selection -> `FormData` in `handleCreateDailyReport()` -> `useCreateDailyReport()` -> `POST /api/daily-reports`
- Backend persistence wiring:
  - `POST /api/daily-reports` multipart branch -> `persistMockUpload()` -> files written under `public/mock-uploads/daily-reports/<projectId>/<reportId>/...`
- Report detail wiring:
  - returned `photo.url` / `attachment.url` -> rendered in `ReportDetail` as image preview and download/open links

### Behavior Changes and Risk Notes
- New Daily Reports can now carry real uploaded site photos and attachment files instead of fake filename-only metadata.
- Existing seeded reports still render correctly even though they do not have real uploaded files.
- Mock uploads are persisted on local disk under `public/mock-uploads`, so they survive page reloads during local development but remain prototype/local-only behavior.
- Fail-open/fail-closed notes:
  - the route still accepts legacy JSON report creation for compatibility
  - multipart uploads fail closed if the report lacks a valid `projectId`

### Follow-ups / Known Gaps
- Uploaded files are not yet deleted when a Daily Report would eventually be deleted; this can leave orphaned mock files on disk.
- Existing seeded Daily Report photos still use placeholder rendering because they were never uploaded through the new path.
- Signature capture is still status metadata, not uploaded or drawn signature assets.
- Auggie semantic search was intentionally skipped because a true 2-second timeout could not be enforced in this environment; the work was based on direct file inspection plus targeted exact-string searches.

## 2026-03-19 18:24 ICT

### Goal
- Eliminate milestone/date/status drift between the project overview screen and the Gantt module for all seeded projects.
- Ensure payment milestone cards, current milestone counters, and milestone API responses all derive from the same execution state.

### What Changed
- `src/lib/project-milestone-derivations.ts`
  - Added a shared derivation layer that maps stored milestone metadata to live Gantt execution state.
  - Due dates now come from matched Gantt tasks/phases.
  - Milestone statuses now derive from Gantt progress (`pending`, `in_progress`, `review`, `completed`).
  - Added `deriveCurrentMilestoneNumber()` for consistent project-level milestone counters.
- `src/app/api/milestones/[projectId]/route.ts`
  - Switched from returning raw milestone-store seed records to returning the Gantt-derived milestone view.
- `src/lib/project-execution-sync.ts`
  - Project summary sync now also updates `currentMilestone` and `totalMilestones` from the derived milestones.
- `src/app/(dashboard)/projects/[id]/page.tsx`
  - Overview screen now treats `review` as an active step.
  - Fixed stepper behavior for the all-pending case.
  - Current milestone and total milestone display now align with the milestone API/Gantt-derived state instead of stale seed counters.
- `tests/e2e/project-milestone-consistency.spec.ts`
  - Added all-project regression coverage to ensure milestone API due dates/statuses match Gantt execution rows.

### TDD Evidence
RED:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
- Failure reason:
  - milestone API returned `2026-04-30` for `proj-001` milestone 1 while the corresponding Gantt milestone/phase ended on `2026-02-03`.

GREEN:
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

### Tests Run
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line` -> passed (`1 passed`)
- `npm run lint` -> passed cleanly
- `npm run build` -> passed
- `npm run typecheck` -> passed

### Wiring Verification Evidence
- Overview milestone wiring:
  - `ProjectOverviewPage` -> `useMilestones(projectId)` -> `/api/milestones/[projectId]` -> `getDerivedMilestonesForProject()`
- Project summary counter wiring:
  - `/api/projects` and `/api/projects/[id]` call `syncProjectExecutionState(projectId)` -> derived milestone counts update `currentMilestone` and `totalMilestones`
- Shared source-of-truth wiring:
  - milestone API and project sync both resolve from live Gantt data via `project-milestone-derivations.ts`

### Behavior Changes and Risk Notes
- The overview page now follows Gantt as the source of truth for milestone schedule and execution state.
- This means some previously seeded milestone dates/statuses on the overview now change to match the actual Gantt plan, rather than preserving older static payment-schedule seeds.
- The fix is intentionally consistency-first: if Gantt and milestone seed metadata disagree, the UI now trusts the execution schedule in Gantt.
- Fail-open/fail-closed notes:
  - if a milestone cannot be matched by exact task name, the derivation falls back to the top-level phase by order
  - if no matching Gantt task exists at all, the raw stored milestone is returned unchanged

### Follow-ups / Known Gaps
- The underlying milestone seed JSON and Gantt seed JSON can still disagree historically; the runtime now hides that drift, but the fixtures themselves are not yet harmonized.
- If you want commercial/payment milestone semantics to differ from execution milestones, the app should model those as separate concepts instead of overloading one screen/API.
- Auggie semantic search was intentionally skipped because a true 2-second timeout could not be enforced in this environment; the work was based on direct file inspection plus targeted exact-string searches.
## 2026-03-19 20:20:59 +07

### Goal
Harmonize the raw milestone / Gantt fixture sources so the repo is internally consistent before runtime derivation, especially for project overview vs Gantt milestone dates and statuses.

### What Changed
- `src/data/milestones.json`
  - Corrected `proj-001` milestone due dates and statuses to match the seeded Gantt phase rows.
- `src/data/gantt-tasks.json`
  - Corrected `proj-001` top-level phase progress values so parent Gantt phases match their child task progress instead of stale seed values.
- `src/data/projects.json`
  - Corrected stale summary seed fields:
    - `progress` for `proj-001`..`proj-004`
    - `currentMilestone` for `proj-001`, `proj-002`, `proj-004`
    - `status` for `proj-004`
- `src/lib/generated-project-data.ts`
  - Added a shared helper to derive generated parent Gantt phase progress from child tasks.
  - Changed generated milestone building to derive due dates and statuses from generated Gantt data instead of stale scenario literals.
  - Updated scenario milestone literals for `proj-002`..`proj-005` so the source definitions themselves now match the generated schedule.
- `tests/e2e/project-milestone-consistency.spec.ts`
  - Expanded the regression to verify:
    - milestone API due dates and statuses match Gantt
    - parent Gantt phase progress matches child task progress
    - project `currentMilestone` matches milestone statuses

### TDD Evidence
- Added/changed test:
  - `tests/e2e/project-milestone-consistency.spec.ts`
- RED:
  - Command:
    - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
  - Failure reason before the fix:
    - `proj-001` milestone 1 due date from the milestone API was stale:
    - `Expected: 2026-02-03`
    - `Received: 2026-04-30`
- GREEN:
  - Command:
    - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`

### Tests Run
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
  - Passed
- `npm run lint`
  - Passed
- `npm run build`
  - Passed
- `npm run typecheck`
  - Passed

### Wiring Verification Evidence
- Overview milestone cards continue to read milestone data through:
  - `src/app/api/milestones/[projectId]/route.ts`
  - `src/app/(dashboard)/projects/[id]/page.tsx`
- Generated fixture consumers continue to read:
  - `generatedGanttDataByProject`
  - `generatedMilestones`
  - both now share the same derived schedule logic in `src/lib/generated-project-data.ts`

### Behavior Changes / Risks
- Static and generated milestone data now agree with the Gantt hierarchy before any runtime sync occurs.
- The raw seed summary fields in `projects.json` are more truthful, reducing confusing “first paint” differences before store synchronization.
- I intentionally did not change project `endDate` / `duration` or the static `proj-001` WBS parent progress rules in this pass, because those are broader modeling questions than the specific milestone/Gantt drift fixed here.

### Follow-ups / Known Gaps
- `projects.json` contract-level dates can still be later than the last generated Gantt milestone for some generated projects.
- `proj-001` WBS parent progress still follows its own weighted WBS seed model and does not match the simple average used by Gantt parent normalization.
- Auggie semantic retrieval was skipped for this task because the environment cannot enforce a real 2-second timeout; work was based on direct file inspection.

## 2026-03-19 20:26:41 +07

### Goal
Finish the remaining seed-model cleanup by making project-level `endDate` and `duration` match the actual seeded Gantt schedule for generated projects.

### What Changed
- `tests/e2e/project-milestone-consistency.spec.ts`
  - Added assertions that every project detail payload matches the actual seeded Gantt schedule:
    - `project.endDate === last top-level Gantt phase end_date`
    - `project.duration === inclusive day count from startDate to endDate`
- `src/data/projects.json`
  - Corrected generated-project contract summary dates:
    - `proj-002` -> `endDate: 2026-07-07`, `duration: 188`
    - `proj-003` -> `endDate: 2026-04-11`, `duration: 92`
    - `proj-004` -> `endDate: 2027-04-12`, `duration: 194`
    - `proj-005` -> `endDate: 2026-04-04`, `duration: 186`

### TDD Evidence
- Changed test:
  - `tests/e2e/project-milestone-consistency.spec.ts`
- RED:
  - Command:
    - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
  - Failure reason before the fix:
    - generated projects still exposed looser project end dates than their seeded Gantt schedule
    - example:
      - `Expected: 2026-07-07`
      - `Received: 2026-08-31`
      - for `proj-002`
- GREEN:
  - Command:
    - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`

### Tests Run
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
  - Passed
- `npm run lint`
  - Passed
- `npm run build`
  - Passed
- `npm run typecheck`
  - Passed

### Wiring Verification Evidence
- Project detail payload comes from:
  - `src/app/api/projects/[id]/route.ts`
- Gantt schedule source remains:
  - `src/app/api/gantt/[projectId]/route.ts`
  - `src/lib/generated-project-data.ts`
- The strengthened E2E now checks both surfaces together for every visible project.

### Behavior Changes / Risks
- Generated project summary metadata is now aligned with the actual seeded schedule shown in the app.
- This removes misleading “contract ends later than the seeded plan” contradictions in the raw repo data.

### Follow-ups / Known Gaps
- `proj-001` still has a broader distinction between weighted WBS summary progress and simple averaged Gantt parent progress.
- Auggie semantic retrieval was skipped again due the enforced non-blocking timeout policy; work was based on direct file inspection.

## 2026-03-19 21:26:17 +07

### Goal
Make WBS summary progress consistent with the Gantt store for all projects by using one weighted progress model instead of WBS weights vs Gantt simple averages.

### What Changed
- `src/lib/wbs-progress-normalization.ts`
  - Added a shared normalization helper that rolls WBS parent/root progress from child leaf progress using WBS weights.
- `src/lib/wbs-store.ts`
  - WBS store now normalizes every project's hierarchy on initialization, so level-1 and root summaries are correct before any Gantt edit occurs.
- `src/lib/gantt-store.ts`
  - Top-level Gantt phase progress now syncs from normalized level-1 WBS progress instead of simple child averaging.
- `src/lib/generated-project-data.ts`
  - Generated WBS nodes now normalize through the shared WBS helper.
  - Generated top-level Gantt phase progress now uses weighted child progress instead of plain averages.
- `src/data/wbs.json`
  - Corrected static `proj-001` WBS leaf, phase, and root progress to match seeded Gantt leaf task execution.
- `src/data/gantt-tasks.json`
  - Corrected static `proj-001` top-level phase progress to the weighted values.
- `src/data/projects.json`
  - Corrected seed `progress` values so project summaries align with the weighted WBS/Gantt model on first load.
- `tests/e2e/project-milestone-consistency.spec.ts`
  - Expanded the regression further to verify:
    - WBS leaf progress matches Gantt task progress
    - WBS level-1 summary matches top-level Gantt phases
    - WBS root matches the weighted rollup

### TDD Evidence
- Changed test:
  - `tests/e2e/project-milestone-consistency.spec.ts`
- RED:
  - Command:
    - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
  - Failure reason before the fix:
    - WBS summary progress still drifted from Gantt
    - example for `proj-001`:
      - `Expected: 81.66666666666667`
      - `Received: 95`
      - on level-1 summary progress
- GREEN:
  - Command:
    - `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`

### Tests Run
- `lsof -ti tcp:3101 | xargs -r kill; npx playwright test tests/e2e/project-milestone-consistency.spec.ts --reporter=line`
  - Passed
- `npm run lint`
  - Passed
- `npm run build`
  - Passed
- `npm run typecheck`
  - Passed

### Wiring Verification Evidence
- WBS API continues to serve the normalized store through:
  - `src/app/api/wbs/[projectId]/route.ts`
- Gantt API continues to serve the normalized store through:
  - `src/app/api/gantt/[projectId]/route.ts`
- The shared normalization now affects:
  - project overview via project sync
  - WBS page
  - Gantt page
  - progress-weighting views

### Behavior Changes / Risks
- WBS summary percentages are now lower for some projects because stale optimistic parent progress was replaced with weighted rollups from actual child execution.
- `proj-001` changed the most because its WBS phase 3 leaf progress had drifted away from the seeded Gantt task progress.

### Follow-ups / Known Gaps
- This fix intentionally treats the weighted WBS model as canonical for summary progress.
- If the team later wants Gantt tasks themselves to carry explicit weights, the current implicit WBS mapping should be replaced with first-class Gantt weights.
- Auggie semantic retrieval was skipped due the enforced non-blocking timeout policy; work was based on direct file inspection.

## 2026-03-19 23:57:00 +07

### Goal
Finish the interrupted mobile responsiveness work for the daily report screen and dashboard shell so the page remains usable on narrow viewports and the left navigation becomes a mobile drawer.

### What Changed
- `src/stores/useAppStore.ts`
  - Added `mobileSidebarOpen`, `toggleMobileSidebar`, and `closeMobileSidebar` so the shell can manage a drawer separately from desktop collapse state.
- `src/components/layout/Header.tsx`
  - Switched the header to breakpoint-aware behavior.
  - On mobile, the menu button now opens the drawer, the breadcrumb collapses to the current route title, and header spacing/text truncation are tightened for small widths.
- `src/components/layout/Sidebar.tsx`
  - Added a mobile `Drawer` rendering path in place of the fixed `Sider`.
  - Closed the drawer on route changes, menu clicks, and logout so the shell does not trap the user after navigation.
  - Kept the desktop collapsed sidebar behavior intact.
- `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
  - Made the page breakpoint-aware with stacked header/filter controls and full-width mobile actions.
  - Reduced modal body padding on mobile and constrained the create-report dialog height so long forms remain scrollable.
  - Converted dense form rows to responsive `Col xs/sm/md` layouts for activities, photo metadata, and signatures.
  - Added horizontal table scrolling for report list, personnel, and activity tables instead of letting the page clip.
  - Tightened photo sizing and detail-card spacing so the report detail remains readable on a phone viewport.

### TDD Evidence
- Changed test:
  - `tests/e2e/daily-report-mobile-responsive.spec.ts`
- RED:
  - Could not reproduce a product-level RED in this resumed turn because the interrupted worktree already contained the in-progress responsive patch when I resumed.
  - I did reproduce non-product failures by mistakenly running Playwright and `next build` concurrently; that corrupted the shared `.next` output and caused transient `/login` runtime errors. Those were runner-contention artifacts, not app regressions.
- GREEN:
  - `npx playwright test tests/e2e/daily-report-mobile-responsive.spec.ts --project=chromium`

### Tests Run
- `npx playwright test tests/e2e/daily-report-mobile-responsive.spec.ts --project=chromium`
  - Passed
- `npx playwright test tests/e2e/batch3-daily-report-history-gantt-links.spec.ts -g "daily reports support draft -> submitted -> approved workflow with visible history" --project=chromium`
  - Passed
- `npx playwright test tests/e2e/batch4-daily-report-file-uploads.spec.ts --project=chromium`
  - Passed
- `npx playwright test tests/e2e/project-create-and-shell.spec.ts -g "PM can create a project, add WBS, and stay in the new project context across LHS menus" --project=chromium`
  - Passed
- `npm run typecheck`
  - Passed
- `npm run lint`
  - Passed
- `npm run build`
  - Passed

### Wiring Verification Evidence
- Mobile shell state now flows:
  - `src/components/layout/Header.tsx` -> `useAppStore.toggleMobileSidebar`
  - `src/components/layout/Sidebar.tsx` -> `useAppStore.mobileSidebarOpen` / `closeMobileSidebar`
- The dashboard shell keeps mobile content flush with the viewport because the existing layout already sets `marginLeft = 0` on mobile and now renders the drawer path instead of a fixed sider.
- Daily report runtime coverage is exercised through:
  - route `src/app/(dashboard)/projects/[id]/daily-report/page.tsx`
  - shell navigation in `tests/e2e/daily-report-mobile-responsive.spec.ts`
  - create/history/upload flows in the daily-report Playwright specs above.

### Behavior Changes / Risks
- On mobile widths, the authenticated shell no longer shows the fixed left sidebar; users open navigation via the header button and interact through a drawer.
- Daily report tables now prefer horizontal scrolling over squashing columns, which preserves readability but still depends on Ant Design table scroll behavior.
- No data model or API behavior changed; the work is presentation and shell-state wiring only.

### Follow-ups / Known Gaps
- The mobile drawer behavior is implemented in the shared dashboard shell, so other project pages benefit, but only the daily report route has focused mobile E2E coverage right now.
- Several existing components in this repo still use hardcoded inline colors inherited from earlier work; this change did not attempt a broader token cleanup.
