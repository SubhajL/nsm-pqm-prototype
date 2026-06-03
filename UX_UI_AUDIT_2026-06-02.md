# NSM PQM — UX/UI Audit (2026-06-02)

> Companion to [`UX_UI_REDESIGN_PLAN.md`](./UX_UI_REDESIGN_PLAN.md). Audits
> implementation status of every plan PR + tracks ad-hoc gaps surfaced
> while reviewing live screens against the design system.
>
> **Method:** read `UX_UI_REDESIGN_PLAN.md` → systematic codebase audit
> (PR-by-PR, with file:line evidence) → cross-reference against the Project
> Overview screen → synthesise gaps the plan didn't catch.
>
> **Last refreshed:** 2026-06-02 (PM). The earlier morning revision missed
> three PRs (#41 B1, #42 B2, #43 C3) that landed 2026-05-31 — the snapshot
> below is the re-verified state after PR #71 (G15/G16/G17/G19 closures)
> and PR #72 (G20 + EVM half of C3) landed. See Appendix B for the
> retrospective on what the earlier revision got wrong.

---

## Part 1 — Plan implementation snapshot

| Phase | PRs | Done | Partial | Not Done |
|---|---|---|---|---|
| **A — Foundations** | A1·A2·A3·A4 | **4/4** | 0 | 0 |
| **B — Critical** | B1·B2·B3 | **3/3** | 0 | 0 |
| **C — Dashboards/Tables** | C1·C2·C3 | **2 (C1·C3)** | **1 (C2)** | 0 |
| **D — Forms** | D1·D2 | **2/2** | 0 | 0 |
| **E — Polish** | E1·E2 | **1 (E1)** | **1 (E2)** | 0 |
| **F — Stitch redesign** | per screen | optional, not started | — | — |
| **Total** | 14 + F | **12** | **2** | **0** |

≈86% complete (against the original 14-PR plan). Every plan PR has at
least partially shipped; the remaining work is scoped inside C2 (table
density) and E2 (filter-chip + notification-timestamp polish). G18
(header-chip de-emphasis) was closed by the Tier-1 bundle that
followed this audit refresh.

What's actually left of the plan, in one sentence each:

- **C2** — `align:'right'` is broadly adopted (4+ register tables), but
  there's still no density toggle, no column-settings panel, and no
  ProTable integration. ProComponents-on-AntD-5 remains the lift.
- **E2** — sidebar selected-state polish + KPI hover transitions shipped
  via the dark-mode PR (#61); header-chip de-emphasis (G18) closed by
  the Tier-1 bundle. CTA hierarchy, KPI filter-chip separation, and
  notification timestamps still remain.

---

## Part 2 — Gaps not in plan (post-implementation observations)

Six concrete defects flagged in the earlier revision. **Five are now
closed** by PRs #71 + #72; one (G18) remains. The g-check on PR #72
also surfaced a structural gap (G21) worth tracking even though it's
not a regression.

| # | Gap | File:line | Status | Closed by |
|---|---|---|---|---|
| **G15** | KPI value colours bypassed A1's AA-safe `*Text` variants. `KPICard` applied raw brand `color` to `Statistic.valueStyle.color`. | `src/components/common/KPICard.tsx:97` | ✅ **Closed** | PR #71 — `resolveStatisticValueColor()` maps brand status colours → `*Text` variants |
| **G16** | "Paid to Date" rendered twice on Project Overview in disagreeing formats (`฿7,272,000` vs `7.3M฿`). | `src/app/(dashboard)/projects/[id]/_components/ProjectKPICards.tsx` | ✅ **Closed** | PR #71 — Card 1 progress + Card 3 outsourced both now use `formatBahtShort` (identical compact values) |
| **G17** | `formatBahtShort` suffix-ordered the ฿ symbol (`"12.5M฿"`), violating the CLAUDE.md Intl rule. | `src/lib/date-utils.ts → formatBahtShort` | ✅ **Closed** | PR #71 — rewritten with `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', notation: 'compact' })` |
| **G18** | Hero card stacked 5 colored chips at equal weight — descriptive metadata competed with the actual delayed/at-risk status signal. | `src/app/(dashboard)/projects/[id]/_components/ProjectHeaderCard.tsx:60-77` | ✅ **Closed** | Tier-1 bundle — status badges now lead the chip row; the three descriptive Tags (projectClass / deliveryMethod / contractingModel) drop their colored fills and render as neutral outlined Tags |
| **G19** | C1's `delta` + `freshness` fields existed on KPICard but Project Overview never passed them. | `src/app/(dashboard)/projects/[id]/_components/ProjectKPICards.tsx` | ✅ **Closed** | PR #71 — SPI/CPI deltas via `computeRatioKpiDelta`; freshness via `buildPortfolioFreshness([project], new Date())` plumbed from `page.tsx` |
| **G20** | Delayed milestone progress bars rendered in brand blue instead of red/amber — visual story contradicted the chip. | `src/app/(dashboard)/projects/[id]/_components/MilestonesCard.tsx:72` | ✅ **Closed** | PR #72 — `resolveMilestoneProgressStrokeColor()` routes stroke through a status-aware lookup |
| **G21** *(new)* | Status → colour mapping fragmented across **four** overlapping modules with three different key vocabularies (`milestone-progress-color`, `kpi-card-color`, `status-visual`, `StatusBadge.HEALTH_STATUS`). A brand-colour refresh now requires touching four files. | (see Appendix C for the inventory) | 🟠 **Open** (architectural) | — |
| **G22** *(new)* | `SCurveChart` (PR #43) hand-rolled its own `markLine` instead of using the `chart-helpers.todayMarkLine` helper PR-A4 introduced. | `src/components/charts/SCurveChart.tsx:143-160` | ✅ **Closed** | Tier-1 bundle — `todayMarkLine` extended with `color` + `labelFontWeight` options; `SCurveChart` now spreads the helper output and only overrides `data` for the numeric `lastIndex` |

---

## Part 3 — Per-PR detail (with evidence)

| PR | What it shipped | What's missing |
|---|---|---|
| **A1** ✅ | `TYPE_SCALE`, `SPACING`, `*Text` AA-safe colour variants, contrast test, palette lock-in test (`src/theme/`). PR #71 closed the one consumer drift (G15). | — |
| **A2** ✅ | `SkipLink`, `LiveRegion`, `announce()`, `<main tabIndex={-1}>` in dashboard layout (`src/components/a11y/`) | — |
| **A3** ✅ | `EmptyState`, `SearchBar`, `FilterBar`, `FormSection`, `StatusIndicator`, `LoadingSkeleton`, `WizardActionFooter` (`src/components/common/`) | — |
| **A4** ✅ | `EChartsWrapper`, `aria.decal.show:true`, `ACCESSIBLE_CHART_PALETTE`, `chart-formatters`, palette contrast test | — |
| **B1** ✅ | PR #41 (2026-05-31): wbs/documents/audit/evaluation pages all use `xs={24}` fallback + responsive lg/xl spans | — |
| **B2** ✅ | PR #42 (2026-05-31): `InspectionAlertBanner` is a single priority-ordered banner (fail items > auto-NCR > hold point); `PhotoSection` uses `xs={12} sm={8} md={6}` responsive grid | — |
| **B3** ✅ | A3 primitives consumed in WBS, daily-reports list, documents, modals (PR #50) | — |
| **C1** ✅ | PR #52 KPICard.delta + freshness API; Dashboard + Executive watchlist bound to real data; **PR #71** closed the Project Overview adoption gap (G19) | — |
| **C2** ⚠️ | `align:'right'` adopted in 4+ register tables (`BoqTablePanel`, `FilesTablePanel`, `ProjectsTable`, `ChangeRequestHistoryTable`). `Card size="small"` / `Table size="small"` used widely | No density toggle, no column-settings panel, no ProTable integration; case-insensitive search lives in A3's `SearchBar` but registers haven't all switched to it |
| **C3** ✅ | PR #43 S-curve labeled "Latest" marker, area variance, localised tooltips. **PR #72** wired the equivalent "Latest" marker on the CPI/SPI trend chart via the new `markLatestPoint` prop. | Comparison chart on `/progress` is still not built; not strictly in the plan's PR-C3 scope (was in the "open" header) |
| **D1** ✅ | StepsForm, `WizardActionFooter`, `useUnsavedChangesGuard`, `formatBahtLive`, fieldsets (`/projects/new`, `/daily-report`) | — |
| **D2** ✅ | Approval steps derived from real data (PR #46); CR Tag colour driven by `CR_STATUS_LABELS` (per-status `{ label, color }`); CR budget-impact rendered with sign-aware tint in the history table (positive = red cost increase, negative = green savings — verified intentional, see Appendix B) | — |
| **E1** ✅ | `dark-theme.ts`, `darkAlgorithm`, `ThemeToggle`, `prefers-color-scheme` detection (PR #61). Sidebar selected-state polish bundled. | — |
| **E2** ⚠️ | Sidebar polish + KPI hover transitions shipped via PR #61. Milestone tint by status shipped via PR #72. **Header-chip de-emphasis (G18) closed by the Tier-1 bundle.** | CTA hierarchy not differentiated; KPI filter-chip separation absent; notification timestamps missing |

---

## Part 4 — Per-screen status (worst-first, reprised from plan §2B)

| Screen | 2B priority | Status now | Still owing |
|---|---|---|---|
| QC Inspection | 🔴 | ✅ B2 consolidated alerts; photo grid responsive | — |
| WBS / BOQ | 🔴 | ✅ responsive (PR #41); right-align numbers (`BoqTablePanel`) | C2 density toggle / column settings |
| Documents | 🔴 | ✅ responsive (PR #41); signed-URL fix (PR #68) | C2 density toggle / column settings |
| Gantt | 🔴 | unchanged | CPM/dependency arrows + drag-resize (out of plan) |
| Daily Report | 🟠 | ✅ wizardised (D1) | photo preview / map picker (out of plan) |
| Audit Log | 🟠 | ✅ responsive (PR #41) | C2 density / column settings; A3 search adoption unverified |
| Admin | 🟠 | 3 of 4 tabs still "under development" | not in plan |
| Risk | 🟠 | A3 search/filter primitives available | C2 density; modal stale-value + heat-map axes |
| New Project | 🟠 | ✅ wizardised (D1) | — |
| S-Curve / EVM | 🟠 | ✅ labeled "Latest" marker on S-curve (PR #43) + CPI/SPI trend (PR #72); SCurveChart now consumes the `todayMarkLine` helper (Tier-1 bundle, G22); localised tooltips | progress-page comparison chart |
| Quality | 🟠 | unchanged | not in plan |
| Issues (Kanban) | 🟠 | unchanged | C2 patterns may help |
| Dashboard | 🟡 | ✅ KPI deltas + freshness | — |
| Executive | 🟡 | ✅ watchlist real-data | — |
| Progress | 🟡 | partial localisation | C3 follow-up: comparison chart |
| **Project Overview** | 🟡 | ✅ G15/G16/G17/G18/G19/G20 all closed | — |
| Approval | 🟡 | ✅ steps from real data | comments/attachments real-data check |
| Change Request | 🟡 | ✅ status colors (Tag via `CR_STATUS_LABELS`); signed budget-impact is intentional, not a defect (see Appendix B) | — |
| Evaluation | 🟡 | ✅ responsive (PR #41) | accessible score viz |
| Notifications | 🟢 | unchanged | E2 timestamps |
| Login | n/a | unchanged | n/a |

---

## Part 5 — Synthesis (meta-patterns)

The plan landed cleanly. Re-auditing reveals two patterns worth carrying forward:

1. **"DONE" vs. "ADOPTED" is no longer the same gap.** The earlier
   revision's headline finding — primitives shipped but consumers didn't
   adopt them (G15/G19) — was a real risk, and PR #71 closed it. The
   structural fix for next time is the one the earlier revision proposed:
   ship every Phase-A primitive with at least one lint rule or
   characterisation test that fails if a consumer screen doesn't
   actually use it.

2. **Audit drift is a real failure mode.** The morning revision of this
   doc claimed B1/B2/C3 were unshipped/partial, but git log showed they
   merged 2 days earlier. The lesson isn't "be more careful" — it's
   that an audit *must* be cheap to re-run. The structured file:line
   evidence per finding paid off here; the next audit-doc revision
   should include a tiny script that validates each "X is broken at
   `file:line`" claim against the current code so a stale claim
   fails CI rather than misdirecting the next session.

3. **Status-colour vocabulary fragmentation (G21) is the next foundation
   gap.** Four modules now own slightly different `status → color` maps:
   `milestone-progress-color`, `kpi-card-color`, `status-visual`,
   `StatusBadge.HEALTH_STATUS`. Each has its own key vocabulary
   (`delayed/watch/on_schedule` vs `success/warning/error/info/neutral`
   vs `normal/warning/delayed`). A brand-colour refresh would require
   touching all four. This is the equivalent of the G6/G7/G8
   per-screen-search-bar fragmentation that A3 retired — worth a
   foundation-style consolidation PR.

4. **`todayMarkLine` adoption is half-done (G22).** PR #72 used the
   `chart-helpers.todayMarkLine` helper on the CPI/SPI trend; PR #43
   hand-rolled the equivalent on the S-curve. Both need to use the
   helper for the helper to be load-bearing.

---

## Part 6 — Recommended next PRs (refreshed)

The Tier-1 bundle (G18 header chips + G22 SCurveChart helper adoption)
shipped after this audit refresh; what was a 3-item Tier 1 is now a
2-item architectural Tier 2 and a 2-item heavy Tier 3.

Tier 2 (architectural, medium effort):

| # | PR title | Closes | Effort | Risk |
|---|---|---|---|---|
| 1 | `feat(theme): canonical statusHealthVisual resolver — consolidate 4 status-color modules` | G21 | M | 🟠 Med |
| 2 | `feat(e2): CTA hierarchy + KPI filter-chip separation + notification timestamps` | E2 partial | M | 🟢 Low |
| 3 | `feat(progress): comparison chart on /progress` | C3 open header | M | 🟢 Low |
| 4 | `refactor(charts): CPISPITrendChart adopts extended todayMarkLine helper` | G22 follow-up — finishes the helper-adoption sweep started in the Tier-1 bundle; lets the inline markLine in CPISPITrendChart consume the same `color`/`labelFontWeight` options | S | 🟢 Low |

Tier 3 (large, was always going to be the heavy lift):

| # | PR title | Closes | Effort | Risk |
|---|---|---|---|---|
| 5 | `feat(c2-batch1): right-align finalisation + density toggle + column-settings panel` | C2 main gap | L | 🟠 Med |
| 6 | `feat(c2-batch2): ProTable adoption (AntD-5-pinned) on register tables` | C2 stretch | L | 🟠 Med |

**Suggested next bundle:** Tier 2 PR 1 (G21 status-colour consolidation) is
the highest-leverage foundation work — it unblocks future status-aware
changes from touching four files. Tier 2 PR 4 (CPISPITrendChart helper
adoption) is a small follow-on to the Tier-1 bundle and could ride
along if scope allows.

---

## Appendix A — Audit methodology

- Source of truth: `UX_UI_REDESIGN_PLAN.md` for the original 14-PR plan
- Spot-checked each plan PR by reading the touched files in current main
- Verified G15-G20 closures by reading the post-PR-#71/#72 state of
  `KPICard.tsx`, `ProjectKPICards.tsx`, `MilestonesCard.tsx`,
  `date-utils.ts`, `CPISPITrendChart.tsx`
- Surfaced G21 and G22 from the g-check reports on PRs #71 + #72
- Cross-referenced everything against the CLAUDE.md design-system rules
- Today's date: 2026-06-02
- Auditor: Claude (acting as senior UX/UI reviewer)

## Appendix B — Earlier-revision retrospective

The morning revision of this doc claimed:

| Claim | Reality |
|---|---|
| B1 partial — "fixed span 10/14 persists" on wbs/documents/audit/evaluation | Closed by PR #41 (2026-05-31). All four screens use `xs={24}` responsive fallback. |
| B2 not done — "no consolidated banner; no responsive photo grid" | Closed by PR #42 (2026-05-31). `InspectionAlertBanner` is a single priority-ordered banner; `PhotoSection` uses `xs={12} sm={8} md={6}`. |
| C3 partial — "no labeled today marker" | S-curve closed by PR #43 (2026-05-31); CPI/SPI trend now also closed by PR #72. |
| C2 not done — "No `align:'right'`, no density toggle, …" | Right-align is shipped in 4+ register tables. Density toggle and ProTable integration are the only remaining items. |
| D2 partial — "CR has no status-color mapping; block negative budget delta" | `CR_STATUS_LABELS` drives Tag colour in `ChangeRequestHistoryTable.tsx:40-45`. **Negative budget delta is intentional, not a defect** — see the D2 retrospective entry below. |

Root cause: the morning audit was authored without running `git log`
against the audit's date range. Next time, the audit script (Appendix
C below) should include a "every claim has a `file:line` that exists
in current main" pre-flight.

### D2 retrospective — the "block negative" claim was wrong

The morning audit's Part-6 PR 10 recommended `fix(d2): change-request
status colors + negative-budget block`. The refreshed (afternoon) audit
propagated the "block negative" half into Tier 1 PR 1 without
re-verifying. The Tier-1 implementation pass caught it:

- **Type contract** (`src/types/document.ts:144`): `budgetImpact: number`
  — signed, no constraint.
- **Seed data** (`src/data/change-requests.json:49`): one of three
  seeded CRs has `"budgetImpact": -50000`. A demo flow relies on
  negative being a legitimate value.
- **History table render** (`ChangeRequestHistoryTable.tsx:50-58`):
  positive deltas are tinted **red** and prefixed `+` (cost increase);
  negative deltas are tinted **green** (cost savings). The table
  author deliberately encoded the savings semantics.
- **Construction-domain reality:** descope CRs, value-engineering CRs,
  and contingency-release CRs all produce negative budget deltas.

Blocking negative would have broken the seeded demo, contradicted the
table's own visual language, and removed a real workflow. The Tier-1
bundle therefore dropped PR 1 entirely. D2 is fully shipped at the
implementation level; what looks like a "missing validation" is
actually intentional signed-number semantics.

**The lesson:** even when an audit doc lists a `file:line` for a
"defect," the next pass must verify the defect against (a) the
domain type, (b) seed/test data, and (c) downstream renderers
before treating it as work-to-do. Two audit revisions in a row missed
this for D2.

## Appendix C — Status-colour module inventory (G21)

For the consolidation PR (Tier 2 #4):

| Module | Keys | Output | Consumer |
|---|---|---|---|
| `src/components/common/status-visual.ts → resolveStatusVisual` | `success / warning / error / info / neutral` | `{ color, icon, textColor }` | `StatusIndicator` |
| `src/components/common/kpi-card-color.ts → resolveStatisticValueColor` | brand hex (e.g. `COLORS.warning`) | AA-safe `*Text` hex | `KPICard` |
| `src/components/common/StatusBadge.tsx → HEALTH_STATUS` | `normal / warning / delayed` | `{ label, color: AntD-color-keyword }` | `StatusBadge type="health"` |
| `src/app/(dashboard)/projects/[id]/_components/milestone-progress-color.ts → resolveMilestoneProgressStrokeColor` | `delayed / watch / on_schedule / not_started` | `*Text` hex | `MilestonesCard` Progress |

Plus the AntD `Tag color={...}` accepting either the colour keyword set
(`"red" / "gold" / "blue"`) or a hex token, used in
`ProjectHeaderCard`, `CR_STATUS_LABELS`, etc. — a fifth, more
diffuse, vocabulary.

Consolidation target: one `resolveHealthVisual(status, surface)`
returning `{ fill, stroke, text, icon, badgeColor }` that the four
existing modules become thin adapters over (or are deleted in favour
of). The g-check on PR #72 captured the full failure scenario.
