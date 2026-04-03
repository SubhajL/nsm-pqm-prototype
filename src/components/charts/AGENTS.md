# Chart Components AGENTS

## Package Identity
- `src/components/charts/` is the home for all ECharts-based visualizations.
- This folder already has a detailed technology note in `src/components/charts/CLAUDE.md`; follow it before adding or editing chart files.

## Setup & Run
- Run the app from repo root: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Every chart component must be a client component.
- When a page imports a chart, use dynamic import with `ssr: false` so ECharts stays browser-only.
- Build options with shared theme colors; do not hardcode chart palettes.
- Set `notMerge={true}` on `ReactECharts` instances to avoid stale option accumulation.
- Format numbers in tooltips and labels with Thai locale rules.
- Set an explicit height for each chart; avoid auto-height charts in content grids.
- Use the chart inventory and starter pattern documented in `src/components/charts/CLAUDE.md` before inventing a new structure.

## Touch Points / Key Files
- Detailed chart rules and starter pattern: `src/components/charts/CLAUDE.md`
- Global product and theme rules: `CLAUDE.md`
- Scenario rollout context for chart-heavy screens: `IMPLEMENTATION_PLAN.md`

## JIT Index Hints
- Find chart components once scaffolded: `find src/components/charts -name '*.tsx'`
- Find ECharts usage: `rg -n "ReactECharts|EChartsOption" src/components/charts --type ts --type tsx`
- Find dynamic chart imports in routes: `rg -n "dynamic\\(\\(\\) => import\\(" src/app src/components --type tsx`
- Find tooltip formatters: `rg -n "tooltip|Intl\\.NumberFormat\\('th-TH'" src/components/charts --type ts --type tsx`

## Common Gotchas
- The current checkout contains the chart guidance file but not the concrete chart components it references; keep new files aligned to that documented inventory.
- Do not mix charting libraries or move ECharts setup into page files.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
