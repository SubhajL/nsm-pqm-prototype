# AGENTS.md

## Project Snapshot
- Repo shape: single-project Next.js prototype, not a monorepo or workspace.
- Primary stack: Next.js 14 App Router, TypeScript, Ant Design 5, Tailwind CSS, ECharts, dhtmlxGantt.
- Product context: Thai-first government demo app with mock APIs and mock fixture data.
- This checkout is skeletal: root guidance lives in `CLAUDE.md`; nested guidance lives in the closest `AGENTS.md`.

## Root Setup Commands
- Install deps: `npm install`
- Start dev server: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`
- Note: the commands above come from `CLAUDE.md`; no `package.json` is present in this checkout yet.

## Universal Conventions
- TypeScript strict mode only; do not introduce `any`, `@ts-ignore`, or `@ts-expect-error`.
- Default to Server Components in `src/app`; add `'use client'` only for hooks, browser APIs, or event handlers.
- Use Ant Design as the primary UI layer; do not add parallel UI libraries.
- Use ECharts for charts and dhtmlxGantt for schedule views; do not mix charting libraries.
- Format money with Thai locale and render user-facing years in Buddhist Era using shared date utilities.
- Use Tailwind utilities and theme tokens; do not hardcode hex colors or add CSS modules / styled-components.

## Security & Secrets
- Never commit `.env.local`, tokens, or credentials.
- Treat all current data as mock/demo data only; no real PII belongs in this repo.
- Keep secrets in local env files only; do not embed them in fixtures, components, or route handlers.

## JIT Index
### Directory Map
- Source tree: `src/` -> `src/AGENTS.md`
- App Router and pages: `src/app/` -> `src/app/AGENTS.md`
- Mock API routes: `src/app/api/` -> `src/app/api/AGENTS.md`
- Shared UI: `src/components/` -> `src/components/AGENTS.md`
- Chart components: `src/components/charts/` -> `src/components/charts/AGENTS.md`
- Gantt integration: `src/components/gantt/` -> `src/components/gantt/AGENTS.md`
- Mock fixtures: `src/data/` -> `src/data/AGENTS.md`

### Quick Find Commands
- List current files: `find . -maxdepth 4 -type f | sort`
- List source directories: `find src -maxdepth 3 -type d | sort`
- Find page files once scaffolded: `find src/app -name 'page.tsx' -o -name 'layout.tsx'`
- Find API handlers once scaffolded: `find src/app/api -name 'route.ts'`
- Find shared component exports: `rg -n "export (function|const) " src/components --type ts --type tsx`
- Find Thai text literals: `rg -n "[\u0E00-\u0E7F]" src/ --type ts --type tsx`
- Check for hardcoded colors: `rg -n "#[0-9a-fA-F]{6}" src/ --type ts --type tsx`

## Definition Of Done
- The nearest relevant `AGENTS.md` has been followed for every edited path.
- `npm run typecheck && npm run lint && npm run build` succeeds.
- Thai formatting, Buddhist Era dates, and theme-token rules are preserved.
- No secrets, real user data, or banned styling / typing shortcuts are introduced.
