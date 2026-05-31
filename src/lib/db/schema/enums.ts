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

import { EIA_STATUSES } from '@/types/environmental-assessment';
import { LAND_ACQ_STATUSES } from '@/types/land-acquisition';
import { PERMIT_STATUSES } from '@/types/permit';
import {
  CONTRACTING_MODELS,
  DELIVERY_METHODS,
  PROJECT_CLASSES,
  PROJECT_SIZE_TIERS,
  RID_LIFECYCLE_STAGES,
  RID_ORG_UNIT_KINDS,
} from '@/types/rid/vocabulary';

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

// PR-25 — Compliance-register enums (permits, EIA, land acquisition).
// Public hearings have no status enum; their workflow is the
// "minute attached / not attached" boolean implicit in `signed_minute_doc_id`.
export const permitStatusEnum = pgEnum('permit_status', PERMIT_STATUSES);
export const eiaStatusEnum = pgEnum('eia_status', EIA_STATUSES);
export const landAcquisitionStatusEnum = pgEnum(
  'land_acquisition_status',
  LAND_ACQ_STATUSES,
);

// ProjectStatus + ProjectScheduleHealth + role labels are stored as text
// (cheap, easy to extend without ALTER TYPE round-trips for the demo).
