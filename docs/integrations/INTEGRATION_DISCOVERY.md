# External-system integration discovery (PR-30b)

> **Status:** discovery + contract fixtures + light validators only.
> No HTTP clients, no API routes, no persistence. The actual adapters
> land post-MVP — see `POST_MVP_ROADMAP.md`.
>
> **Validation strategy:** per the stakeholder decision recorded in
> `MVP_EXECUTION_PLAN.md`, the wire formats below will be validated
> live at the demo with RID-IT (not before MVP). PFMS-SP2 and PBMS are
> placeholder shapes; e-GP and GFMIS are based on publicly observed
> structure.

PR-30b ships four parallel tracks under `src/lib/integrations/`:

| Track | What it is | Maturity | Fixtures |
|---|---|---|---|
| `e-gp` | e-Procurement reference + award notice | `documented` | 2 |
| `gfmis` | Disbursement + budget commitment | `documented` | 2 |
| `pfms-sp2` | Project / Financial Mgmt sub-programme 2 | `placeholder` | 1 |
| `pbms` | Project Budget Management System | `placeholder` | 1 |

Each track contributes:

- `contract.ts` — Zod schemas describing the wire shape.
- `fixtures/*.json` — synthetic request / response payloads that parse
  cleanly against the schemas. **No real procurement IDs, no real
  disbursement records.** Every value uses the `EGP-SAMPLE`,
  `KhB-69-XXX`, etc. synthetic prefix.
- optional pure linker / mapper helpers (`linker.ts`,
  `cost-center-mapping.ts`) that bridge PQM domain entities to the
  external system's identifiers. No HTTP, no randomness.

The sandbox tests live alongside the contracts (`*.test.ts`); the
cross-cutting manifest test (`integration-manifest.test.ts`) makes sure
no fixture goes un-validated and no schema goes un-fixtured.

---

## 1. e-GP — Thai government e-Procurement

**What it is.** The official Thai e-Procurement portal aggregates
public procurement notices ("ประกาศประกวดราคา") and award announcements
("ประกาศผู้ชนะ"). RID publishes its own subset at
[procurement.rid.go.th](https://procurement.rid.go.th/), keyed on a
procurement reference id, fiscal year (BE), and the awarded
contractor's 13-digit tax id.

### Publicly observed wire format

The public notices expose, at minimum:

- procurement reference id
- fiscal year (Buddhist Era)
- procurement method (e-bidding / specific / selection / reverse auction)
- publishing agency display name
- procurement title (Thai)
- estimated budget (THB)
- publication date

Award notices add:

- awarded contractor name + 13-digit tax id
- award amount (THB)
- award date

The PR-30b schema mirrors this projection 1-for-1. We have *not*
located a machine-consumable feed at PR-30b time; the schema is what we
need RID-IT to satisfy once a feed exists.

### PR-30b fixture coverage

| Fixture | Schema |
|---|---|
| `e-gp/fixtures/procurement-reference.sample.json` | `egpProcurementReferenceSchema` |
| `e-gp/fixtures/award-notice.sample.json` | `egpAwardNoticeSchema` |

Bridge helper: `eGpReferenceForContract(contract)` derives a synthetic
`EGP-<be2>-<slug>` reference from a PQM `AwardedContract` so the eventual
adapter has a deterministic correlation id.

### Validation conversation needed at demo

- [ ] Confirm whether RID-IT has (or plans) a machine-consumable feed.
- [ ] Confirm the canonical reference-id format (so our `EGP-<be2>-<slug>` derivation can be retired).
- [ ] Confirm contractor tax-id is always present on the award notice
      (PR-30b assumes yes; some notices on the public site mask it).
- [ ] Confirm the procurement-method enum (PR-30b lists the four
      observed; RID may use additional internal classifications).

### Roadmap entry

Post-MVP "e-GP adapter v1" — HTTP fetcher + correlation table linking
PQM `AwardedContract` rows to the live e-GP reference id. See
`POST_MVP_ROADMAP.md` § 1.

---

## 2. GFMIS — Government Fiscal Management Information System

**What it is.** GFMIS is the canonical Thai government fiscal system
operated by the Comptroller General's Department. It records budget
commitments and disbursements against a 10-digit cost-center code and
a 16-digit budget-line code. Document types include ขบ. (ขอเบิก —
disbursement request), ขจ. (ขอจ่าย — payment request), and PY (direct
payment).

### Publicly observed wire format

GFMIS document records carry, at minimum:

- document number + document type (ขบ./ขจ./PY)
- project code (PQM-side back-reference)
- 16-digit budget line
- 10-digit cost center
- fiscal year (BE)
- disbursement amount (THB, positive)
- period start / end dates
- optional memo

Budget commitments add a `commitmentNumber` and `committedAt`
timestamp.

### PR-30b fixture coverage

| Fixture | Schema |
|---|---|
| `gfmis/fixtures/disbursement-record.sample.json` | `gfmisDisbursementRecordSchema` |
| `gfmis/fixtures/budget-commitment.sample.json` | `gfmisBudgetCommitmentSchema` |

Bridge helper: `gfmisCostCenterFor(orgUnit)` returns the GFMIS
cost-center for a given RID org-unit, validating the 10-digit canonical
format. Returns `null` when the unit has no cost center on file or the
declared value is non-canonical.

### Validation conversation needed at demo

- [ ] Confirm the GFMIS endpoint structure (RID-IT mentioned a new
      GFMIS-Thai endpoint — confirm scheme, auth model, and document
      enumeration).
- [ ] Confirm the canonical 10-digit / 16-digit code lengths still hold
      under the latest GFMIS revision.
- [ ] Confirm document-type vocabulary (ขบ./ขจ./PY) is exhaustive for
      RID's disbursement flows; flag any agency-specific extensions.
- [ ] Confirm the `RidOrgUnit.costCenter` mapping is comprehensive
      (some units in our seed data still have `null`).

### Roadmap entry

Post-MVP "GFMIS adapter v1" — exportable disbursement-record builder +
ingestion of GFMIS responses into PQM's payment-voucher pipeline. See
`POST_MVP_ROADMAP.md` § 2.

---

## 3. PFMS-SP2 — Project & Financial Management System (sub-programme 2)

**What it is.** PFMS-SP2 is referenced by RID planners as a project /
financial reporting system. **No public wire-format documentation was
located at PR-30b discovery time.** The schema below is a best-effort
stub describing the minimum we'd plausibly need from a project report
record:

- project code + display name
- reporting period (start ≤ end)
- physical-progress percent (0–100)
- financial-progress percent (0–100)
- cumulative disbursement (THB)
- optional note

### PR-30b fixture coverage

| Fixture | Schema |
|---|---|
| `pfms-sp2/fixtures/project-report.stub.json` | `pfmsSp2ProjectReportSchema` |

### Validation conversation needed at demo

- [ ] **Confirm the wire format end-to-end** — every field name, type,
      and required/optional status. The stub is a guess.
- [ ] Confirm whether SP2 wants progress as percent or as a separate
      planned/actual pair.
- [ ] Confirm the project-code linkage (does SP2 expose PQM project
      IDs or its own mapping?).
- [ ] Confirm whether reports are pushed by PQM or pulled by SP2.

### Roadmap entry

Post-MVP "PFMS-SP2 adapter — pending wire format" — DEFERRED until the
contract conversation closes. See `POST_MVP_ROADMAP.md` § 3.

---

## 4. PBMS — Project Budget Management System

**What it is.** PBMS is the budget-monitoring counterpart to PFMS-SP2.
**No public wire-format documentation was located at PR-30b discovery
time.** The schema captures the minimal pair we'd plausibly need from
an eventual adapter:

- project code + budget-line + fiscal year (BE)
- allocated amount (THB, ≥ 0)
- utilised amount (THB, ≤ allocated)
- utilisation percent (0–100)
- snapshot timestamp

The schema's only domain invariant is `utilisedTHB <= allocatedTHB`.

### PR-30b fixture coverage

| Fixture | Schema |
|---|---|
| `pbms/fixtures/budget-utilisation.stub.json` | `pbmsBudgetUtilisationSchema` |

### Validation conversation needed at demo

- [ ] **Confirm the wire format end-to-end** — schema is a guess.
- [ ] Confirm the budget-line format and whether PBMS reuses GFMIS's
      16-digit code or its own.
- [ ] Confirm whether utilisation is a percent or a paired allocated /
      utilised amount only.
- [ ] Confirm whether snapshots are timestamped (PR-30b assumes yes).

### Roadmap entry

Post-MVP "PBMS adapter — pending wire format" — DEFERRED until the
contract conversation closes. See `POST_MVP_ROADMAP.md` § 4.

---

## Sources

- procurement.rid.go.th (RID public procurement portal) — public notice
  field set observed at discovery time. Synthetic data only is stored
  in this repo's fixtures.
- Comptroller General's Department public materials on GFMIS document
  types (ขบ. / ขจ. / PY) and the 10-digit cost-center / 16-digit
  budget-line conventions.
- Stakeholder discussion log in `MVP_EXECUTION_PLAN.md` Q3 entry — the
  "validate live at demo, not before MVP" decision that scopes PFMS-SP2
  and PBMS to placeholder maturity.
