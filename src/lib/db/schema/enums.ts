/**
 * PR-19 — Shared pgEnum definitions.
 *
 * All RID vocabulary unions land here as Postgres enums so every table that
 * references them shares a single canonical type. Source of truth is the
 * `@/types/rid/vocabulary` module — these enums must mirror it 1-1.
 *
 * Adding a value: extend the vocabulary first, then add the same value here,
 * then `npm run db:generate` to produce an `ALTER TYPE ... ADD VALUE`
 * migration.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

import { CONTRACT_STATES } from '@/types/awarded-contract';
import { EIA_STATUSES } from '@/types/environmental-assessment';
import { ENGINEERING_ESTIMATE_BASES } from '@/types/engineering-estimate';
import { LAND_ACQ_STATUSES } from '@/types/land-acquisition';
import { PAYMENT_VOUCHER_STATES } from '@/types/payment-voucher';
import { PERMIT_STATUSES } from '@/types/permit';
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_STATES,
} from '@/types/procurement-package';
import {
  CONTRACTING_MODELS,
  DELIVERY_METHODS,
  PROJECT_CLASSES,
  PROJECT_SIZE_TIERS,
  RID_LIFECYCLE_STAGES,
  RID_ORG_UNIT_KINDS,
} from '@/types/rid/vocabulary';
import { WORK_PERIOD_STATES } from '@/types/work-period';

export const projectClassEnum = pgEnum('project_class', PROJECT_CLASSES);
export const deliveryMethodEnum = pgEnum('delivery_method', DELIVERY_METHODS);
export const contractingModelEnum = pgEnum(
  'contracting_model',
  CONTRACTING_MODELS,
);
export const projectSizeTierEnum = pgEnum(
  'project_size_tier',
  PROJECT_SIZE_TIERS,
);
export const ridLifecycleStageEnum = pgEnum(
  'rid_lifecycle_stage',
  RID_LIFECYCLE_STAGES,
);
export const ridOrgUnitKindEnum = pgEnum(
  'rid_org_unit_kind',
  RID_ORG_UNIT_KINDS,
);

// PR-27 — Project-approval workflow state enum. Mirrors the
// `APPROVAL_REQUEST_STATES` union in `src/types/project-approval-request.ts`.
import { APPROVAL_REQUEST_STATES } from '@/types/project-approval-request';
export const approvalRequestStateEnum = pgEnum(
  'approval_request_state',
  APPROVAL_REQUEST_STATES,
);

// PR-25 — Compliance-register enums (permits, EIA, land acquisition).
// Public hearings have no status enum; their workflow is the
// "minute attached / not attached" boolean implicit in `signed_minute_doc_id`.
export const permitStatusEnum = pgEnum('permit_status', PERMIT_STATUSES);
export const eiaStatusEnum = pgEnum('eia_status', EIA_STATUSES);
export const landAcquisitionStatusEnum = pgEnum(
  'land_acquisition_status',
  LAND_ACQ_STATUSES,
);

// PR-24 — Procurement / contract enums.
//
// `contracting_model` is already defined above (reused from PR-RID-A). The
// three new enums declared here are:
//   - procurement_state         — workflow status of a ProcurementPackage
//   - procurement_method        — solicitation method (e-bidding, etc.)
//   - engineering_estimate_basis — unit-price | cost-plus | lump-sum
//   - contract_state            — workflow status of an AwardedContract
export const procurementStateEnum = pgEnum(
  'procurement_state',
  PROCUREMENT_STATES,
);
export const procurementMethodEnum = pgEnum(
  'procurement_method',
  PROCUREMENT_METHODS,
);
export const engineeringEstimateBasisEnum = pgEnum(
  'engineering_estimate_basis',
  ENGINEERING_ESTIMATE_BASES,
);
export const contractStateEnum = pgEnum('contract_state', CONTRACT_STATES);

// PR-23 — งวดงาน / payment-voucher enums. Committee inspection
// `result` is stored as plain text (not enum) so future extensions like
// `pass_with_conditions_subset` can be added without an ALTER TYPE
// migration on every preview environment.
export const workPeriodStateEnum = pgEnum(
  'work_period_state',
  WORK_PERIOD_STATES,
);
export const paymentVoucherStateEnum = pgEnum(
  'payment_voucher_state',
  PAYMENT_VOUCHER_STATES,
);

// PR-26 — Handover (SOP 8.1 + 8.10) enums.
//   - handover_state        — workflow status of a HandoverPacket
//   - om_manual_category    — O&M manual section taxonomy
//   - asset_type            — RID asset coarse classification
import { HANDOVER_STATES } from '@/types/handover-packet';
import { OM_MANUAL_CATEGORIES } from '@/types/om-manual';
import { ASSET_TYPES } from '@/types/asset-registration';
export const handoverStateEnum = pgEnum('handover_state', HANDOVER_STATES);
export const omManualCategoryEnum = pgEnum(
  'om_manual_category',
  OM_MANUAL_CATEGORIES,
);
export const assetTypeEnum = pgEnum('asset_type', ASSET_TYPES);

// ProjectStatus + ProjectScheduleHealth + role labels are stored as text
// (cheap, easy to extend without ALTER TYPE round-trips for the demo).

// PR-30a — IT class extensions (vendor SOW + DT6 knowledge areas).
//
// `sow_state` is a strict enum because the state machine in
// `src/lib/rid/it-class-helpers.ts` references it; `dt6_area` is also
// strict to enforce the "only three canonical RID areas" rule at the DB
// boundary. Sprint `lifecycleStage` stays plain text to avoid coupling
// to the `rid_lifecycle_stage` enum (matches the loose-coupling
// convention used by `committee_inspections.result`).
import { SOW_STATES } from '@/types/vendor-sow';
import { DT6_AREAS } from '@/types/knowledge-area-note';
export const sowStateEnum = pgEnum('sow_state', SOW_STATES);
export const dt6AreaEnum = pgEnum('dt6_area', DT6_AREAS);
