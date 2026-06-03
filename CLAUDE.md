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

`middleware.ts` no longer reads any user store (the Edge-safe
`src/lib/user-store.ts` seed helper was removed in Phase 1). It now does
cookie-presence + route gating only, deriving admin access from the role
cookie via the pure `canAccessAdmin` helper. DB-backed identity and
active-status enforcement moved to the route handlers — admin/executive
routes call `requireAdminUser()` / `requireExecutiveUser()` in
`src/lib/project-api-access.ts`, which load the caller from the
repository and reject inactive accounts. All writes still go through the
Database repository.

See `src/lib/db/README.md` for the schema layout and
`src/lib/repositories/DUAL_WRITE.md` for the historical migration log.

## Approval Workflows (PR-27)

Two state-machine-driven approval workflows live in the API,
both gated by pure routing helpers in
`src/lib/rid/change-request-routing.ts`:

1. **Change-request workflow** —
   `POST /api/change-requests/[id]/transition` advances
   `ChangeRequest.status` through
   `submitted → under_review → (pm|bureau|committee)_approved → applied`,
   with `* → rejected` reachable from any non-terminal state.
   `requiredApprovalLevelForChangeRequest(impactBudgetTHB, sizeTier)`
   classifies the required tier per PR-14:
   small CR (<฿1M) → PM, medium (฿1M–฿10M) → bureau head,
   large (≥฿10M or large project) → committee. Negative budget
   deltas are bucketed by absolute magnitude.

2. **Project approval workflow** —
   `POST /api/project-approval-requests/by-project/[projectId]`
   submits, `POST /api/project-approval-requests/[id]/decision`
   records an approve/reject/request_changes decision and
   advances the state machine. `decisionHistory` is append-only.

Role → authority mapping reuses
`ROLES_SATISFYING_AUTHORITY` in
`src/lib/rid/approval-authority.ts` (System Admin / Project
Manager satisfy pm + bureau_head; System Admin alone satisfies
committee until RID confirms a richer position model).

Legacy CR status values `pending` and `approved` are retained
for back-compat with seed fixtures and the existing
`change-request/page.tsx` UI; both are mapped to
`submitted` / `applied` semantics by the helpers.

### Procurement & Contracts (PR-24)

Six tables back the RID-fit procurement → contract workflow:

| Table | Owns | API route |
|---|---|---|
| `procurement_packages` | Solicitation (e-bidding/specific-method/selection/reverse-auction) with state machine `draft → tor_review → tender_open → evaluation → awarded`, plus absorbing `cancelled` | `GET/POST /api/procurement-packages/by-project/[projectId]`, `POST /api/procurement-packages/[packageId]/transition` |
| `tor_documents` | TOR revisions per package (incrementing `version`, optional approved-at timestamp) | `GET/POST /api/tor-documents/[packageId]` |
| `engineering_estimates` | Cost basis (`unit_price | cost_plus | lump_sum`) per package, optional BOQ link | `GET/POST /api/engineering-estimates/[packageId]` |
| `awarded_contracts` | Signed agreement coming out of `awarded`; `state` machine `draft → signed → in_force → closed | terminated`. `contracting_model` reuses the PR-RID-A enum | `GET/POST /api/awarded-contracts/[projectId]` |
| `contract_amendments` | Per-contract incremental amount + schedule deltas (additive math via `applyAmendmentToContract`) | `GET/POST /api/contract-amendments/[contractId]` |
| `contractor_prequalifications` | PQ-AHP reference records per project. Full AHP scoring deferred post-MVP; `ahpScore` nullable | `GET/POST /api/contractor-prequalifications/[projectId]` |

Pure helpers live in `src/lib/rid/procurement-helpers.ts`:

- `canTransitionProcurement(from, to)` — gates every package state change.
- `isEstimateBasisCompatible(basis, contractingModel)` — guard against
  estimating on a basis the eventual contract cannot price.
- `applyAmendmentToContract(contract, amendment)` — derive effective
  amount + expiration after applying one amendment. Compose by folding.

All routes follow the standard auth pattern (`requireProjectAccess` +
`canPerformProjectAction(..., 'edit_basic')`) and emit audit events on
successful writes.

### External integrations (PR-30b)

PR-30b ships **discovery only** for four out-of-process Thai government
systems: e-GP (procurement), GFMIS (fiscal disbursement), PFMS-SP2
(project / financial reporting), and PBMS (project budget monitoring).

**No new tables, no new API routes, no HTTP clients.** Every track
contributes only:

- `src/lib/integrations/<system>/contract.ts` — Zod schemas for the
  wire shape we expect.
- `src/lib/integrations/<system>/fixtures/*.json` — synthetic request /
  response payloads (`*.sample.json` for documented systems,
  `*.stub.json` for placeholder systems). Every fixture parses cleanly
  against the matching schema; the round-trip is locked by
  `integration-manifest.test.ts`.
- optional pure helpers (`e-gp/linker.ts` →
  `eGpReferenceForContract(contract)`, `gfmis/cost-center-mapping.ts` →
  `gfmisCostCenterFor(orgUnit)`) bridging PQM domain entities to the
  external system's identifiers — no HTTP, no randomness.

Maturity per system:

| System | Maturity | Notes |
|---|---|---|
| e-GP | `documented` | Schema mirrors the public notice projection at procurement.rid.go.th |
| GFMIS | `documented` | Schema mirrors the public ขบ./ขจ./PY document conventions |
| PFMS-SP2 | `placeholder` | Wire format pending RID-IT validation at demo |
| PBMS | `placeholder` | Wire format pending RID-IT validation at demo |

**Authoring rule.** Adding a new fixture means:

1. Drop the JSON under `src/lib/integrations/<system>/fixtures/`.
2. Add the matching Zod schema export to the system's `contract.ts`.
3. Append an entry to `INTEGRATION_FIXTURES` in
   `src/lib/integrations/manifest.ts`.

`integration-manifest.test.ts` fails loudly if any of those three steps
is missing — it walks the disk and the manifest in both directions.

The actual adapter PRs are post-MVP. See
`docs/integrations/INTEGRATION_DISCOVERY.md` for the per-system
discovery doc and `docs/integrations/POST_MVP_ROADMAP.md` for the
roadmap entries.

### Mock Data Reference

The primary demo project is "โครงการปรับปรุงนิทรรศการดาราศาสตร์" (PJ-2569-0012), budget 12.5M THB, progress 65%, SPI 0.92, CPI 1.05. All 15 JSON fixture files, personnel names, and EVM time-series data are documented in detail in the data schema comments within each `src/data/*.json` file.

### งวดงาน-driven payment flow (PR-23, behind `FEATURE_RID_PAYMENT_FLOW`)

A `WorkPeriod` (งวดงาน) is the contract-level unit of progress + payment.
Each งวด carries its own deliverable checklist, ใบส่งมอบงาน (delivery
slip), committee inspection record, and payment voucher. Feature is
gated by the env flag `FEATURE_RID_PAYMENT_FLOW`; routes return
`503 FEATURE_DISABLED` BEFORE auth when the flag is off.

Lifecycle is delivery-method aware (`src/lib/rid/work-period-state-machine.ts`):

- `in_house` skips committee inspection
  (`planned → in_progress → submitted → payment_requested → approved → disbursed`).
- `outsourced` / `consultant_supervised` go through committee inspection
  (`… → submitted → inspection_passed → payment_requested → …`).
- `inspection_failed → in_progress` is the only legal exit from
  `inspection_failed` (rework).
- `cancelled` is reachable from every non-terminal state and is itself
  terminal.

Entities + persistence (always wired; the flag only gates reachability):

- `src/types/work-period.ts` + `src/lib/db/schema/work-period.schema.ts`
- `src/types/delivery-slip.ts` + `src/lib/db/schema/delivery-slip.schema.ts`
- `src/types/committee-inspection.ts` + `src/lib/db/schema/committee-inspection.schema.ts`
  — distinct from the existing `InspectionRecord` / ITP module, which
  models execution-time QC.
- `src/types/payment-voucher.ts` + `src/lib/db/schema/payment-voucher.schema.ts`

API surface (under the flag):

- `GET|POST /api/work-periods/by-project/[projectId]` — list + create.
  Sibling-aware path (Next.js disallows sibling `[projectId]` and
  `[workPeriodId]` slugs at the same depth); matches PR-24's
  `/api/procurement-packages/by-project/[projectId]` convention.
- `POST   /api/work-periods/[workPeriodId]/transition` — body
  `{ targetState }`. Consults the pure state machine using the parent
  project's `deliveryMethod`. Returns `409 STATE_TRANSITION_REJECTED`
  with a human-readable `reason` when the state graph rejects, or
  `409 EVIDENCE_REQUIRED` when a target state needs a supporting
  delivery slip / committee inspection / payment-voucher record that
  is missing (see `evidenceRequirementForState` in the state-machine
  module).
- `GET|POST /api/delivery-slips/[workPeriodId]`
- `GET|POST /api/committee-inspections/[workPeriodId]`
- `GET|POST|PATCH /api/payment-vouchers/[workPeriodId]` — PATCH writes
  go through `canTransitionPaymentVoucher` so callers cannot skip
  stages (e.g. `draft → paid`) or reverse terminal states; honours
  `voucherNumber` only at the `approved` transition, `paidAt` at `paid`.

Feature flags: `src/lib/feature-flags.ts` — `isFeatureEnabled(name)` returns
`true` only for `'true' | '1' | 'on'` (case-insensitive). Two flags gate this
flow end-to-end: `FEATURE_RID_PAYMENT_FLOW` (server — ungates the API routes)
and its client mirror `NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW`
(`feature-flags-client.ts` — shows the งวดงาน nav item); **both** are required.
The helper defaults OFF when a flag is unset, but the committed `.env` sets
both to `true`, so the flow is **ON by default in every environment**. Override
per-env via `.env.local` or Vercel dashboard vars (which win over `.env`) — e.g.
to force it OFF in a specific preview.

### IT projectClass extensions (PR-30a)

PR-30a extends RID's IT-class project handling per the DT6 Digital
Project Management Document. Three new entities + a tabset on the
project detail page surface vendor contracts, sprints, and free-form
DT6 notes:

| Table | Owns | API route |
|---|---|---|
| `vendor_sows` | Statement of Work per phase + UAT criteria + warranty + state machine `draft → agreed → in_delivery → uat → accepted | rejected`, with `rejected → in_delivery` rework. `accepted` is terminal | `GET/POST /api/vendor-sows/by-project/[projectId]`, `POST /api/vendor-sows/[sowId]/transition` |
| `it_sprints` | Hybrid-Agile sprints nested in lifecycle stage. Velocity + completed points drive a `on_track | at_risk | off_track` health band via `computeSprintHealth` | `GET/POST /api/it-sprints/by-project/[projectId]`, `PATCH /api/it-sprints/[sprintId]` |
| `knowledge_area_notes` | DT6 per-area free-form notes. Three canonical areas — `integration`, `communication_plan`, `formal_procurement_plan` — drawn from RID's DT6 (NOT PMBOK). Versioning is monotonic per `(projectId, area)` | `GET/POST /api/knowledge-area-notes/by-project/[projectId]?area=…` |

Pure helpers live in `src/lib/rid/it-class-helpers.ts`:

- `canTransitionSow(from, to)` — gates every SOW state change.
- `isSprintComplete(sprint, now)` — predicate for "ended in past + velocity recorded".
- `computeSprintHealth(planned, completed)` — deterministic banding (≥ 0.85 / ≥ 0.60 / else).

All routes are gated by `requireItProject(projectId)` in
`src/lib/rid/it-project-guard.ts` — non-IT projects receive
`422 IT_ONLY_FEATURE` BEFORE any write lands. The UI tabset
(`_components/ItProjectTabs.tsx`) is rendered only when
`project.projectClass === 'it'`.

Per stakeholder guidance: do NOT introduce PMBOK terminology in any
new code on this surface — DT6 is the canonical vocabulary.
### Handover (PR-26)

PR-26 implements RID SOP 8.1 (`การส่งมอบ-รับมอบ`) and 8.10 (operational
quality). A `HandoverPacket` aggregates the artifact set required to
transition a project out of `construction` and into `om`:

| Table | Owns | API route |
|---|---|---|
| `handover_packets` | Workflow state machine `draft → submitted → committee_review → accepted | rejected` (with `rejected → draft` revise loop). Optional `contract_id` link to PR-24 contract for warranty derivation; `warranty_start_date` / `warranty_end_date` derived on acceptance from `contract.warrantyMonths` | `GET/POST /api/handover-packets/by-project/[projectId]`, `POST /api/handover-packets/[packetId]/transition` |
| `as_built_drawings` | As-built drawings register (drawing number + revision + optional DocumentFile id) | `GET/POST /api/as-built-drawings/[packetId]` |
| `om_manual_entries` | O&M manual catalogue, one entry per `OmManualCategory` (`operations / maintenance / safety / spare_parts`) | `GET/POST /api/om-manual-entries/[packetId]` |
| `asset_registrations` | RID asset-system-compatible asset register (asset code + type + installed-at + initial value + optional GFMIS cost center) | `GET/POST /api/asset-registrations/[packetId]` |

Pure helpers live in `src/lib/rid/handover-helpers.ts`:

- `canTransitionHandover(from, to)` — gates every packet state change;
  rejects self-transitions, illegal edges, and exit attempts from the
  terminal `accepted` state.
- `computeWarrantyWindow(acceptedAt, warrantyMonths)` — derives the
  warranty `{ start, end }` pair when both are set; clamps to last-day-
  of-month on roll-over (Jan 31 + 1 month → Feb 28 / 29).
- `isHandoverComplete(input)` — SOP 8.1 minimum-artifact gate: at least
  one as-built drawing, an O&M manual entry per category, and at least
  one asset registration. Returns a stable `missing` key array on
  failure (`as_built_drawings`, `om_manual_<category>`,
  `asset_registrations`).

The transition route gates moves into `submitted` / `committee_review` /
`accepted` on `isHandoverComplete` (`409 INCOMPLETE_HANDOVER` with the
`missing` array). State-machine rejection is `409 INVALID_TRANSITION`
with a human-readable `reason`. Acceptance fills `acceptedAt`,
`acceptedBy`, and the warranty window when a linked contract has
`warrantyMonths` set.

The `om` lifecycle stage also gains a required `handover_packet_accepted`
entry in `LIFECYCLE_STAGE_ARTIFACTS` (`src/lib/rid/lifecycle-artifacts.ts`)
so projects cannot enter the operations stage without an evidenced
handover.

---

## PMQA (PR-28)

PR-28 wires the ก.พ.ร. OPDC PMQA framework into the executive dashboard,
scoped to the three categories most relevant to project management:

- **Category 2 — Strategic Planning** (`computeStrategyAlignment`)
- **Category 6 — Process Management** (`computeProcessMaturity`)
- **Category 7 — Results** (`computeResults`)

Categories 1 / 3 / 4 / 5 (Leadership, Customer Focus, Measurement,
Workforce) are deferred post-MVP.

**No new tables.** All indicators read existing project / quality-gate /
ITP / inspection / lifecycle-history data and compute deterministic
PMQA 1–5 maturity scores via the percent banding
`scorePercentBand()` in `src/lib/pmqa/category-2-strategy.ts`
(≥90 → 5, ≥80 → 4, ≥70 → 3, ≥60 → 2, else 1).

```
src/lib/pmqa/
├── pmqa-types.ts            # PmqaCategory, PmqaIndicator, PmqaScore
├── category-2-strategy.ts   # strategy_alignment_percent, portfolio_balance
├── category-6-process.ts    # lifecycle_stage_progression, on_time_stage_transitions_percent, quality_gate_pass_rate
├── category-7-results.ts    # on_time_percent, on_budget_percent, inspection_completion_rate
├── pmqa-rollup.ts           # rollupAllCategories(...) → PmqaScore
├── pmqa-export.ts           # toExportRows(score) → ExportRow[]
└── *.test.ts
```

The roll-up rule is mean-of-mean: `categoryAverage = mean(indicator.score)`,
`overallScore = mean(categoryAverages)`, both clamped to `[1, 5]`.

### API

`GET /api/pmqa` returns the rolled-up `PmqaScore` for the caller's
visible projects (`getVisibleProjectsForUser` — same pattern as
`/api/projects`). Pass `?projectId=…` to scope to a single project; the
project must be in the caller's visible set or the route returns 403.
Use the `usePmqa()` React Query hook on the client.

### Export

`buildPmqaExportDocument(score)` in `src/lib/export-documents.ts`
reuses the existing `ExportDocument` / `openPrintableReport` pipeline —
no new export dependencies. The "ส่งออก ก.พ.ร. (Export OPDC)" button on
the executive dashboard wires this to the PDF print flow.

### Adding a new PMQA indicator

1. Pick the category file (`category-2-strategy.ts`, `category-6-process.ts`,
   or `category-7-results.ts`).
2. Add the indicator definition, returning `{ key, category, label,
   value, unit, score, benchmark?, rationale }`. Bands MUST be
   deterministic given the inputs.
3. Extend the matching `*.test.ts` with `it.each` cases covering empty
   input, threshold boundaries, and at least one each of "good" and
   "bad" portfolios.
4. The roll-up + export pick the indicator up automatically — no other
   edits required.

---

### RID reporting templates (PR-29)

PR-29 ships three deterministic RID e-GP progress-report builders. The
discovery write-up + stakeholder-review checklist lives in
`docs/rid-reporting-templates.md`.

```
src/lib/rid/reporting/
├── reporting-types.ts        # RidReportKind, RidReportSection, RidReportData
├── reporting-helpers.ts      # signatory block, period/header/photo helpers
├── monthly-report.ts         # buildMonthlyReport(...)
├── work-period-report.ts     # buildWorkPeriodReport(...)
├── delay-report.ts           # buildDelayReport(...)
└── *.test.ts                 # snapshot + unit tests
```

**No new tables.** Each `build*Report` is pure: domain objects in,
`RidReportData` out. Snapshot tests lock the structural output exactly
— field-label drift after stakeholder review = update the snapshot
deliberately. All `generatedAt` and `evaluationDate` inputs are
caller-supplied so tests stay deterministic (no `Date.now()`).

**API.** `GET /api/reports?projectId=…&kind=monthly|work_period|delay`
returns `RidReportData`. Auth via `getActiveUser` + `requireProjectAccess`.
Monthly requires `periodStart` + `periodEnd`; work_period requires
`workPeriodId`; delay accepts an optional `evaluationDate`. Use the
`useRidReport()` React Query hook on the client.

**Export.** `buildRidReportDocument(report)` in
`src/lib/export-documents.ts` re-uses the existing
`ExportDocument` / `openPrintableReport` pipeline (no new export
dependencies). The "ออกรายงาน RID (Export Report)" dropdown on the
project overview page wires the three kinds to the PDF print flow.

**Signatory block.** Always three rows in PM → Engineer → Witness
order. `name` is `null` when no candidate is known (renders as `—`
for hand-fill); `signedAt` is never auto-filled.

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
