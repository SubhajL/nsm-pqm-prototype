# NSM PQM — UX/UI Redesign Analysis & PR Roadmap

> Deliverable for the "modern & beautiful redesign" initiative.
> Combines (1) cited web research on PM/PMIS design best practices, (2) a gap
> analysis of all 20 live screens, and (3) a sequenced PR roadmap.
>
> **Method:** 5-angle fan-out web research (22 sources fetched, 100 claims
> extracted, 25 adversarially verified → 24 confirmed / 1 refuted) + a full
> read-only codebase inventory of every `(dashboard)` route and the shared
> design system. Confidence tags below reflect verification votes.

---

## Part 1 — Research: Themes to Emulate + Best Practices per Screen Archetype

### 1A. Top design systems / themes worth emulating

| # | System | Why emulate it | Fit for us |
|---|---|---|---|
| 1 | **IBM Carbon** | Best-in-class **accessibility-first data viz**: purpose-first chart selection, decal/texture encoding, color themes target WCAG 2.1 AA contrast. Conforms to IBM Accessibility Checklist (WCAG AA / Section 508 / EN). | Direct model for our ECharts work + token contrast. **[high]** |
| 2 | **Salesforce Lightning (SLDS)** | Complex, data-heavy enterprise UIs at scale; mature data-table + density patterns. | Model for our tables/registers. **[high]** |
| 3 | **Ant Design ProComponents (ProTable / ProForm)** | Native AntD page-level CRUD components — toolbar, density toggle, column settings, search forms, step forms — exactly our stack. | Adopt directly. ⚠️ ProComponents 3.x targets AntD 6; we're on AntD 5 → pin the matching earlier ProComponents version. **[high]** |
| 4 | **Goldman Sachs GS** | Reference for data-dense financial tables/charts/real-time displays. | Conceptual only — ⚠️ removed from public access mid-2024. **[high]** |
| 5 | **Atlassian Design System (Jira/Trello)** | Canonical PM-app patterns for **Kanban boards & Gantt/timeline** (the two archetypes our verified research flagged as open questions). | Expert recommendation — *not* in the verified citation set; treat as design reference, validate before adopting. **[unverified — author recommendation]** |

### 1B. Best practices by screen archetype (all **[high]** unless noted)

**Portfolio / KPI dashboards** *(→ `/dashboard`, `/executive`, `/projects/[id]`)*
- Summary-first, top-to-bottom + left-to-right; most important charts & scorecards top/upper, critical KPIs **top-left** (Z/F-pattern). Inverted pyramid: status/targets top → trends/comparisons middle → details/owners/links bottom. *(AntD visualization spec — our own library)*
- **Limit to 5–9 modules** per screen to avoid overload (AntD: "Try to…", a recommendation not a hard rule).
- A dashboard should answer the team's **top two questions in ~10 seconds**.
- **Every KPI must be framed with context**: comparison (vs baseline/plan/last period), scope, freshness, nuance. "A single number answers nothing on its own." Directly applies to EVM SPI/CPI vs plan.

**Data-dense tables** *(→ projects table, WBS/BOQ, risk register, audit log, ITP, daily reports)*
- **Left-align text, right-align numbers** (`align:'right'` in AntD) for easy vertical comparison.
- Offer **user-adjustable density**: condensed ≈40px / regular ≈48px / relaxed ≈56px (convention, not a standard; AntD presets are small/middle/default).
- Support the **four core user tasks**: find records by criteria, compare data, view/edit/add a single row, take actions on records — these dictate the feature set.
- For large datasets: **fixed/sticky headers, horizontal scroll with row/column freeze, resizable & reorderable columns, in-column filter/search, density toggle, sort, pagination/lazy-load, data summaries.** Use progressive disclosure so controls don't overwhelm.
- ❌ **Refuted (0-3):** "numbers need a monospace font." Do **not** adopt.

**Forms** *(→ new project, daily report, all create/edit modals, approval, change request)*
- **Group related controls** with `<fieldset>` + `<legend>` (radio groups always). W3C-WAI primary standard — highest authority.
- (Author guidance) For long forms (Daily Report has 8 sections), use **step/wizard or ProForm.StepsForm**; show progress; sticky action footer.

**S-curve / EVM analytics** *(→ `/s-curve`, `/progress`)*
- **Purpose-first chart selection**: pick purpose, then chart type. For trends over time (planned vs earned vs actual), **Line & Area are the primary types** (Carbon "Trends" category) → ECharts line/area series.

**Charts / data-viz (cross-cutting, ECharts)**
- **Never rely on color alone**: label directly + texture encoding. ECharts 5 **decal patterns** for color-blind safety — enable `aria.enabled:true` + `aria.decal.show:true`. (WCAG SC 1.4.1.)
- Semantic table markup (`thead`/`tbody`/scoped headers) + **full keyboard operability** of filters, date pickers, sliders, tooltips. (WCAG 1.3.1 / 2.1.1; legally mandated for gov dashboards.)

**Accessibility (the binding constraint, all screens)**
- **WCAG 2.2 AA**: ≥4.5:1 normal text, ≥3:1 large text (SC 1.4.3); **≥3:1 non-text** for UI components/states & graphical objects required to understand content (SC 1.4.11 — excludes purely decorative borders/chart colors also conveyed another way).

**Thai-government bilingual specifics**
- Thai UIs should **exceed** the 4.5:1 WCAG minimum for body text (intricate letterforms + diacritics/sara marks). *(Peer-reviewed Punsongserm & Suvakunta 2024 — credible but single research group; measures derive from mobile/print studies, translate to web px/rem.)*
- Use **conventional looped Thai typefaces** (e.g. Noto Sans Thai — already our rule) for dense body text; restrict Roman-like/loopless faces to headlines/large sizes; respect a minimum body size (research baseline 1.3mm Bo Baimai loop height → translate to px/rem).

### 1C. Open questions the research could NOT close (validate during design)
1. Concrete WCAG-exceeding contrast target for Thai gov (7:1/AAA? script-specific?) and the px/rem translation of the 1.3mm minimum for Noto Sans Thai.
2. **Kanban & Gantt** density/layout conventions — no claims survived verification (→ lean on Atlassian as reference).
3. Approval-workflow UI specifics (multi-step status viz, action affordances, audit trail, role gating) beyond fieldset grouping.
4. ECharts palette that simultaneously satisfies 3:1 non-text contrast + color-blind decals + our mandated `#1E3A5F` / `#00B894` tokens for EVM/S-curve series.

---

## Part 2 — Gap Analysis: Live Screens vs. Best Practices

### 2A. Systemic gaps (whole app)

| # | Gap | Best practice violated | Severity |
|---|---|---|---|
| G1 | **Responsive breakage** — WBS (`span 10/14`), Documents (7-col on iPad), Gantt timeline header, Audit right panel (7-col), Evaluation (2-col never stacks) | Enterprise responsive density | 🔴 High |
| G2 | **Missing loading states** — charts/tables/modals often render blank or block on a full-page spinner | Perceived performance | 🔴 High |
| G3 | **No empty states** — WBS BOQ, daily reports, risk, issues show blank tables | Table UX (4 user tasks) | 🟠 Med |
| G4 | **Accessibility foundation absent** — no skip-link, color-only status, modals may not trap/restore focus, missing ARIA live regions, unlabeled custom controls | WCAG 2.2 AA (1.4.1/1.4.11/2.1.1/4.1.2) | 🔴 High |
| G5 | **Chart tooltips not localized / no decals** — raw `1000000` not `฿1.0M`; no color-blind texture; unlabeled axes | ECharts aria.decal; KPI context; WCAG 1.4.1 | 🟠 Med |
| G6 | **Inconsistent tables** — number columns not right-aligned; no density toggle; no column settings; ad-hoc per-page search/filter | SLDS/Carbon/ProTable table patterns | 🟠 Med |
| G7 | **Inconsistent filters/search** — Segmented vs Tabs vs Button-group vs bespoke; case-sensitive search; no shared SearchBar/FilterBar | Consistency | 🟠 Med |
| G8 | **Complex forms lack structure** — Daily Report (8 sections) & New Project (4) have no step/progress; no fieldset grouping; validation only on submit; no unsaved-changes guard | W3C fieldset/legend; ProForm | 🟠 Med |
| G9 | **KPIs lack context framing** — most KPI cards show a bare number, no vs-plan/baseline delta, scope, or freshness | "Frame every metric" | 🟠 Med |
| G10 | **Thai typography/contrast not tuned** — relies on AntD defaults; no verified contrast pass; no body-size floor for Thai | Thai legibility research; WCAG | 🟠 Med |
| G11 | **No dark mode** — single light theme, no system-preference detection, Tailwind/AntD tokens not exposed as CSS vars | (Polish; not a standard) | 🟢 Low |
| G12 | **Hardcoded demo data in UI** — Approval (steps/attachments/comments), Executive watchlist, Audit security badges always "pass" | Data integrity / honesty | 🟠 Med |
| G13 | **Visual hierarchy** — alert fatigue (QC Inspection: 3 stacked alerts), weak CTA differentiation, subtle sidebar-selected state, KPI filter chips fused to cards | Dashboard hierarchy | 🟠 Med |
| G14 | **Inconsistent design-token discipline** — inline font sizes/magic-number spacing, no spacing/type scale, status shown 3 different ways | Design-system consistency | 🟢 Low |

### 2B. Per-screen scorecard (worst-first)

| Screen | Route | Top gaps | Priority |
|---|---|---|---|
| QC Inspection | `…/quality/inspection/[id]` | Alert fatigue (3 alerts), no mobile layout, tiny tap targets, placeholder photos | 🔴 |
| WBS / BOQ | `…/wbs` | **Layout breaks on mobile**, no empty state, weak selection cue | 🔴 |
| Documents | `…/documents` | **Breaks on tablet**, no delete confirm, no upload progress | 🔴 |
| Gantt | `…/gantt` | No CPM/dependency arrows, non-responsive timeline, no drag-resize, no legend | 🔴 |
| Daily Report | `…/daily-report` | 8-section form with no wizard/structure, no photo preview, no map picker | 🟠 |
| Audit Log | `…/admin/audit` | Right panel cramped on tablet, case-sensitive search, demo-only "pass" badges | 🟠 |
| Admin | `…/admin` | 3 of 4 tabs "under development", no delete confirm, confusing discriminated-union modal | 🟠 |
| Risk | `…/risk` | Modal keeps stale values, case-sensitive search, unexplained score formula, non-bilingual heat-map axes | 🟠 |
| New Project | `…/projects/new` | No section progress, weak draft hierarchy, no unsaved-changes guard, no live ฿ format | 🟠 |
| S-Curve / EVM | `…/s-curve` | Dense, unlabeled "today" marker, non-localized tooltips, redundant status tags | 🟠 |
| Quality | `…/quality` | No overall pass/fail signal, no delete confirm, opaque ITP link in modal | 🟠 |
| Issues (Kanban) | `…/issues` | Mobile drag-drop questionable, no per-column counts, text-only summary | 🟠 |
| Dashboard | `/dashboard` | No chart skeletons, no table empty state, KPI chips fused to cards, legend overlap | 🟡 |
| Executive | `/executive` | Hardcoded watchlist/list data, no progress-bar legend, non-functional actions | 🟡 |
| Progress | `…/progress` | No method tooltips, no status legend, no comparison chart | 🟡 |
| Project Overview | `…/projects/[id]` | KPI overflow (no ellipsis), inline icon logic, no "load more" timeline | 🟡 |
| Approval | `…/approval` | Hardcoded steps/attachments/comments, tiny step text | 🟡 |
| Change Request | `…/change-request` | No status colors, no inline validation, negative budget allowed | 🟡 |
| Evaluation | `…/executive/evaluation` | 2-col never stacks, custom circular score not accessible, unlabeled radar axes | 🟡 |
| Notifications | `/notifications` | Tab switch resets pagination, no save confirm on settings, no timestamps | 🟢 |

---

## Part 3 — PR Roadmap (sequenced)

Foundations first (PR-A1…A4) so every later screen PR inherits the upgraded
system. Branch each PR off `main`. **Note:** the working tree currently has the
in-progress PR-21b DB-cutover changes — land or stash those before starting, so
UI work stays on its own branches.

### Phase A — Design-System Foundations (unblocks everything)

| PR | Title | Scope | Closes gaps | Effort |
|---|---|---|---|---|
| **A1** | `feat(theme): WCAG-AA + Thai contrast pass & type/spacing scale` | Audit/raise token contrast to ≥4.5:1 (Thai body exceeds min); add type & spacing scales; replace inline font/margin magic numbers; document body-size floor for Noto Sans Thai | G10, G14 | M |
| **A2** | `feat(a11y): app-shell accessibility foundation` | Skip-to-content link, ARIA roles on sidebar/nav, focus-trap + restore for all modals, `aria-live` for async toasts, keyboard audit | G4 | M |
| **A3** | `feat(common): shared UX primitives` | `EmptyState`, `SearchBar`, `FilterBar`, `FormSection` (fieldset/legend), `StatusIndicator` (color+text+icon), `LoadingSkeleton`; adopt ProTable/ProForm (AntD-5-pinned version) as the table/form baseline | G3, G6, G7, G8 | L |
| **A4** | `feat(charts): localized, color-blind-safe ECharts baseline` | Shared tooltip formatter (`Intl.NumberFormat('th-TH')`, ฿/%/M), `aria.decal` on, bilingual axis labels, palette satisfying 3:1 + brand tokens, "today"/baseline legend helpers | G5 | M |

### Phase B — Critical Screen Fixes (🔴)

| PR | Title | Scope | Closes gaps | Effort |
|---|---|---|---|---|
| **B1** | `fix(responsive): WBS, Documents, Audit, Evaluation, Gantt header` | Replace fixed `span` with responsive breakpoints / stacking; adaptive Gantt timeline header | G1 | M |
| **B2** | `refactor(qc-inspection): reduce alert fatigue + mobile layout` | Collapse 3 alerts into one prioritized banner, responsive layout, larger tap targets, real photo grid | G13, G1 | M |
| **B3** | `feat(loading-empty): skeletons + empty states across data screens` | Apply A3 primitives to dashboard charts, WBS, daily reports, risk, issues, all modals (disable submit while pending) | G2, G3 | M |

### Phase C — Dashboards & Data Density (🟠)

| PR | Title | Scope | Closes gaps | Effort |
|---|---|---|---|---|
| **C1** | `feat(dashboards): context-framed KPIs + summary-first layout` | KPI deltas vs plan/baseline + freshness; reorder to Z-pattern/inverted-pyramid; ≤5–9 modules; bind Executive watchlist to real data | G9, G1, G12 | M |
| **C2** | `feat(tables): right-align numbers, density toggle, column settings` | Roll ProTable patterns into projects table, risk register, audit, ITP, daily-report list; case-insensitive search | G6, G7 | M |
| **C3** | `feat(evm): purpose-first S-curve/EVM polish` | Line/area emphasis, labeled "today" marker, localized tooltips, drop redundant tags, comparison chart on Progress | G5, G9 | S |

### Phase D — Forms & Workflows (🟠)

| PR | Title | Scope | Closes gaps | Effort |
|---|---|---|---|---|
| **D1** | `feat(forms): wizardize Daily Report + New Project` | StepsForm/progress, fieldset grouping, inline validation, unsaved-changes guard, live ฿ formatting, sticky footer | G8 | M |
| **D2** | `feat(workflows): real data for Approval + status colors for CR` | Derive approval Steps from data, real comments/attachments, color-coded CR statuses, inline validation, block negative budget | G12, G13 | M |

### Phase E — Polish (🟢)

| PR | Title | Scope | Closes gaps | Effort |
|---|---|---|---|---|
| **E1** | `feat(theme): dark mode` | Dark token set, system-preference detection, expose tokens as CSS vars, chart dark variants | G11 | L |
| **E2** | `feat(polish): micro-interactions & hierarchy` | CTA hierarchy, stronger sidebar-selected state, KPI filter-chip separation, hover/validation micro-interactions, notification timestamps | G13, G14 | S |

### Optional Phase F — Visual Redesign via Stitch (per-screen)
Once foundations (A) land, run `/build-screen` per screen: generate fresh Stitch
variants → pick → re-implement against the upgraded tokens/primitives, reusing
the existing data/API/hook layer. Sequence by the worst-first scorecard (2B).

### Suggested sequencing
```
A1 → A2 → A3 → A4   (foundations, mostly parallelizable after A1)
        ↓
B1, B2, B3          (critical fixes — can run in parallel)
        ↓
C1, C2, C3 / D1, D2 (dashboards+tables and forms+workflows in parallel)
        ↓
E1, E2              (polish)
        ↓
F (optional)        (Stitch-driven visual redesign, per screen)
```

---

## Appendix — Source quality
Primary/normative: W3C WCAG 2.2, W3C-WAI forms tutorial, IBM Carbon docs, Apache
ECharts handbook, Ant Design visualization spec, Punsongserm & Suvakunta 2024
(peer-reviewed Thai typography). Secondary/blog (corroborated by NN/g, Tufte/Few,
primary design systems): DataCamp, Pencil&Paper, Stephanie Walter, UXPin.
Caveats: GS Design System no longer public; ProComponents version pin needed for
AntD 5; Thai-contrast figures from mobile/print studies need web translation;
WCAG 1.4.11 excludes purely decorative elements; "monospace numerals" was refuted.
```
