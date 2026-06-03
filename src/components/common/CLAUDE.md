# Common — Shared UX Primitives

**Parent Context**: [../../CLAUDE.md](../../../CLAUDE.md)

This directory hosts the bilingual, AA-safe UX primitives (`EmptyState`,
`SearchBar`, `FilterBar`, `FormSection`, `StatusIndicator`,
`LoadingSkeleton`, `KPICard`, `StatusBadge`, `WizardActionFooter`)
plus their pure sibling helpers.

Primitive inventory + invariants are covered in the root
[CLAUDE.md → Shared UX primitives](../../../CLAUDE.md#shared-ux-primitives-pr-a3).
This file documents the **button (CTA) hierarchy** every screen must follow.

---

## Button hierarchy (CTA vocabulary)

Every screen distinguishes four button roles so the user can locate the
"primary action" instantly. Drift between these is the dominant cause
of demo-readability complaints in the morning audit (E2 gap).

### Primary — `<Button type="primary">`

- **One per page.** Only the action the user came to perform.
- Examples: `สร้าง (Create)`, `บันทึก (Save)`, `ส่ง (Submit)`,
  `อนุมัติ (Approve)`.
- A page-level FAB (eg `CreateProjectFAB`) counts as the page's
  primary; do not put a second `type="primary"` in the action bar.
- When the action is **destructive but irreversible-and-positive**
  (eg `อนุมัติ (Approve)`), keep `type="primary"` but tint with
  `COLORS.success` / `COLORS.accentTeal` via `style={{ backgroundColor,
  borderColor }}` so the colour reinforces the meaning.

### Secondary — `<Button>` (default)

- Supporting actions that flank the primary CTA.
- Examples: `ยกเลิก (Cancel)`, `บันทึกร่าง (Save Draft)`,
  `ส่งกลับแก้ไข (Return)` when the action is non-destructive review.
- Render the secondary set to the LEFT or RIGHT of the primary in the
  action bar; the primary always sits at the visual end of the group.

### Tertiary — `<Button type="link">` / `<Button type="text">`

- Navigation, "see more" links, in-row icon buttons.
- Examples: `ดูทั้งหมด (See all)`, in-row download icons,
  breadcrumb-adjacent jumps.
- Tertiary buttons never own validation state — they navigate or
  reveal content; they do not mutate.

### Destructive — `<Button danger>` (optionally `ghost`)

- Delete, reject, withdraw, terminate.
- `danger` alone for the final delete button.
- `danger ghost` for the lighter-emphasis "send back for revision"
  variant when paired with a non-destructive primary.

---

## Authoring rules

- **Never two `type="primary"` on the same page.** The morning audit
  flagged the `/projects/[id]/approval` page (Send Comment + Approve)
  as the canonical example; demote the secondary one to `default`.
- Inline `style={{ backgroundColor: COLORS.accentTeal, borderColor:
  COLORS.accentTeal }}` is acceptable for primary buttons that need
  the brand-teal accent (the page-level FAB pattern). Do not use it
  for `default` buttons — secondaries stay AntD-neutral.
- KPI cards must NOT double as filter chips. If a row of KPIs needs a
  filter affordance, render an AntD `<Segmented>` selector above the
  row (see `dashboard/_components/DashboardFilterSegmented.tsx`) and
  keep the KPI cards purely informational. The previous "KPI = also a
  filter" pattern (E2 audit gap) is retired. **Navigation-only KPI
  cards remain allowed** — e.g. `ProjectKPICards.tsx` uses `onClick`
  to route to a project sub-page, which is a navigation affordance, not
  a filter chip. The rule targets filter-chip ambiguity, not
  drilldown navigation.
- `KPICard.active` is a no-op when `onClick` is not supplied — the
  primitive only emits the pressed-border styling when interactive
  semantics are present. If you need a static "selected" tint without
  a click handler, use an inline `style={{ borderColor: COLORS.X }}`
  on the surrounding card instead.
- Buttons that fire async work (`createProject.mutateAsync`,
  `mutateAsync` calls inside `onClick`) must drive a `loading` prop
  off the mutation's `isPending` state so the disabled-during-flight
  invariant is enforced without per-screen state.

---

## Cross-references

- KPI card primitive: `KPICard.tsx`
- KPI delta tone helpers: `@/lib/dashboard-kpi-context`
- Status visual SSOT: `@/theme/health-visual` (PR T2-1)
- Filter primitives: `FilterBar.tsx` + `filter-utils.ts`
- Form section: `FormSection.tsx`
- Relative-time formatters: two helpers exist —
  `@/lib/dashboard-kpi-context` → `formatFreshnessLabel(updatedAt, now)`
  for KPI "updated X ago" prefixes, and
  `notifications/_components/format-relative-time.ts` →
  `formatRelativeTime(isoDate)` for the notification panel's bilingual
  "X ago" labels. Unifying them into one `src/lib/relative-time.ts` is
  a documented follow-up; both buckets-of-time vocabularies should
  match exactly to avoid drift.

---

## Known follow-up: remaining `two-primaries` violations

The `/approval` page demotion shipped with this guide is the canonical
example. The following pages still ship two visible `type="primary"`
buttons simultaneously and are tracked for a follow-up sweep PR:

- `/projects/[id]/change-request` — `สร้าง Change Request` (header)
  + `อนุมัติ (Approve)` (bottom action row, success-tinted) when a CR
  is selected
- `/projects/[id]/gantt` toolbar — `เพิ่มงาน` + `ขออนุมัติแผนงาน`
  when `canEditGantt` is true

A `rg 'type="primary"' src/app/\(dashboard\)/` sweep is the natural
discovery query for the follow-up.
