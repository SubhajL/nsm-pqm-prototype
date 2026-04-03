# Mock Data AGENTS

## Package Identity
- `src/data/` stores mock fixtures used by the prototype UI and mock API routes.
- Treat everything here as demo data, not a long-term persistence model.

## Setup & Run
- No standalone runner; consume fixtures through the root app: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Full local gate: `npm run typecheck && npm run lint && npm run build`

## Patterns & Conventions
- Keep fixture files static and importable from `src/app/api/` and server components.
- Use fictional data only; never add secrets, credentials, or real user information.
- Store dates in ISO 8601 Common Era form and let UI utilities convert them to Buddhist Era for display.
- Keep currency and numeric display concerns out of the data layer; format at render time.
- Preserve stable object keys so mock APIs can simulate updates predictably during a dev session.
- If a fixture shape changes, update the corresponding route contract and any documented screen assumptions together.
- Keep data concerns separate from view logic; `src/data/` should stay free of React code.

## Touch Points / Key Files
- Product rules for mock data and Thai date handling: `CLAUDE.md`
- Endpoint and scenario planning context: `IMPLEMENTATION_PLAN.md`
- API consumer rules: `src/app/api/AGENTS.md`

## JIT Index Hints
- List fixture files: `find src/data -type f | sort`
- Find imports of fixture data: `rg -n "@/data|from '../data|from \"@/data|from '@/data" src --type ts --type tsx`
- Find UUID creation in mock writes: `rg -n "crypto\\.randomUUID" src --type ts --type tsx`
- Find date formatting call sites: `rg -n "formatThaiDate|toBuddhistYear|Intl\\.NumberFormat\\('th-TH'" src --type ts --type tsx`

## Common Gotchas
- `src/data/` currently exists without fixture files in this checkout; add new files with clear domain names and keep them JSON-first unless code is required.
- Do not let API handlers mutate imported objects directly without copying them into a request-lifetime or module-lifetime store.

## Pre-PR Checks
`npm run typecheck && npm run lint && npm run build`
