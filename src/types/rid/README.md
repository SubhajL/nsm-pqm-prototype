# RID Canonical Vocabulary

This directory is the **single source of truth** for the Royal Irrigation
Department (RID) domain vocabulary used across the NSM PQM prototype.
Every downstream type, Zod schema, persistence layer, and UI label imports
from `vocabulary.ts` so that terminology cannot drift between modules.

The vocabulary was finalized in **PR-13** of the MVP execution plan.
Stakeholder decisions captured on **2026-05-28** are encoded verbatim;
items marked **default** are the proposed shape pending RID confirmation
during the demo.

> See [`MVP_EXECUTION_PLAN.md`](../../../MVP_EXECUTION_PLAN.md) §PR-13 for
> the full decision log and dependency map.

---

## `ProjectClass` — coarse-grained category of work

| TS value | Thai | Notes |
|---|---|---|
| `construction` | ก่อสร้าง | RID construction projects (canals, dams, structures). |
| `it` | พัฒนาระบบ IT | RID digital projects under DT6. |
| `consulting` | งานที่ปรึกษา | Consulting services contracted by RID. |
| `research` | งานวิจัย | RID research projects (water-resource studies). |
| `maintenance` | บำรุงรักษา | Dedicated maintenance projects on built irrigation assets. |

**Source:** stakeholder confirmation 2026-05-28 — broader than the
minimal `construction | it | consulting` originally drafted in the plan
because RID also runs first-class research and maintenance projects.

---

## `DeliveryMethod` — who executes the work

| TS value | Thai | Notes |
|---|---|---|
| `in_house` | ดำเนินการเอง | RID staff execute the work directly. |
| `outsourced` | จ้างเหมา | A contractor executes under a procurement contract. |
| `consultant_supervised` | Full Vision (ที่ปรึกษากำกับ) | A consulting firm supervises construction on RID's behalf. |

**Source:** stakeholder confirmation 2026-05-28. This is a RENAME of the
legacy `ProjectExecutionModel = 'internal' | 'outsourced'`. The
`'internal'` value migrated to `'in_house'` in seed data and TS callers.
`ProjectExecutionModel` is retained for one release as a `@deprecated`
alias for back-compat — see `src/types/project.ts`.

---

## `ContractingModel` — pricing structure of the contract

| TS value | Thai | Notes |
|---|---|---|
| `lump_sum` | เหมารวม | Single fixed price for the whole scope. |
| `unit_price` | ราคาต่อหน่วย | Priced per measured unit of work (BOQ-driven). |
| `cost_plus` | ต้นทุน + กำไร | Reimbursable cost plus fee. |
| `design_build` | ออกแบบ-ก่อสร้าง | Single contractor delivers design and construction. |

**Source:** default per MVP plan PR-13 — flagged for stakeholder review at demo.

---

## `ProjectSizeTier` — coarse budget bucket

| TS value | Thai | Budget range (THB) |
|---|---|---|
| `small` | ขนาดเล็ก | ≤ 50,000,000 |
| `medium` | ขนาดกลาง | 50,000,001 – 500,000,000 |
| `large` | ขนาดใหญ่ | > 500,000,000 |

Thresholds live as constants in
`PROJECT_SIZE_TIER_THRESHOLDS` and are applied by `classifyProjectSize()`.

**Boundary rule:** the smaller tier owns the boundary value
(`50_000_000` → `small`, `500_000_000` → `medium`). Tested explicitly.

**Source:** stakeholder confirmation 2026-05-28. These cutoffs drive the
approval-authority table introduced in PR-14.

---

## `RidLifecycleStage` — RID construction lifecycle (7 stages)

| TS value | Thai | Notes |
|---|---|---|
| `planning` | วางแผน | Initial scoping, feasibility, budget approval. |
| `land_acquisition` | จัดหาที่ดิน | **Top-3 RID delay driver** — surfaced as its own stage. |
| `survey_design` | สำรวจออกแบบ | Detailed survey and engineering design. |
| `procurement` | จัดซื้อจัดจ้าง | TOR, BOQ estimate, contractor selection, contract award. |
| `construction` | ก่อสร้าง | On-site construction execution. |
| `handover` | ส่งมอบ | Per RID SOP 8.1 — as-built register, warranty, asset transfer. |
| `om` | บำรุงรักษา & ดำเนินงาน | Operations & maintenance after handover. |

**Source:** stakeholder confirmation 2026-05-28. Distinct from the
existing `QualityGatePipeline` (ITP / inspection gates) — the two
concepts render side-by-side on the project detail page (see PR-16).

**Why 7 stages and not 6:** the MVP plan PR-13 draft listed 6 stages
(no `land_acquisition`). Stakeholder amendment 2026-05-28 split land
acquisition out as its own stage because Tiyarathtagarn's thesis
identifies it as a top-3 delay driver — making it gateable matters.

---

## `RidOrgUnit` — multi-tier RID organizational taxonomy

`RidOrgUnit` is a discriminated union over `RidOrgUnitKind`:

| `kind` | Thai | Parent kind | Extra fields |
|---|---|---|---|
| `department` | กรม | — (root) | — |
| `bureau` | สำนัก / กอง | `department` | — |
| `regional_office` | สำนักชลประทาน (1–17) | `department` or `bureau` | — |
| `construction_office` | สำนักงานก่อสร้าง (1–24) | `regional_office` | `constructionTier: ProjectSizeTier \| null` (เล็ก / กลาง / ใหญ่) |
| `provincial_office` | โครงการชลประทานจังหวัด | `regional_office` | — |
| `om_project` | โครงการส่งน้ำและบำรุงรักษา | `regional_office` or `provincial_office` | — |
| `basin` | ลุ่มน้ำ (geography overlay) | — (parallel hierarchy) | — |

Every unit carries `{ id, kind, name, nameEn, parentId }`.

**Discriminator rule:** only `construction_office` carries the
`constructionTier` qualifier. The discriminated union rejects
`constructionTier` on any other kind (TypeScript will error). A
`@ts-expect-error` test in `vocabulary.test.ts` pins this behavior.

**Source:** default per MVP plan PR-13 — flagged for stakeholder review.
PR-17 builds the actual tree implementation on top of this vocabulary.

---

## Decision log (2026-05-28)

| Item | Decision | Origin |
|---|---|---|
| `projectClass` values | broadened to include `research`, `maintenance` | amendment vs. PR-13 draft |
| `deliveryMethod` values | rename `internal` → `in_house`; add `consultant_supervised` | confirmed |
| `projectSizeTier` thresholds | 50M / 500M THB cutoffs | confirmed |
| `ridLifecycleStage` count | 7 stages (`land_acquisition` separated) | amendment vs. PR-13 draft |
| `contractingModel` values | `lump_sum / unit_price / cost_plus / design_build` | default — flagged for review |
| `ridOrgUnit` shape | discriminated union with `construction_office` tier qualifier | default — flagged for review |

PR-13 explicitly notes that `contractingModel` and `ridOrgUnit` ship as
defaults pending RID stakeholder confirmation during the demo.
Subsequent PRs (PR-14 size tier, PR-15 delivery method, PR-16 lifecycle
gates, PR-17 org tree) consume these names.
