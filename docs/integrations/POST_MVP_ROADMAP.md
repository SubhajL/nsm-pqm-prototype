# Post-MVP integration roadmap

Chronological roadmap entries for the four external-system adapters
scoped out of MVP. PR-30b ships discovery (contracts + fixtures +
linkers) only; the items below are the actual adapter work that follows.

Each entry should be promoted to a sized PR + spec once the demo
validation conversation closes its open questions
(see `INTEGRATION_DISCOVERY.md` for the per-system checklist).

---

## 1. e-GP adapter v1 (post-MVP)

**Goal.** Bridge PQM `AwardedContract` rows to live e-GP procurement /
award notices.

**Inputs.** `eGpReferenceForContract()` already gives us a deterministic
synthetic correlation id. The adapter exchanges that for the live e-GP
reference once RID-IT confirms the canonical id format.

**Scope.**

1. Confirm canonical e-GP reference-id format (see discovery checklist).
2. Add `egp_correlations` table (`awarded_contract_id`, `egp_reference_id`,
   `last_fetched_at`, `payload_hash`). One row per contract.
3. Implement HTTP fetcher (likely a scheduled cron) that pulls procurement
   notices + award notices, validates against `egpProcurementReferenceSchema`
   / `egpAwardNoticeSchema`, and upserts the correlation row.
4. Surface "View on e-GP" link on the contracts page.
5. Surface an e-GP status badge ("matched" / "unmatched" / "stale") on
   the procurement-package page.

**Dependencies.** RID-IT confirms feed availability + reference-id format.

**Estimated size.** Medium (≈ 1 sprint).

---

## 2. GFMIS adapter v1 (post-MVP)

**Goal.** Export PQM payment vouchers as GFMIS disbursement records and
ingest GFMIS responses (document number + paid timestamp) back into the
payment-voucher state machine.

**Inputs.** `gfmisCostCenterFor(orgUnit)` already gives us the cost-center
mapping. Disbursement records map 1-for-1 from PR-23's
`payment_vouchers` rows.

**Scope.**

1. Confirm the new GFMIS Thai endpoint structure (scheme, auth model,
   document enumeration — see discovery checklist).
2. Add `gfmis_correlations` table (`payment_voucher_id`,
   `gfmis_document_number`, `gfmis_document_type`, `disbursed_at`,
   `payload_hash`).
3. Implement export builder: payment voucher → `gfmisDisbursementRecordSchema`
   payload, ready for upload.
4. Implement ingestion: GFMIS response → advance
   `PaymentVoucher.state` from `approved` → `paid` once GFMIS reports
   the disbursement (currently a manual transition).
5. Backfill the `RidOrgUnit.costCenter` nullable column with the full
   RID-IT-confirmed mapping (this is a data migration, not code).

**Dependencies.** RID-IT confirms endpoint + canonical cost-center list.

**Estimated size.** Medium-large (≈ 1.5 sprints).

---

## 3. PFMS-SP2 adapter — pending wire format (DEFERRED)

**Status.** Blocked on demo conversation. PR-30b ships a placeholder
schema only; we cannot meaningfully scope adapter work until the wire
format is confirmed.

**Trigger.** The discovery-checklist items in
`INTEGRATION_DISCOVERY.md` § 3 close.

**Initial scope (subject to re-write post-confirmation).**

1. Rewrite `pfmsSp2ProjectReportSchema` to match the confirmed wire
   format. Promote maturity from `placeholder` to `documented`.
2. Decide push vs. pull (PR-30b makes no assumption).
3. Decide reporting cadence (weekly? monthly? per-milestone?).
4. Implement the report builder + transport.

**Estimated size.** Unknown until § 3 checklist closes.

---

## 4. PBMS adapter — pending wire format (DEFERRED)

**Status.** Blocked on demo conversation. PR-30b ships a placeholder
schema only.

**Trigger.** The discovery-checklist items in
`INTEGRATION_DISCOVERY.md` § 4 close.

**Initial scope (subject to re-write post-confirmation).**

1. Rewrite `pbmsBudgetUtilisationSchema` to match the confirmed wire
   format. Promote maturity from `placeholder` to `documented`.
2. Decide whether PBMS reuses the GFMIS 16-digit budget-line code or
   defines its own.
3. Decide snapshot cadence + transport.
4. Implement the snapshot builder + transport.

**Estimated size.** Unknown until § 4 checklist closes.

---

## Cross-cutting follow-up

- **`integration_audit_log` table** (post-MVP). Once any real adapter
  ships, every outbound call + inbound webhook should be auditable.
  Pattern matches the existing `audit_log` table for PQM-internal writes.
- **Retry / dead-letter strategy.** External systems will fail. Adapters
  should land with a retry queue + DLQ before any of them go to
  production.
- **PII review.** e-GP award notices carry the contractor's 13-digit
  tax id. Confirm storage + retention policy with the data-protection
  reviewer before ingestion.
