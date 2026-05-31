# RID Progress-Reporting Templates — PR-29 Discovery

> Status: **Stakeholder review pending.** The field names, section ordering,
> and signatory roles below describe the *typical* structure used by RID
> (กรมชลประทาน) e-GP contract clauses and procurement documents from
> `procurement.rid.go.th`. The final field labels (Thai-side wording) and
> exact signatory composition will be locked at the demo review and the
> snapshot tests in `src/lib/rid/reporting/*.test.ts` will be updated to
> match.

This document captures the report families the prototype must support
and the data each family exposes. Implementation lives in
`src/lib/rid/reporting/`.

## Report families

PR-29 implements three report kinds, all driven by RID's standard
contract-management clauses. They share a common header + signatory
block; the body differs per kind.

### 1. Monthly progress report (`monthly`)

Mandated by RID e-GP boilerplate clauses for every active construction
contract. Delivered to the contracting officer (พัสดุ) within ~5 working
days of month end.

**Body sections:**

- **Project header** — project code, name (TH/EN), contract reference,
  reporting period (Thai BE dates).
- **Period summary** — narrative line items: planned activities, actual
  activities, deviations.
- **Physical progress** — % planned vs. % actual for the period, plus
  cumulative %. Sourced from EVM (`EV / BAC × 100`) and the project's
  `progress` field.
- **Financial progress** — BAC, EV (or paid-to-date for outsourced),
  SPI / CPI (in-house) or paid % (outsourced).
- **Delay analysis** — if the project is on schedule, a single line
  affirming so. If the project's `scheduleHealth` is `watch` or
  `delayed`, the section enumerates the watch/delayed gantt activities
  derived via `deriveTaskScheduleHealth`.
- **Photo evidence (placeholder)** — references to uploaded documents
  for the period. The prototype lists count + most-recent ids; the live
  RID template embeds thumbnails.
- **Signatory block** — see below.

### 2. งวด-completion report (`work_period`)

Triggered when a WorkPeriod (งวดงาน) reaches `submitted` /
`inspection_passed` and the contractor formally requests payment for
that งวด. Filed against the contract amendment / payment voucher chain.

**Body sections:**

- **Project + งวด header** — project code, งวด number, planned start/end,
  amount (THB), and the WorkPeriod's `state`.
- **Deliverable checklist** — one row per `WorkPeriod.deliverables`
  entry. Live RID forms include a checked/unchecked column; the
  prototype renders the raw deliverable text (no checked column —
  inspection state is captured by the WorkPeriod's `state`).
- **Delivery slips** — count + reference list (`DeliverySlip.id`,
  `submittedAt`).
- **Financial summary** — งวด amount in THB, percentage of contract
  budget, link back to the parent project's BAC.
- **Signatory block.**

### 3. Ad-hoc delay report (`delay`)

Filed on demand when the project trips into `delayed` schedule health,
or when a procurement / lifecycle milestone slips past its scheduled
date. Required by RID's project-monitoring clauses to record the cause
+ proposed recovery.

**Body sections:**

- **Project header** (as above).
- **Current schedule health** — `scheduleHealth`, SPI, days slipped.
- **Lifecycle history excerpt** — last three
  `LifecycleStageHistoryEntry` rows so reviewers see the stage churn
  context.
- **Watch / delayed activities** — list of Gantt tasks whose derived
  `TaskScheduleHealth` is `watch` or `delayed`, with planned vs. actual
  end dates.
- **Cause + recovery plan (placeholder)** — free-text fields the PM
  fills in. Prototype emits empty placeholder rows pending stakeholder
  confirmation on the exact field labels.
- **Signatory block.**

## Signatory block (shared)

The RID e-GP delivery + payment forms require three signatures, each
captured bilingually so the audit binder is readable by ADB / external
reviewers:

1. **ผู้จัดการโครงการ (Project Manager)** — `Project.managerName`.
2. **วิศวกรผู้ควบคุมงาน (Supervising Engineer)** — derived from team
   memberships when an engineer role is assigned; otherwise the
   placeholder is left empty for hand-fill.
3. **พยาน (Witness)** — always emitted as an empty row for hand-fill at
   sign-off.

The prototype emits each signatory as
`{ role: 'ผู้จัดการโครงการ (Project Manager)', name, signedAt }`.
`name` is `null` when no candidate is known; `signedAt` is `null` until
the PDF is physically signed (the prototype never auto-fills this).

## Mock data note

PR-29 does **not** ship sample RID PDFs in the repo. The text fields
above describe the live template structure as observable from
`procurement.rid.go.th` and the RID e-GP contract boilerplate. The
snapshot tests in `*.test.ts` lock the *machine* output (`RidReportData`)
against fixture project + EVM + work-period data already in
`src/data/`. Field-label drift after stakeholder review = update the
snapshot file (the test is intentionally exact-match so drift is loud).
