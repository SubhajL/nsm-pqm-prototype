## Plan Draft A

### Overview
- Implement a shared client-side export layer that supports two practical document outputs for this prototype: printable HTML reports for `PDF` actions and Excel-compatible spreadsheet HTML for `Excel` actions. Wire that layer into every existing page with export buttons so each page exports the data and layout that matches its audience and purpose.
- Keep the implementation frontend-only and based on currently loaded page data. Avoid inventing new persistence or server-side report generation, since this is a mock/demo app and the current pages already hold enough data to produce useful artifacts.

### Files to Change
- `src/lib/export-utils.ts`
  - Shared browser-side download/print helpers, document section types, and HTML builders.
- `src/lib/export-formatters.ts`
  - Shared money/date/percent/string formatting helpers used by exports.
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - Wire `Export Excel` for current WBS context and selected-node BOQ.
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - Wire `Export PDF` for a printable schedule report.
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
  - Wire `Export PDF` and `Export Excel` for EVM.
- `src/app/(dashboard)/projects/[id]/risk/page.tsx`
  - Wire `Export PDF` and `Export Excel` for risk register.
- `src/app/(dashboard)/executive/page.tsx`
  - Wire the executive PDF briefing button.
- `src/app/(dashboard)/admin/page.tsx`
  - Wire `Export รายชื่อ` for current department users.
- `tests/e2e/project-export-workflows.spec.ts`
  - Focused export wiring regression for visible export triggers and download/print behavior.

### Implementation Steps
- TDD sequence:
  1) Add export workflow regression tests for the most important page/button paths.
  2) Run the focused tests and confirm they fail because export buttons have no handlers.
  3) Implement the shared export utility with the smallest browser-safe API.
  4) Wire pages one by one, re-running the focused test after each slice.
  5) Run `typecheck`, `lint`, `build`, and the focused e2e suite.

- `downloadFile(filename, content, mimeType)`
  - Create a Blob, object URL, and synthetic anchor click to download a file.
- `openPrintableReport(documentConfig)`
  - Open a new window with print-oriented HTML, Thai-friendly typography, metadata rows, summary cards, and tabular sections, then trigger `print()`.
- `downloadSpreadsheetReport(documentConfig)`
  - Build Excel-compatible HTML with strong table structure and section headers, then download as `.xls`.
- `buildExecutiveExportDocument(projects)`
  - Landscape portfolio briefing with KPI summary, status table, budget table, and project highlight bullets.
- `buildWbsExportDocument(project, wbsNodes, selectedNode, boqItems, stats)`
  - Excel-style document for WBS hierarchy plus currently selected BOQ detail and totals.
- `buildGanttExportDocument(project, ganttTasks, evaluationDate)`
  - Landscape schedule report with project metadata, milestone/task table, and dependency summary.
- `buildEvmPdfDocument(project, metrics, evmData)`
  - Printable finance/performance report with KPI cards and time-series table.
- `buildEvmExcelDocument(project, metrics, evmData)`
  - Spreadsheet export with summary section and snapshot/time-series rows.
- `buildRiskPdfDocument(projectId, filteredRisks, stats)`
  - Landscape risk register report with KPI summary and full table.
- `buildRiskExcelDocument(projectId, filteredRisks, stats)`
  - Spreadsheet export of the filtered risk register.
- `buildAdminUserExportDocument(selectedDept, filteredUsers)`
  - Staff roster export for the currently selected department.

### Test Coverage
- `tests/e2e/project-export-workflows.spec.ts`
  - `downloads wbs excel export for current project context`
    - WBS export triggers a spreadsheet download.
  - `opens gantt printable export`
    - Gantt PDF opens a printable report window.
  - `downloads evm excel and opens evm pdf`
    - EVM actions map to correct output channels.
  - `downloads risk excel and opens risk pdf`
    - Risk exports are both wired.
  - `opens executive pdf briefing`
    - Executive export opens printable report.
  - `downloads current department user roster`
    - Admin export downloads selected user list.

### Decision Completeness
- Goal
  - Make every export button produce a meaningful document aligned with the page’s purpose and currently visible data.
- Non-goals
  - Server-side report generation.
  - Pixel-perfect reproduction of charts in exported files.
  - Multi-sheet native XLSX generation.
- Success criteria
  - Every page with an export button has a working click handler.
  - PDF buttons open a printable report with a structured layout.
  - Excel/list export buttons download a spreadsheet-friendly file.
  - Focused e2e coverage proves the buttons are wired.
- Public interfaces
  - No API schema changes required.
  - New shared export utility APIs under `src/lib`.
- Edge cases / failure modes
  - Empty data: export still downloads/prints a report with empty-state messaging.
  - Missing selected WBS node: export falls back to project-level WBS summary with no BOQ table.
  - Popup blocked for print windows: fail open with an antd message instructing the user to allow popups.
  - Browser download restrictions: fail open with message and no crash.
- Rollout & monitoring
  - No flags, migrations, or backout complexity.
  - Validation is manual/e2e in the prototype runtime.
- Acceptance checks
  - `npm run e2e -- tests/e2e/project-export-workflows.spec.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Dependencies
- Existing Ant Design `message` for user feedback.
- Existing page-level loaded data from hooks.

### Validation
- Trigger each export button and confirm either a download event or popup/print page event.
- Spot-check downloaded filenames and visible headings.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `src/lib/export-utils.ts` | Button `onClick` handlers on page components | Imported into each export page | N/A |
| WBS export wiring | `WbsBOQPage` top action bar `Export Excel` | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | WBS + BOQ hook data |
| Gantt export wiring | `GanttChartPage` action bar `Export PDF` | `src/app/(dashboard)/projects/[id]/gantt/page.tsx` | Gantt hook data |
| EVM export wiring | `SCurvePage` action buttons | `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` | EVM hook data |
| Risk export wiring | `RiskManagementPage` card extra actions | `src/app/(dashboard)/projects/[id]/risk/page.tsx` | Risk hook data |
| Executive export wiring | `ExecutiveDashboardPage` footer button | `src/app/(dashboard)/executive/page.tsx` | Projects hook data |
| Admin roster export wiring | `AdminManagementPage` user card footer | `src/app/(dashboard)/admin/page.tsx` | Users + org structure hook data |

### Decision-Complete Checklist
- No open format decisions remain.
- Every changed button has an explicit document type.
- Every behavior change has a test target.
- Validation commands are concrete.
- Wiring points are enumerated.
- No deployment-visible backend changes.

## Plan Draft B

### Overview
- Implement a smaller export layer focused on one generic `printable document` builder and one generic `tabular download` builder, with each page only responsible for mapping its data into standardized section objects. This reduces custom page logic and makes later export expansion easier.
- Use a stronger standard structure for all exports: header, metadata strip, summary cards, then tables. Differences between pages come only from section content and orientation.

### Files to Change
- `src/lib/export-utils.ts`
  - Single export module containing shared types, HTML generators, and browser integration.
- `src/lib/export-documents.ts`
  - Page-by-page section mappers.
- Same six page files as Draft A.
- `tests/e2e/project-export-workflows.spec.ts`
  - Shared export workflow checks.

### Implementation Steps
- TDD sequence:
  1) Write failing tests around download events and popup behavior.
  2) Implement generic `ExportDocument` schema and renderers.
  3) Add page-specific document mappers with minimal page logic.
  4) Wire each button to the generic helper.
  5) Run gates and skeptical review.

- `type ExportDocument`
  - Normalized description of one exportable report.
- `renderExportDocumentHtml(doc)`
  - Produce consistent HTML for print/spreadsheet use.
- `exportAsPrintablePdf(doc)`
  - Open print window using shared renderer.
- `exportAsExcelHtml(doc)`
  - Download the same structured content in spreadsheet-friendly HTML.
- `build...Document(...)`
  - One builder per page returning normalized `ExportDocument`.

### Test Coverage
- Same test file as Draft A, but assertions focus on filenames and popup/download side effects rather than document body internals.

### Decision Completeness
- Goal
  - Standardize exports around one visual/report grammar.
- Non-goals
  - Native binary PDF/XLSX generation.
  - Embedded chart images.
- Success criteria
  - All export buttons are wired using the same shared API.
  - Downloaded/printed documents share a consistent style.
- Public interfaces
  - New shared `ExportDocument` type and helpers.
- Edge cases / failure modes
  - Same as Draft A, with generic empty-state section rendering.
- Rollout & monitoring
  - Same as Draft A.
- Acceptance checks
  - Same as Draft A.

### Dependencies
- Existing page data hooks only.

### Validation
- Same as Draft A, with extra manual check for consistent layout between pages.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `ExportDocument` renderers | Page `onClick` handlers | Shared lib imports from page files | N/A |
| Page-specific document builders | Called inside export handlers | Each export page | Existing hook data only |
| E2E workflow spec | Playwright export interactions | `tests/e2e/project-export-workflows.spec.ts` | N/A |

### Decision-Complete Checklist
- Shared export grammar locked.
- Page scopes and document types locked.
- No backend contract changes.

## Comparative Analysis & Synthesis

### Strengths
- Draft A is explicit about page-by-page layouts and document intent.
- Draft B produces a cleaner long-term architecture with one normalized export document model.

### Gaps
- Draft A risks duplicated rendering code if each page assembles too much document structure inline.
- Draft B could underspecify per-page document content if used without a page-by-page export matrix.

### Trade-offs
- Draft A is faster to reason about for immediate implementation.
- Draft B is better for consistency and future additions.

### Compliance
- Both drafts stay client-side, avoid backend drift, and align with the repo’s preference for shared reusable utilities in `src/lib` plus thin route files.

## Unified Execution Plan

### Overview
- Build one shared export document system, then implement explicit page-specific document builders for each export surface. Use printable HTML for `PDF` actions and Excel-compatible HTML download for spreadsheet actions, so the prototype gets realistic exports without adding binary generation libraries or server-side reporting.
- The implementation will be page-by-page and audience-aware: executive and schedule reports optimize for print briefing, while operational tables optimize for Excel consumption.

### Files to Change
- `src/lib/export-utils.ts`
  - Shared export document types, HTML renderers, `openPrintableReport`, `downloadSpreadsheetReport`, and low-level file helpers.
- `src/lib/export-formatters.ts`
  - Shared report-format helpers for money, percent, dates, and safe text normalization.
- `src/lib/export-documents.ts`
  - Page-specific builders returning normalized export documents.
- `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - Add current-context WBS/BOQ Excel export handler.
- `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - Add printable Gantt PDF export handler.
- `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
  - Add EVM PDF and Excel export handlers.
- `src/app/(dashboard)/projects/[id]/risk/page.tsx`
  - Add risk PDF and Excel export handlers.
- `src/app/(dashboard)/executive/page.tsx`
  - Add executive briefing PDF export handler.
- `src/app/(dashboard)/admin/page.tsx`
  - Add department user roster export handler.
- `tests/e2e/project-export-workflows.spec.ts`
  - Focused export workflow coverage.

### Implementation Steps
- TDD sequence:
  1) Add focused Playwright export tests covering one PDF path, one Excel path, and one admin roster path.
  2) Run the spec and confirm failure because handlers are absent.
  3) Implement shared export utilities and document schema.
  4) Implement document builders page-by-page in this order: `Executive`, `Risk`, `EVM`, `Gantt`, `WBS`, `Admin`.
  5) Wire each page button and rerun the focused spec after each major slice.
  6) Run sequential gates and skeptical review.

- Shared export model
  - `ExportDocument`
    - Fields: `title`, `subtitle`, `filename`, `orientation`, `metadata`, `summaryCards`, `tables`, `notes`.
  - `openPrintableReport(doc)`
    - Opens a new window, injects report HTML/CSS, and prints.
  - `downloadSpreadsheetReport(doc)`
    - Downloads `.xls` HTML with section headers and tables.
  - Failure handling
    - If popup creation fails, show `message.error`.

- Page-by-page export design
  - Executive
    - Format: printable PDF, landscape.
    - Layout: header, generated timestamp, KPI strip, project status table, budget table, highlight notes.
    - Relevant info: project counts, total budget, delayed count, quality gate count, per-project progress/status.
  - WBS/BOQ
    - Format: Excel-compatible `.xls`.
    - Layout: project metadata, WBS hierarchy table, selected node BOQ table, totals/stats.
    - Relevant info: WBS code/name/level/weight/progress/hasBOQ, selected node BOQ rows, selected node total, stats.
  - Gantt
    - Format: printable PDF, landscape.
    - Layout: project metadata, timeline context, task register table, milestone/dependency summary.
    - Relevant info: tasks, owners, dates, progress, derived schedule state, evaluation date.
  - EVM
    - Format: PDF + Excel.
    - PDF layout: project metadata, execution model, headline KPIs, latest-snapshot metrics, time-series table.
    - Excel layout: summary section plus per-period PV/EV/AC-or-Paid rows and ratios.
    - Relevant info: BAC/budget, execution model, metrics, evm snapshots.
  - Risk
    - Format: PDF + Excel.
    - PDF layout: KPI strip, filtered risk register, risk notes.
    - Excel layout: full filtered risk register table with owner/date/status/score.
    - Relevant info: current filtered set and derived counts.
  - Admin
    - Format: Excel-compatible `.xls`.
    - Layout: department header, exported timestamp, roster table.
    - Relevant info: selected department, user role/status/contact/projectCount.

### Test Coverage
- `tests/e2e/project-export-workflows.spec.ts`
  - `executive pdf export opens a printable briefing window`
    - Executive export triggers popup/report route.
  - `risk export buttons produce printable and spreadsheet outputs`
    - Risk PDF and Excel handlers are wired.
  - `evm export buttons produce printable and spreadsheet outputs`
    - EVM exports are wired for one project.
  - `gantt pdf export opens a printable schedule report`
    - Gantt export is wired.
  - `wbs excel export downloads current context workbook`
    - WBS export downloads a file.
  - `admin export downloads current department roster`
    - Admin export downloads a file.

### Decision Completeness
- Goal
  - Give every existing export button a real, coherent document output.
- Non-goals
  - Binary PDF rendering with embedded charts.
  - Native multi-sheet XLSX files.
  - New report backend endpoints.
- Success criteria
  - All six export surfaces are wired.
  - Each document contains page-relevant metadata and at least one structured table.
  - Focused export e2e coverage passes.
  - `typecheck`, `lint`, and `build` pass.
- Public interfaces
  - New shared export helpers in `src/lib`.
  - No API route changes required unless a page lacks necessary data.
- Edge cases / failure modes
  - Empty page data exports an empty-state report instead of failing closed.
  - Missing popup permission: show message, do not crash.
  - Selected WBS node missing: export only WBS hierarchy + stats.
  - Filtered admin/risk sets empty: export header plus empty table.
- Rollout & monitoring
  - Frontend-only; no feature flag.
  - Manual smoke via each export button and Playwright checks.
- Acceptance checks
  - `npm run e2e -- tests/e2e/project-export-workflows.spec.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Dependencies
- Existing hook-loaded data on each page.
- Browser Blob/download/window.print behavior.

### Validation
- Confirm downloaded filenames include page context and project/department identity.
- Confirm print windows open with the correct report title.
- Confirm empty states still render exportable documents.

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `src/lib/export-utils.ts` | Page button handlers | Imported into export pages | N/A |
| `src/lib/export-documents.ts` | Called from page handlers before export | Imported into export pages | Existing hook data only |
| Executive export handler | `Generate PDF` button | `src/app/(dashboard)/executive/page.tsx` | Projects hook data |
| WBS export handler | `Export Excel` button | `src/app/(dashboard)/projects/[id]/wbs/page.tsx` | WBS + selected BOQ hook data |
| Gantt export handler | `Export PDF` button | `src/app/(dashboard)/projects/[id]/gantt/page.tsx` | Gantt hook data |
| EVM export handlers | `Export PDF` / `Export Excel` buttons | `src/app/(dashboard)/projects/[id]/s-curve/page.tsx` | EVM hook data |
| Risk export handlers | `Export PDF` / `Export Excel` buttons | `src/app/(dashboard)/projects/[id]/risk/page.tsx` | Risk hook data |
| Admin roster export handler | `Export รายชื่อ` button | `src/app/(dashboard)/admin/page.tsx` | Users + org structure hook data |
| Export workflow e2e | Playwright interactions | `tests/e2e/project-export-workflows.spec.ts` | N/A |

### Cross-Language Schema Verification
- Not applicable. No DB or multi-language schema changes are involved.

### Decision-Complete Checklist
- No open export format decisions remain.
- Every export button has a target behavior.
- Each page has explicit included content.
- Validation commands are concrete.
- Wiring coverage includes every new helper and page entry point.

## 2026-03-25 07:38 ICT — Export document workflows

### Goal
Implement coherent export workflows for every page that already exposes an export action, with page-appropriate document format and layout, then verify the flows end-to-end.

### Page-by-page export decisions
- Executive dashboard: printable A4 landscape briefing for management review. Includes portfolio KPI summary, project status table, and budget snapshot table.
- WBS/BOQ: Excel-compatible `.xls` export because the user expectation is tabular extraction and downstream editing. Includes full WBS hierarchy plus the currently selected BOQ context.
- Gantt: printable A4 landscape schedule report. Includes report metadata and a schedule register table with schedule-health labels instead of attempting to embed the live gantt canvas.
- EVM: two formats. Printable PDF-style report for briefing, plus Excel-compatible `.xls` for monthly snapshot analysis.
- Risk register: two formats. Printable PDF-style report for review meetings, plus Excel-compatible `.xls` for operational tracking.
- Admin user roster: Excel-compatible `.xls` because the export is a departmental user list.

### Implementation
- Added shared export primitives in `src/lib/export-utils.ts` for printable popup reports and Excel-compatible HTML downloads.
- Added page-specific export document builders in `src/lib/export-documents.ts`.
- Wired export actions in:
  - `src/app/(dashboard)/executive/page.tsx`
  - `src/app/(dashboard)/projects/[id]/wbs/page.tsx`
  - `src/app/(dashboard)/projects/[id]/gantt/page.tsx`
  - `src/app/(dashboard)/projects/[id]/s-curve/page.tsx`
  - `src/app/(dashboard)/projects/[id]/risk/page.tsx`
  - `src/app/(dashboard)/admin/page.tsx`
- No API routes were added or changed. All export flows remain client-side.

### TDD / verification evidence
- RED basis: added `tests/e2e/project-export-workflows.spec.ts` before wiring handlers. Initial run stalled on missing popup/download behavior because several export buttons were inert.
- GREEN:
  - `npm run e2e -- tests/e2e/project-export-workflows.spec.ts`
  - Passed after implementation.
- Reliability re-run:
  - Re-ran `npm run e2e -- tests/e2e/project-export-workflows.spec.ts` two additional times.
  - Passed on all runs.
- Static/runtime gates:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`

### Wiring verification
- Executive export button now opens `buildExecutiveExportDocument(...)` through `openPrintableReport(...)`.
- WBS export button now downloads `buildWbsExportDocument(...)` through `downloadSpreadsheetReport(...)`.
- Gantt export button now opens `buildGanttExportDocument(...)` through `openPrintableReport(...)`.
- EVM export buttons now call `buildEvmPdfDocument(...)` / `buildEvmExcelDocument(...)`.
- Risk export buttons now call `buildRiskPdfDocument(...)` / `buildRiskExcelDocument(...)`.
- Admin export button now downloads `buildAdminUserExportDocument(...)`.

### Notes / limitations
- “PDF” exports are browser-printable HTML documents opened in a popup, not native server-generated PDF binaries.
- Chart pages export structured report summaries and tables rather than embedded screenshots of the live chart widgets.
- The WBS export reflects the current selected BOQ context, which matches the page’s visible state, rather than aggregating every BOQ branch in the project.

### Self-review
- No blocking findings after implementation review.
- Main residual risk is user expectation around native PDF files versus browser print flows; current behavior is intentional and covered by e2e popup assertions.

## Review (2026-04-03 07:08:12 +07) - system

### Reviewed
- Repo: /Users/subhajlimanond/dev/nsm-pqm-prototype
- Branch: main (effective project root inside larger home-level git repo)
- Scope: entire system
- Commands Run: read AGENTS.md/CLAUDE.md/package.json/next.config.mjs/middleware.ts; inspected app/api/lib/test files; ran npm run typecheck, npm run lint, npm run build; checked Vercel Hobby/limits/functions/storage docs
- Sources: AGENTS.md, CLAUDE.md, src/AGENTS.md, src/app/AGENTS.md, src/app/api/AGENTS.md, src/components/AGENTS.md, src/data/AGENTS.md, package.json, next.config.mjs, middleware.ts, src/lib/project-store.ts, src/lib/user-store.ts, src/lib/gantt-store.ts, src/lib/mock-upload-storage.ts, src/app/api/projects/route.ts, src/app/api/daily-reports/route.ts, tests/e2e/project-create-demo-scenario1.spec.ts, https://vercel.com/docs/plans/hobby, https://vercel.com/docs/functions/limitations, https://vercel.com/docs/limits, https://vercel.com/kb/guide/how-to-upload-and-store-files-with-vercel

### High-Level Assessment
- This is a conventional Next.js 14 App Router application with Ant Design/Tailwind on the frontend and mock API routes under src/app/api.
- Auth is cookie-based and enforced by middleware. User/session lookups resolve against JSON-seeded in-memory stores.
- The app builds successfully for production with 24 app routes and dynamic API handlers, so Vercel can host it technically without framework-level blockers.
- The main architecture risk is that write paths are intentionally mock and stateful in-process: projects, gantt, daily reports, and similar resources rely on global/module memory or local filesystem writes instead of durable storage.
- That model is fine for a single dev server demo, but not reliable on Vercel Functions where instances can cold start, scale out, or be replaced.
- Net: read-only seeded demo pages are deployable; create/edit/upload flows are not dependable on Hobby without changes.

### Strengths
- Zero-config Next.js deployment posture: package.json scripts are standard and next.config.mjs is empty/minimal.
- Production build succeeds locally with route generation completed.
- No required environment variables or external infrastructure dependencies were found.
- Route count and bundle structure are well within Vercel platform limits.
- Cookie-based auth and middleware are compatible with Vercel’s Node runtime.

### Key Risks / Gaps (severity ordered)
HIGH
- Hobby plan policy mismatch for a government/client demo. Vercel’s Hobby docs (published 2026-02-27) say Hobby is for non-commercial, personal use only. If this demo is for a bid, client, agency, or internal organizational showcase, Hobby is likely the wrong plan even if the app technically runs.
- Core demo mutations are not durable across serverless executions. Project and domain stores are initialized in process globals from JSON seeds ([src/lib/project-store.ts] and [src/lib/gantt-store.ts]) and mutation routes push into that memory ([src/app/api/projects/route.ts:122-133]). On Vercel this can reset on cold start or diverge between concurrent instances, so newly created projects/edits may disappear or differ per request.
- Daily report file uploads write to local disk under public/mock-uploads ([src/lib/mock-upload-storage.ts:24-44], [src/app/api/daily-reports/route.ts:99-155]). Vercel’s storage guidance recommends an external file storage provider (for example Vercel Blob or S3), so this upload path is not a safe deployment model.

MEDIUM
- Local quality gate is not green: npm run typecheck fails because the Playwright test uses a non-existent Locator filter option `hasValue` ([tests/e2e/project-create-demo-scenario1.spec.ts:27]). Vercel deployment is not blocked because next build succeeds, but the repo’s documented full gate is currently red.
- Git/integration posture is awkward for Vercel Git imports. `git rev-parse --show-toplevel` resolves to /Users/subhajlimanond, not the project directory, and the branch has no commits at that root. This suggests the local checkout is nested inside a larger home-level git root, which is risky for Git-based deployment workflows unless the app is moved into its own repository or a clean root-directory setup is used.

LOW
- Some page bundles are heavy for a demo (`/dashboard` first-load JS reported at 731 kB), which is not a Hobby blocker but may make the hosted demo feel slower on constrained networks.
- The Vercel docs have a small duration-limit discrepancy between general Hobby-plan docs and the dedicated functions-limits docs, likely due to older non-Fluid-compute behavior versus newer defaults. This repo’s handlers are short-lived, so the discrepancy does not materially affect feasibility.

### Nit-Picks / Nitty Gritty
- Middleware auth depends on the JSON-seeded user store, which is stable enough for read-only login simulation but should not be treated as authoritative mutable identity state.
- The mock API design intentionally adds latency (`setTimeout`) and in-memory mutation, which is good for UX realism but increases the odds of inconsistent state when deployed on auto-scaling serverless infrastructure.
- No vercel.json is present, which is fine now, but any future need for function-specific tuning would likely be handled via route segment config or project settings.

### Tactical Improvements (1–3 days)
1. Deploy only as a read-only demo on Vercel by disabling create/edit/upload actions or resetting user expectations that changes are temporary and may disappear.
2. Fix the Playwright typing issue so `npm run typecheck && npm run lint && npm run build` passes locally.
3. Replace local file writes with Vercel Blob or S3-style presigned uploads for daily report photos/attachments.
4. If mutation flows must remain interactive, move the mutable stores to a small durable backend (Vercel KV/Postgres/Supabase/Neon) or persist them in a single external JSON/blob document.
5. Put this app in its own clean Git repo before using Vercel Git integration.

### Strategic Improvements (1–6 weeks)
1. Split the demo into seed data plus a thin persistence layer so all mock APIs behave consistently across restarts and scale-out.
2. Add a lightweight deployment profile for “hosted demo” versus “local prototype”, so Vercel deployments can intentionally disable unsupported local-only behaviors.
3. Introduce basic smoke tests against a production build or Preview deployment for the key Thai-first demo journeys.

### Big Architectural Changes (only if justified)
- Proposal: Replace in-process mock stores with a single managed demo-state backend (Blob/KV/Postgres) behind the existing route handlers.
  - Pros: Stable create/edit flows on Vercel, better multi-user demos, safer uploads, closer to production behavior.
  - Cons: Slightly more setup and environment management, less “zero dependency” local simplicity.
  - Migration Plan: Keep the current route contracts; swap store implementations one domain at a time (projects -> daily reports/uploads -> gantt/quality); preserve JSON seeds for bootstrap/reset.
  - Tests/Rollout: Add route-level smoke tests for login, project creation, gantt retrieval, and daily report upload against Preview deployments.

### Open Questions / Assumptions
- Assumed “deploy on Vercel free tier” means today’s Hobby plan as documented on 2026-02-24 to 2026-02-27 pages.
- Assumed this is a client-facing or bid-related demo rather than a purely personal experiment; if that assumption is wrong, the Hobby policy risk may be lower.
- Assumed uploads and mutation flows are part of the demo value; if the hosted demo is read-only, the feasibility improves substantially.
