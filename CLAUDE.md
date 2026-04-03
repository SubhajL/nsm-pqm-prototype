# NSM PQM System — Project & Quality Management Prototype

## Overview
- **Type**: Single Next.js application (functional prototype for government bid demo)
- **Stack**: Next.js 14 (App Router) + TypeScript + Ant Design 5 + Tailwind CSS + ECharts + dhtmlxGantt
- **Purpose**: Working prototype demonstrating 7 E2E scenarios across 17 modules for อพวช. (National Science Museum of Thailand)
- **Language**: Thai-first UI with English bilingual labels — all user-facing text is Thai, technical terms in parenthetical English
- **Effective root**: This project lives at `/Users/subhajlimanond/dev/nsm-pqm-prototype` inside a larger git repo rooted at `~`. Treat this directory as the project root for all operations.

This CLAUDE.md is the authoritative source for all development. Only two subdirectories carry their own CLAUDE.md with material local guidance: `src/components/charts/` and `src/components/gantt/`. All other directories inherit these root rules.

---

## Universal Development Rules

### Code Quality (MUST)
- **MUST** write TypeScript in strict mode — no `any` without explicit `// eslint-disable-next-line` with justification
- **MUST** use `'use client'` directive only when component needs browser APIs, hooks, or event handlers
- **MUST** keep Server Components as the default (Next.js App Router)
- **MUST** use Ant Design components as primary UI primitives — do NOT create custom components that duplicate antd functionality
- **MUST** use ECharts for all chart/visualization needs — no mixing chart libraries
- **MUST** format Thai Baht with `Intl.NumberFormat('th-TH')` — never hardcode ฿ symbol placement
- **MUST** display dates in Thai Buddhist Era (CE + 543) — use the `toBuddhistYear()` utility in `src/lib/date-utils.ts`

### Best Practices (SHOULD)
- **SHOULD** colocate related files — page component, hooks, and types in the same route directory
- **SHOULD** prefer Ant Design's built-in form validation over custom validation logic
- **SHOULD** keep page components under 150 lines — extract sections into `_components/` subfolder
- **SHOULD** use React Query for all data fetching — never use `useEffect` + `fetch` directly
- **SHOULD** add bilingual labels in format `"Thai (English)"` for all status badges and key terms

### Anti-Patterns (MUST NOT)
- **MUST NOT** use `@ts-ignore` or `@ts-expect-error`
- **MUST NOT** import from `node_modules` paths directly — use package names
- **MUST NOT** hardcode color values — use theme tokens from `src/theme/antd-theme.ts` or Tailwind config
- **MUST NOT** use `dangerouslySetInnerHTML` — all content is from our own mock data
- **MUST NOT** install additional UI libraries (no Material UI, no Chakra, no shadcn) — Ant Design only
- **MUST NOT** use CSS modules or styled-components — Tailwind + antd theme tokens only

---

## Commands

> **Note**: These commands require `package.json` to exist (created in Phase 0 scaffolding). Before scaffolding is complete, use `npx create-next-app` or direct `npx tsc --noEmit` instead.

### Development (available after Phase 0)
```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (added manually to scripts)
```

### Quality Gate (run before any commit)
```bash
npm run typecheck && npm run lint && npm run build
```

### Direct fallbacks (always available)
```bash
npx tsc --noEmit                        # Typecheck without npm script
npx next lint                           # Lint without npm script
npx next build                          # Build without npm script
```

---

## Project Structure

```
src/
├── app/                              # Next.js App Router pages
│   ├── (dashboard)/                  # All authenticated routes (sidebar layout)
│   │   ├── layout.tsx                # Main shell: sidebar + header + content
│   │   ├── dashboard/                # Screen 1.1 Portfolio Dashboard
│   │   ├── projects/
│   │   │   ├── new/                  # Screen 1.2 New Project Form
│   │   │   └── [id]/                # All project-scoped screens (2.1–5.2)
│   │   │       └── layout.tsx        # ProjectContext provider
│   │   ├── notifications/            # Screen 2.5 Notification Center
│   │   ├── executive/                # Screens 6.1–6.2 Executive views
│   │   └── admin/                    # Screens 7.1–7.2 Admin views
│   ├── (mobile)/                     # Mobile routes (bottom tab layout)
│   ├── api/                          # Mock API routes (18 endpoints)
│   └── layout.tsx                    # Root layout (fonts, providers)
├── components/
│   ├── layout/                       # Sidebar, Header, Breadcrumb
│   ├── charts/                       # ECharts wrappers — [see charts/CLAUDE.md](src/components/charts/CLAUDE.md)
│   ├── gantt/                        # dhtmlxGantt wrapper — [see gantt/CLAUDE.md](src/components/gantt/CLAUDE.md)
│   ├── quality/                      # Quality Gate Pipeline
│   ├── kanban/                       # Drag-drop Kanban board
│   ├── forms/                        # Reusable form components
│   ├── tables/                       # Reusable table configurations
│   └── common/                       # KPICard, StatusBadge, PhotoGrid, etc.
├── hooks/                            # React Query hooks (1 per API domain)
├── stores/                           # Zustand stores (app, notifications, auth)
├── data/                             # JSON mock data fixtures (15 files)
├── theme/                            # Ant Design theme configuration
├── i18n/                             # Thai/English message files
├── lib/                              # Utilities (date, format, API client)
└── types/                            # TypeScript type definitions
```

---

## Design System Tokens

### Colors (defined in `src/theme/antd-theme.ts` and `tailwind.config.ts`)
| Token | Hex | Usage |
|---|---|---|
| `colorPrimary` | `#1E3A5F` | Sidebar, headers, primary buttons |
| `--accent-teal` | `#00B894` | Active nav, progress bars, success actions |
| `colorInfo` | `#2D6BFF` | Links, informational badges |
| `colorWarning` | `#F39C12` | Warnings, amber status |
| `colorError` | `#E74C3C` | Errors, danger, late status |
| `colorSuccess` | `#27AE60` | Success, completed, on-track |
| `colorBgLayout` | `#F5F7FA` | Main content background |

### Typography
- Latin text: Inter (via `next/font/google`)
- Thai text: Noto Sans Thai (via `next/font/google`)
- Never use TH Sarabun New in code — it's for print/PDF only

### Component Standards
- Border radius: `8px` globally via antd theme token
- Card shadows: `0 2px 10px rgba(0,0,0,0.08)`
- Minimum touch target: `44px` for mobile screens

---

## Thai Buddhist Calendar

All dates displayed to users use Buddhist Era (BE = CE + 543):
- Internal data storage: ISO 8601 CE dates (`2026-07-15`)
- Display format: `DD/MM/BBBB` where BBBB = year + 543 (`15/07/2569`)
- Use `src/lib/date-utils.ts` → `formatThaiDate()` and `toBuddhistYear()`
- Ant Design DatePicker: wrap with Thai locale from `dayjs/locale/th`

---

## Mock API Pattern

All API routes live in `src/app/api/`. Pattern:
```typescript
// src/app/api/projects/route.ts
import projects from '@/data/projects.json';

let store = [...projects]; // In-memory — resets on restart

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return Response.json({ status: 'success', data: store });
}

export async function POST(request: Request) {
  const body = await request.json();
  store.push({ id: crypto.randomUUID(), ...body });
  return Response.json({ status: 'success', data: body }, { status: 201 });
}
```

**Key rule**: Data persists during dev session, resets on server restart. This is intentional for demo purposes.

### Mock Data Reference

The primary demo project is "โครงการปรับปรุงนิทรรศการดาราศาสตร์" (PJ-2569-0012), budget 12.5M THB, progress 65%, SPI 0.92, CPI 1.05. All 15 JSON fixture files, personnel names, and EVM time-series data are documented in detail in the data schema comments within each `src/data/*.json` file.

---

## Stitch Design Reference

When implementing any screen, fetch the HTML from the Stitch project for visual reference:
- **Primary project**: `5556082433200311458` (21 screens)
- **Design system reference**: `16588400576091086226` (5 screens)
- Use the MCP tool `mcp__stitch__get_screen` to retrieve specific screen HTML
- Screen-to-implementation mapping is in `IMPLEMENTATION_PLAN.md`

---

## Quick Find Commands

```bash
# Find a page component
find src/app -name "page.tsx" | head -25

# Find a shared component
rg -n "export (function|const) " src/components -g '*.ts' -g '*.tsx'

# Find a React Query hook
rg -n "export function use[A-Z]" src/hooks -g '*.ts'

# Find an API route
find src/app/api -name "route.ts"

# Find type definitions
rg -n "^export (type|interface)" src/types -g '*.ts'

# Find Thai text literals
rg -n "[\u0E00-\u0E7F]" src/ -g '*.tsx' -g '*.ts'

# Find hardcoded colors (anti-pattern check)
rg -n "#[0-9a-fA-F]{6}" src/ -g '*.tsx' -g '*.ts'

# Find all 'use client' directives
rg -n "^'use client'" src/ -g '*.tsx'
```

---

## Security & Safety

- **NEVER** commit `.env.local` — it is in `.gitignore`
- No real API keys exist — all data is mock. No real user data — all names are fictional.
- `rm -rf node_modules` is safe; `rm -rf src/` is NOT — always confirm
- No force push needed — prototype repo with single developer

---

## Git Workflow

- Single branch `main` for prototype (no PR workflow needed)
- Conventional commits: `feat:`, `fix:`, `refactor:`, `style:`, `chore:`
- Commit after each screen is complete and verified working
- Example: `feat: implement Screen 1.1 Portfolio Dashboard with KPI cards and charts`

---

## Key Technical Challenges

### 1. dhtmlxGantt + React
- Wrap in `dynamic(() => import(...), { ssr: false })` — it needs DOM
- Initialize with `useRef` + `useEffect`, NOT in render
- Prevent re-init: check ref before calling `gantt.init()`
- **Detailed patterns**: [src/components/gantt/CLAUDE.md](src/components/gantt/CLAUDE.md)

### 2. ECharts + SSR
- ALL chart components must use `'use client'` directive
- Wrap with `dynamic(() => import(...), { ssr: false })` in page components
- Use `echarts-for-react` wrapper, not raw echarts API
- **Component inventory and patterns**: [src/components/charts/CLAUDE.md](src/components/charts/CLAUDE.md)

### 3. Ant Design + Tailwind CSS Coexistence
- Ant Design handles component styling via `ConfigProvider` theme
- Tailwind handles layout, spacing, custom sections
- If conflict: antd wins for its own components, Tailwind wins for custom HTML
- Never override `.ant-*` classes with Tailwind

### 4. @dnd-kit Kanban
- Use `DndContext` + `SortableContext` per column
- Optimistic updates via React Query `onMutate`
- Add `will-change: transform` CSS for smooth drag animations
