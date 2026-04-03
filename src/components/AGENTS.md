# Shared Components AGENTS

## Package Identity
- `src/components/` holds reusable UI shared across screens.
- Use this layer for stable building blocks; keep route-specific assembly in `src/app/`.

## Setup & Run
- Develop through the root app server: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Prefer Ant Design primitives and composition over custom replacements for tables, forms, modals, tabs, and layout.
- Keep folder boundaries consistent with `CLAUDE.md`: `layout/`, `charts/`, `gantt/`, `quality/`, `kanban/`, `forms/`, `tables/`, and `common/`.
- Put generic, reusable UI in this tree; if a piece is specific to one route, keep it under that route’s `_components/` folder instead.
- Use theme tokens and Tailwind utilities instead of hardcoded colors or one-off styling systems.
- Keep Thai-first labels and bilingual status terminology consistent with the product rules in `CLAUDE.md`.
- Delegate chart-specific and Gantt-specific implementation details to the deeper AGENTS files in those subfolders.
- Use this folder to reduce duplication between dashboard, executive, admin, and mobile views documented in `CLAUDE.md`.

## Touch Points / Key Files
- Shared component inventory and design rules: `CLAUDE.md`
- Chart implementation reference: `src/components/charts/CLAUDE.md`
- Gantt implementation reference: `src/components/gantt/CLAUDE.md`
- Screen rollout context: `IMPLEMENTATION_PLAN.md`

## JIT Index Hints
- Find component exports: `rg -n "export (function|const) " src/components --type ts --type tsx`
- Find Ant Design usage: `rg -n "from 'antd'" src/components --type ts --type tsx`
- Find hardcoded colors to remove: `rg -n "#[0-9a-fA-F]{6}" src/components --type ts --type tsx`
- Find route-local components that may need promotion: `find src/app -type d -name '_components'`

## Common Gotchas
- There are currently no concrete component implementations on disk, so use the docs as the contract and avoid introducing a competing structure.
- Do not add CSS modules, styled-components, or alternate UI kits in this tree.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
