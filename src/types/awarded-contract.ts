/**
 * PR-24 — Awarded Contract entity.
 *
 * One AwardedContract row per signed agreement coming out of a
 * ProcurementPackage's `awarded` state. `projectId` is denormalized for
 * efficient project-scoped lookups (the same denormalisation pattern
 * already used in `awarded_contracts`-adjacent tables).
 *
 * State machine: `draft → signed → in_force → closed | terminated`.
 * Transitions are enforced by callers; this type only declares the
 * vocabulary.
 *
 * `contractingModel` reuses the canonical `ContractingModel` union from
 * `src/types/rid/vocabulary.ts` (and the matching pgEnum). It is checked
 * against `EngineeringEstimate.basis` by `isEstimateBasisCompatible()`.
 */

import type { ContractingModel } from '@/types/rid/vocabulary';

export const CONTRACT_STATES = [
  'draft',
  'signed',
  'in_force',
  'closed',
  'terminated',
] as const;
export type ContractState = (typeof CONTRACT_STATES)[number];

export interface AwardedContract {
  id: string;
  procurementPackageId: string;
  /** Denormalised from ProcurementPackage.projectId for easy lookup. */
  projectId: string;
  /** Official contract number (free text — agency conventions vary). */
  contractNumber: string;
  contractorName: string;
  /** 13-digit Thai tax id; nullable for contractors without one on file. */
  contractorTaxId: string | null;
  /** Total awarded amount (THB) at signing. Amendments adjust this in-flight. */
  awardAmount: number;
  contractingModel: ContractingModel;
  state: ContractState;
  signedAt: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  /** Defect-liability period in months; null when not stipulated. */
  warrantyMonths: number | null;
  notes: string;
}

export const CONTRACT_STATE_LABELS: Record<
  ContractState,
  { th: string; en: string; color: string }
> = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'default' },
  signed: { th: 'ลงนามแล้ว', en: 'Signed', color: 'processing' },
  in_force: { th: 'มีผลบังคับใช้', en: 'In Force', color: 'success' },
  closed: { th: 'ปิดสัญญา', en: 'Closed', color: 'default' },
  terminated: { th: 'บอกเลิกสัญญา', en: 'Terminated', color: 'error' },
};
