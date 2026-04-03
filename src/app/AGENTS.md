# App Router AGENTS

## Package Identity
- `src/app/` owns the Next.js App Router structure: layouts, pages, route groups, and API entry points.
- Use this file for route-level decisions; drop to `src/app/api/AGENTS.md` for mock backend handlers.

## Setup & Run
- Start the app from repo root: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Keep Server Components as the default; add `'use client'` only for interactive leaves.
- Keep page files thin. If a page grows beyond the documented limit in `CLAUDE.md`, extract route-local sections into a nearby `_components/` folder.
- Use route groups for major shells exactly as documented in `CLAUDE.md`: authenticated desktop work under `(dashboard)` and mobile flows under `(mobile)`.
- Keep project-scoped flows under a shared project route tree instead of duplicating per-screen wrappers; `CLAUDE.md` documents the intended `projects/[id]` nesting.
- Put truly reusable widgets in `src/components/`; keep page composition, layout wiring, and route-specific data loading in `src/app/`.
- When a screen needs charts or scheduling UI, delegate to `src/components/charts/` or `src/components/gantt/` instead of embedding library setup in the page.
- Follow the screen sequencing in `IMPLEMENTATION_PLAN.md` when deciding where new routes belong.

## Touch Points / Key Files
- App structure and route map: `CLAUDE.md`
- Screen rollout order: `IMPLEMENTATION_PLAN.md`
- Shared chart guidance used by route files: `src/components/charts/CLAUDE.md`
- Shared Gantt guidance used by route files: `src/components/gantt/CLAUDE.md`

## JIT Index Hints
- Find pages and layouts: `find src/app -name 'page.tsx' -o -name 'layout.tsx'`
- Find route groups: `find src/app -maxdepth 3 -type d | sort`
- Find future client components in routes: `rg -n "^'use client'" src/app --type tsx`
- Find route-local `_components` folders: `find src/app -type d -name '_components'`

## Common Gotchas
- No concrete route files are present in this checkout yet, so scaffold from `CLAUDE.md` and `IMPLEMENTATION_PLAN.md` instead of inferring a different layout.
- Do not put mock data directly into page files; source it from `src/data/` and API helpers.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
