# Gantt Components AGENTS

## Package Identity
- `src/components/gantt/` owns dhtmlxGantt integration and any scheduling-specific wrappers.
- The existing `src/components/gantt/CLAUDE.md` is the implementation contract for this folder.

## Setup & Run
- Run the app from repo root: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Keep every Gantt component client-side and import it dynamically from pages.
- Initialize `gantt` inside `useEffect` with refs; never initialize in the render path.
- Guard initialization so the chart is not recreated on every render.
- Always clean up with `gantt.clearAll()` when the component unmounts.
- Import the official dhtmlxGantt CSS from the component entry file.
- Configure Thai labels, columns, and view modes in the wrapper rather than scattering setup across pages.
- Follow the starter pattern in `src/components/gantt/CLAUDE.md` before adding new scheduling behavior.

## Touch Points / Key Files
- Detailed Gantt integration guidance: `src/components/gantt/CLAUDE.md`
- Global UI and date-formatting rules: `CLAUDE.md`
- Screen rollout context for schedule views: `IMPLEMENTATION_PLAN.md`

## JIT Index Hints
- Find Gantt components once scaffolded: `find src/components/gantt -name '*.tsx'`
- Find dhtmlx imports: `rg -n "from 'dhtmlx-gantt'|gantt\\." src/components/gantt --type ts --type tsx`
- Find cleanup coverage: `rg -n "clearAll\\(" src/components/gantt --type ts --type tsx`
- Find dynamic imports in routes: `rg -n "dynamic\\(\\(\\) => import\\(" src/app --type tsx`

## Common Gotchas
- dhtmlxGantt is DOM-dependent; SSR-safe dynamic imports are mandatory.
- Keep critical path styling and zoom controls inside the wrapper layer, not duplicated in page files.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
