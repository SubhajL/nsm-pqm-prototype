# Source Tree AGENTS

## Package Identity
- `src/` contains the full application source for the NSM PQM prototype.
- Read this file for source-wide rules, then the nearest nested `AGENTS.md` for route-, component-, or data-specific guidance.

## Setup & Run
- Install and run from repo root: `npm install && npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Put route code in `src/app/`, shared UI in `src/components/`, and demo fixtures in `src/data/`.
- Use `CLAUDE.md` as the source of truth for product behavior, screen inventory, and non-negotiable tech choices.
- Use `IMPLEMENTATION_PLAN.md` to keep new files aligned with the planned screen breakdown and phase order.
- Keep server concerns, route layouts, and page composition in `src/app`; move reusable UI patterns into `src/components`.
- Keep charts and Gantt work inside their dedicated subfolders so the deeper AGENTS rules apply automatically.
- Preserve Thai-first copy, Thai currency formatting, and Buddhist Era date display rules from `CLAUDE.md`.
- This checkout is sparse; do not assume missing files exist. Add structure deliberately instead of inventing parallel folders.

## Touch Points / Key Files
- Root architecture and rules: `CLAUDE.md`
- Screen rollout plan: `IMPLEMENTATION_PLAN.md`
- Chart-specific rules: `src/components/charts/CLAUDE.md`
- Gantt-specific rules: `src/components/gantt/CLAUDE.md`

## JIT Index Hints
- List all source files: `find src -type f | sort`
- List current source directories: `find src -maxdepth 3 -type d | sort`
- Find any future hooks: `rg -n "export function use[A-Z]|export const use[A-Z]" src --type ts --type tsx`
- Find any future types: `rg -n "^export (type|interface)" src --type ts --type tsx`

## Common Gotchas
- The documented npm scripts live in `CLAUDE.md`; the package manifest is not present in this checkout.
- Current on-disk guidance is heavier than the implementation itself, so prefer documented patterns over assumptions.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
