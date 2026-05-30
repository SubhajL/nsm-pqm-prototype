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
├── lib/                              # Utilities (date, format, API client)
└── types/                            # TypeScript type definitions
```

---

## Design System Tokens

Sources of truth (PR-A1):
- **Colors** → `src/theme/antd-theme.ts` → `COLORS`
- **Type scale + spacing scale** → `src/theme/scales.ts` → `TYPE_SCALE`, `SPACING`
- **Contrast helpers** → `src/theme/contrast.ts` (WCAG 2.x math + `auditPaletteContrast()`)
- **Lock-in test** → `src/theme/palette-contrast.test.ts` (CI gate on AA compliance)
- `tailwind.config.ts` mirrors the above; do not let it drift.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `colorPrimary` | `#1E3A5F` | Sidebar, headers, primary buttons |
| `accentTeal` | `#00B894` | **Brand identity only** (filled chips, large headings, tinted bg fills). Below AA on white — use `accentTealText` for normal body text |
| `colorInfo` | `#1D5EE6` | Links, informational badges. PR-A1 darkened from `#2D6BFF` (passed AA on white only) so it now also passes on `bgLayout` (≈5.16:1) |
| `colorWarning` | `#F39C12` | Brand only — use `warningText` for normal body text |
| `colorError` | `#E74C3C` | Brand only — use `errorText` for normal body text |
| `colorSuccess` | `#27AE60` | Brand only — use `successText` for normal body text |
| `colorBgLayout` | `#F5F7FA` | Main content background |
| `textMuted` | `#595959` | Secondary text. PR-A1 raised from `#8C8C8C` to satisfy AA (≈6.69:1 on white) |
| `accentTealText` | `#00755C` | Teal as normal text on white (≈5.56:1) |
| `warningText` | `#A05E00` | Warning as normal text on white (≈5.13:1) |
| `successText` | `#1B7A45` | Success as normal text on white (≈5.72:1) |
| `errorText` | `#B7341C` | Error as normal text on white (≈5.10:1) |

**Contrast policy:** every COLORS token used as normal body text on its
intended background must satisfy WCAG-AA (≥4.5:1) — enforced by
`palette-contrast.test.ts`. The four brand status colors are explicitly
exempt because they encode visual identity; route reading-load through
the matching `*Text` variant instead. Do not silence the lock-in test —
darken the offending token.

### Type scale

Defined in `src/theme/scales.ts` → `TYPE_SCALE`. Mirrored in both
`antdTheme.token.fontSize*` and `tailwind.config.ts` → `fontSize`.

| Token | Size | Line-height | Intended use |
|---|---|---|---|
| `xs` | 12 px | 16 px | Captions, badges, decorative chips (Latin only) |
| `sm` | 13 px | 18 px | Secondary text |
| `base` | 14 px | 22 px | **Body floor for Thai** — AntD default |
| `lg` | 16 px | 24 px | Preferred Thai body when density permits |
| `xl` | 18 px | 26 px | Section sub-headings |
| `2xl` | 20 px | 28 px | Section headings |
| `3xl` | 24 px | 32 px | H3 |
| `4xl` | 32 px | 40 px | H2 / page titles |
| `5xl` | 40 px | 48 px | Display |

**Thai body-size floor.** Per Punsongserm & Suvakunta 2024 (peer-reviewed
Thai typography research), Thai body text should respect a minimum
glyph size derived from a 1.3 mm Bo Baimai (บ) loop height. Mapped to
web at 96 DPI with Noto Sans Thai metrics, this becomes a conservative
**14 px floor** (`TYPE_SCALE.base`). Anything smaller is reserved for
short Latin tokens or decorative chips. The `withThaiMinSize(px)`
helper in `scales.ts` clamps variable inputs.

### Spacing scale

Defined in `src/theme/scales.ts` → `SPACING`. Tailwind exposes the
named tokens as `tk-xs` through `tk-6xl` alongside its numeric scale.

| Token | px | Common use |
|---|---|---|
| `xs` | 4 | Tight gaps within compound icons |
| `sm` | 8 | Form input padding, badge gaps |
| `md` | 12 | Tag/chip vertical padding |
| `lg` | 16 | Card body padding, KPI inner spacing |
| `xl` | 20 | Section spacing on dense panels |
| `2xl` | 24 | **AntD default Row/Col gutter** |
| `3xl` | 32 | Inter-section spacing |
| `4xl–6xl` | 40 / 48 / 64 | Page-level vertical rhythm |

### Typography
- Latin text: Inter (via `next/font/google`)
- Thai text: Noto Sans Thai (via `next/font/google`)
- Never use TH Sarabun New in code — it's for print/PDF only

### Component Standards
- Border radius: `8px` globally via antd theme token
- Card shadows: `0 2px 10px rgba(0,0,0,0.08)`
- Minimum touch target: `44px` for mobile screens

### Authoring rules (PR-A1)
- Prefer `TYPE_SCALE['<token>'].size` and `SPACING['<token>']` over inline
  `fontSize: 16` / `marginTop: 24` magic numbers. Tailwind classes
  `text-base`, `p-tk-lg`, etc. are equivalent.
- Adding a new color token: extend `COLORS` AND add an entry to
  `palette-contrast.test.ts` declaring the background it must pass AA
  on (or document the exemption inline).
- Bumping a token (e.g. accessibility raise): update both `COLORS` and
  the Tailwind mirror; do not let them drift.

---

## Accessibility (PR-A2)

Targets **WCAG 2.2 AA** end-to-end. The app shell ships three primitives
that every page inherits via `src/app/(dashboard)/layout.tsx`:

| Primitive | Source | Purpose |
|---|---|---|
| `SkipLink` | `src/components/a11y/SkipLink.tsx` | Keyboard "bypass blocks" (SC 2.4.1). Off-screen until focused; jumps to `#main-content` and moves focus there. |
| `<main id="main-content" tabIndex={-1}>` | dashboard layout | Landmark + programmatic focus target for the skip-link. |
| `LiveRegion` × 2 (polite + assertive) | `src/components/a11y/LiveRegion.tsx` | ARIA live regions (SC 4.1.3). Registered with the announcer module so any code path can call `announce(...)` without React imports. |

### Announcing async UI to screen readers

Visual-only `message.success(...)` / `notification.error(...)` calls are
invisible to assistive tech. Pair every user-facing toast with an
explicit announcement:

```tsx
import { announce } from '@/components/a11y';
import { message } from 'antd';

message.success('บันทึกแล้ว');
announce('บันทึกโครงการเรียบร้อยแล้ว'); // polite by default

message.error('บันทึกไม่สำเร็จ');
announce('เกิดข้อผิดพลาด: บันทึกโครงการไม่สำเร็จ', 'assertive');
```

Rules of thumb:
- `polite` — successes, info, "draft saved". Don't interrupt the user.
- `assertive` — errors that block the user's intent. Use sparingly.
- Empty / whitespace-only messages are dropped (avoids re-announcing
  stale text on some screen readers).

### Focus trap + restore for modals

Use AntD `<Modal>` and `<Drawer>` for any dialog UI — both implement
focus-trap, ESC-to-close, and focus-restore-on-close. **Do not** hand-
roll modals out of `<div>` + portal: they will skip these guarantees.

When a custom focus target is needed (e.g. moving focus to a freshly
inserted row), prefer `useEffect(() => ref.current?.focus(), [])` over
imperative `document.getElementById` calls.

### Landmark structure

Every dashboard route already has the right landmarks via the shell:

- `<Sidebar>` renders a `<nav aria-label="เมนูหลัก (Main navigation)">`
- `<Header>`'s breadcrumb is wrapped in `<nav aria-label="เส้นทาง (Breadcrumb)">`
- Content area is wrapped in `<main id="main-content">`

Inside individual pages, prefer semantic regions (`<section>`,
`<article>`) over `<div>` when the block carries a heading.

### Authoring rules (PR-A2)

- **New toast** → call `announce(...)` alongside `message`/`notification`.
- **New modal** → use AntD `<Modal>` / `<Drawer>`; never a raw portal.
- **New icon-only button** → must carry `aria-label` (Thai + English in
  the `Thai (English)` format already used by the rest of the shell).
- **New `<nav>` region** → must carry a bilingual `aria-label`.

### Shared UX primitives (PR-A3)

Bilingual primitives in `src/components/common/` that downstream PRs
(B3, C2, D1) will adopt. Pure helpers live in sibling `.ts` files so
they can be unit-tested under vitest's node env (no JSX).

| Primitive | Source | Use when |
|---|---|---|
| `EmptyState` | `EmptyState.tsx` | A list, table, or panel would otherwise render nothing |
| `SearchBar` | `SearchBar.tsx` + `search-utils.ts` | Any text search field — uses `caseInsensitiveIncludes()` for the filter predicate |
| `FilterBar` | `FilterBar.tsx` + `filter-utils.ts` | Wrap any filter-chip row; the `<section role="region">` makes it a landmark. `hasAnyActiveFilter()` / `resetFilters()` drive the Reset chip |
| `FormSection` | `FormSection.tsx` | Group related controls in a `<fieldset>` + `<legend>` per W3C-WAI |
| `StatusIndicator` | `StatusIndicator.tsx` + `status-visual.ts` | Generic status chip (success/warning/error/info/neutral). Always color **and** icon **and** text — never color alone. Reach for `StatusBadge` instead for domain statuses (project/milestone/risk/issue) |
| `LoadingSkeleton` | `LoadingSkeleton.tsx` | Any "data not yet loaded" state. `role="status"` + `aria-busy` makes it AT-announceable |

**Status-color invariant.** `resolveStatusVisual()` is locked by
`StatusIndicator.test.ts` against the AA-compliant `*Text` variants
from PR-A1. Adding a new `Status` value requires extending the lookup
**and** the test.

**Authoring rule:** prefer these primitives over bespoke per-screen
copies. The pure helpers (`caseInsensitiveIncludes`,
`hasAnyActiveFilter`, `resetFilters`, `resolveStatusVisual`) are the
single source of truth — duplicating their logic per screen is the
G6/G7/G8 anti-pattern this PR exists to retire.

### Charts a11y (PR-A4)

ECharts inherits a localized, color-blind-safe baseline through
`EChartsWrapper`. Authoring rules:

- **New chart** → render through `EChartsWrapper` (not raw
  `ReactECharts`). The wrapper merges `getChartBaseOption()` under the
  consumer's option, so the chart picks up `aria.enabled: true`,
  `aria.decal.show: true` (WCAG 1.4.1 colour-blind texture), the
  `ACCESSIBLE_CHART_PALETTE` colour cycle (every entry ≥ 3:1 on
  `bgLayout`), and AA-safe muted axis labels for free.
- **Number formatting** → import from
  `@/components/charts/chart-formatters`. Never call
  `Intl.NumberFormat` inline. `formatBaht`, `formatPercent`,
  `formatThaiCompact`, and `makeAxisLabelFormatter('baht'|'percent'|'count')`
  are the only sanctioned formatters; each caches its Intl instance.
- **Palette tokens** → only the six tokens in
  `ACCESSIBLE_CHART_PALETTE` (sourced from `COLORS`). Adding a hue
  means extending the palette AND its 1:1 `DECAL_PATTERNS` entry. The
  ≥ 3:1 contrast check is locked in `chart-palette.test.ts`.
- **Today / baseline overlays** → use `todayMarkLine()` and
  `baselineLegend()` from `chart-helpers` so the bilingual
  "วันนี้ (Today)" label and `Thai (English)` legend format stay
  consistent across the S-curve, EVM, and Gantt-overlay charts.
- **Foundation-only export** → `paletteEntryForIndex(i)` is exposed for
  future use by `markPoint` / `visualMap` consumers; it has no consumer
  inside the wrapper itself.

See `src/components/charts/CLAUDE.md` for the local component inventory.

---

## Thai Buddhist Calendar

All dates displayed to users use Buddhist Era (BE = CE + 543):
- Internal data storage: ISO 8601 CE dates (`2026-07-15`)
- Display format: `DD/MM/BBBB` where BBBB = year + 543 (`15/07/2569`)
- Use `src/lib/date-utils.ts` → `formatThaiDate()` and `toBuddhistYear()`
- Ant Design DatePicker: wrap with Thai locale from `dayjs/locale/th`

---

## Persistence Pattern (post-PR-21)

All API routes live in `src/app/api/` and reach persistence through the
repository registry — never the raw stores. Pattern:

```typescript
// src/app/api/projects/route.ts
import { getRepositories } from '@/lib/repositories';

export async function GET() {
  const repos = getRepositories();
  const projects = await repos.projects.list();
  return Response.json({ status: 'success', data: projects });
}

export async function POST(request: Request) {
  const body = await request.json();
  const created = await getRepositories().projects.create({
    id: crypto.randomUUID(),
    ...body,
  });
  return Response.json({ status: 'success', data: created }, { status: 201 });
}
```

**Persistence backend** is Drizzle-backed Postgres (PR-21b cutover
complete). Selected by `PERSISTENCE_BACKEND`:

- `db` (default) — real Postgres via `DATABASE_URL`; falls back to an
  in-memory pglite when the env var is unset (useful for dev + tests).
  Data is durable; fresh deployments must run
  `npm run db:migrate && npm run db:seed` once before serving traffic
  (or just hit any API endpoint — `ensureDatabaseSeeded()` is invoked
  lazily on first call).
- `dual` — kept as a no-op alias for `db` (back-compat with existing
  Vercel previews from the PR-20 soak). The dual-write wrapper was
  retired in PR-21b.
- `in_memory` — **no longer supported.** Passing it logs a warning and
  falls back to `db`. The 18 `*-store.ts` modules were deleted along
  with the InMemoryXxxRepository impls.

Auth helpers (`getActiveUser`, `requireProjectAccess`,
`canPerformProjectAction`, `syncProjectExecutionState`,
`bootstrapProjectData`) are async and hit the repository. Pure UI
helpers (menu access, role mapping) live in
`src/lib/project-access-pure.ts` and `src/lib/project-milestone-derivations-pure.ts`
so client components don't pull the Postgres client into the browser
bundle.

`middleware.ts` is the only consumer left of a sync read source
(`src/lib/user-store.ts` — an Edge-safe seed-from-JSON helper). All
writes still go through the Database repository.

See `src/lib/db/README.md` for the schema layout and
`src/lib/repositories/DUAL_WRITE.md` for the historical migration log.

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
