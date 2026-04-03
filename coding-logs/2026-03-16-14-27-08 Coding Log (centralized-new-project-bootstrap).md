# Coding Log: centralized new-project bootstrap

## Draft A: problem framing
- New projects currently initialize only the `Project` row and creator membership.
- Most project-scoped modules rely on lazy store creation or route-order-dependent writes.
- `Documents` is the worst offender: unknown `projectId` falls back to cloned `proj-001` seed data.
- Result: a brand-new project can route correctly but still feel inconsistent, thin, or inherit irrelevant data.

## Draft B: implementation shape
- Add a single bootstrap helper called immediately after `POST /api/projects`.
- That helper should eagerly initialize explicit, clean state for each project-scoped module:
  - milestones
  - WBS
  - BOQ
  - Gantt
  - documents
  - daily reports
  - EVM
  - quality gates / ITP items / inspections
  - risks
  - issues
  - change requests
- Keep the initialized state intentionally minimal:
  - no leaked seeded activities
  - only creator in project team
  - empty records where appropriate
  - one WBS root node so the project has an anchor structure

## Unified Plan
1. Add a failing Playwright spec for brand-new project bootstrap behavior.
2. Introduce `src/lib/project-bootstrap.ts` with explicit initialization helpers.
3. Add missing store-level `ensure*` / seed factory helpers where direct initialization is currently impossible.
4. Wire `POST /api/projects` to call the bootstrap helper after creating the project and creator membership.
5. Remove unknown-project fallback to `proj-001` in the document store.
6. Verify the new project opens cleanly across left-menu pages without inherited seeded data.

## Files likely to change
- `src/app/api/projects/route.ts`
- `src/lib/project-bootstrap.ts`
- `src/lib/document-store.ts`
- `src/lib/gantt-store.ts`
- `src/lib/wbs-store.ts`
- `src/lib/boq-store.ts`
- `src/lib/daily-report-store.ts`
- `src/lib/evm-store.ts`
- `src/lib/quality-store.ts`
- `src/lib/quality-gate-store.ts`
- `src/lib/risk-store.ts`
- `src/lib/issue-store.ts`
- `src/lib/milestone-store.ts`
- `src/lib/change-request-store.ts`
- `tests/e2e/project-create-and-shell.spec.ts` or a new focused bootstrap spec

## Verification target
- New project overview shows no recent activity.
- Team shows only creator by default.
- WBS page shows explicit clean structure, not leaked seeded nodes.
- Documents page shows empty project-specific state, not astronomy docs.
- Quality/EVM/Risk/Issues/Daily Report show explicit empty state until new records are created.
- Existing seeded projects remain unchanged.

## Implementation summary
- Added `src/lib/project-bootstrap.ts` as the single bootstrap path for brand-new projects.
- Wired `POST /api/projects` to pass milestone rows from the create form into the bootstrap helper.
- New projects now start with:
  - milestone records derived from the create form
  - starter WBS level-1 nodes derived from milestone deliverables
  - Gantt milestone groups derived from payment milestones
  - project-specific document folders with no inherited files
  - project-specific quality gate pipeline and starter ITP items
- Removed the document-store fallback that previously cloned `proj-001` astronomy documents for unknown projects.
- Fixed WBS page selection precedence so a newly created child node becomes the active BOQ target.
- Replaced static Quality KPI values with values derived from live inspection data.

## Verification results
- `npx playwright test tests/e2e/project-bootstrap-empty-state.spec.ts tests/e2e/project-create-and-shell.spec.ts --reporter=line`
  - passed (`4 passed`)
- `npm run lint`
  - passed with pre-existing warnings in:
    - `src/app/(dashboard)/projects/[id]/issues/page.tsx`
    - `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - passed after the fresh build regenerated `.next/types`

## 2026-03-16 17:07 ICT - offline-safe dev boot / font fetch fix

### Goal
- Stop `next dev` from trying to download Google Fonts at startup so local development works without DNS access to `fonts.googleapis.com`.

### What changed
- `src/app/layout.tsx`
  - removed `next/font/google` imports for `Inter` and `Noto Sans Thai`
  - removed Google-font-derived body class wiring
- `src/app/globals.css`
  - introduced a local/system app font stack via `--font-app`
  - body now uses that static stack instead of runtime font variables
- `src/theme/antd-theme.ts`
  - aligned Ant Design token `fontFamily` to the same offline-safe stack

### TDD evidence
- RED:
  - Not produced as a conventional test. This was a dev-runtime failure reproduced from the user's command/log:
  - `rm -rf .next && npm run dev`
  - failure reason: `next/font/google` attempted to fetch `Inter` and `Noto Sans Thai` from `https://fonts.googleapis.com/...` and failed with `getaddrinfo ENOTFOUND fonts.googleapis.com`
- GREEN:
  - `npm run dev`
  - then forced a route compile with `curl -I http://127.0.0.1:3003/login`
  - result: `/login` compiled and returned `HEAD /login 200` with no Google Fonts fetch errors in the dev log

### Tests run
- `npm run lint`
  - passed with pre-existing warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed
- `npm run typecheck`
  - not rerun for this tiny runtime-only fix because the repo-wide gates were already green immediately before this change and the change was limited to font wiring; build remained green after the edit

### Wiring verification
- Verified no remaining `next/font/google`, `Inter(`, or `Noto_Sans_Thai(` references under `src/`
- Verified the app root still applies a consistent font through `globals.css` and `antd-theme.ts`

### Behavior changes and risk notes
- Dev boot no longer depends on network access to Google Fonts
- The app now uses system/local fonts if `Noto Sans Thai` or `Inter` are present on the machine, otherwise it falls back cleanly
- Visual typography may differ slightly from the previous Google-hosted versions, but runtime stability is improved and hot-reload noise from font fetch failures should disappear

### Follow-ups / known gaps
- The separate `hot-update.json 404` lines should disappear when the font-triggered runtime reloads stop, but they can still occur transiently during normal full reloads in dev
- Existing hook-dependency warnings in `issues` and `risk` remain unrelated to this fix

## 2026-03-16 17:18 ICT - dashboard chart chunk-load runtime fix

### Goal
- Fix the dashboard runtime error:
- `ChunkLoadError: Loading chunk _app-pages-browser_src_components_charts_PortfolioBarChart_tsx failed`

### What changed
- `src/app/(dashboard)/dashboard/page.tsx`
  - removed `next/dynamic` wrappers for `PortfolioBarChart` and `ProjectDonutChart`
  - switched to direct imports of both chart components

### Why
- The dashboard page is already a client component.
- The actual browser-only boundary already exists in `src/components/charts/EChartsWrapper.tsx` via `echarts-for-react`.
- The extra dynamic split created a separate dev chunk for `PortfolioBarChart` / `ProjectDonutChart`, which is the chunk that failed to load in the runtime overlay.
- Direct import removes that extra chunk boundary and avoids the failing loader path.

### TDD evidence
- RED:
  - Reproduced from the runtime overlay on `/dashboard`
  - failure: `ChunkLoadError` while loading `PortfolioBarChart` through the dynamic import loader
- GREEN:
  - `npm run build`
  - result: build passed after replacing the dynamic loader with direct imports

### Tests run
- `npm run lint`
  - passed with the same pre-existing warnings in `src/app/(dashboard)/projects/[id]/issues/page.tsx` and `src/app/(dashboard)/projects/[id]/risk/page.tsx`
- `npm run build`
  - passed

### Wiring verification
- Verified `PortfolioBarChart` and `ProjectDonutChart` are imported directly in `src/app/(dashboard)/dashboard/page.tsx`
- Verified `EChartsWrapper.tsx` remains the client-side runtime boundary for ECharts

### Behavior changes and risk notes
- Dashboard first-load JS is larger because the two chart components are now bundled with the page instead of lazy-loaded
- In exchange, the dev/runtime path is simpler and avoids the failing chunk load boundary

### Follow-ups / known gaps
- If the browser still shows the old overlay, do one hard refresh so it drops the stale chunk reference
