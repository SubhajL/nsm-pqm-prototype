/**
 * Pure UI helpers for the จัดซื้อจัดจ้าง (procurement) surface.
 *
 * These wrap the client-safe pure helpers in
 * `src/lib/rid/procurement-helpers.ts` so the drawer can render ONLY the
 * legal next-state buttons and the contracts card can show effective
 * (post-amendment) values without duplicating the domain math. The server
 * routes remain the final authority — every transition is re-checked and
 * rejected with 422 INVALID_TRANSITION on an illegal edge.
 */

import {
  applyAmendmentToContract,
  canTransitionProcurement,
  isEstimateBasisCompatible,
} from '@/lib/rid/procurement-helpers';
import { canEditProjectBasics } from '@/lib/project-access-pure';
import type { UserRole } from '@/types/admin';
import type { AwardedContract } from '@/types/awarded-contract';
import type { ContractAmendment } from '@/types/contract-amendment';
import type { EngineeringEstimateBasis } from '@/types/engineering-estimate';
import {
  PROCUREMENT_STATES,
  type ProcurementState,
} from '@/types/procurement-package';
import { CONTRACTING_MODELS, type ContractingModel } from '@/types/rid/vocabulary';

/**
 * Every state the package may legally move to from `from`. Excludes the
 * self-transition. The returned order follows `PROCUREMENT_STATES` so the
 * UI renders the forward step before the trailing `cancelled` action.
 */
export function getLegalNextProcurementStates(
  from: ProcurementState,
): ProcurementState[] {
  return PROCUREMENT_STATES.filter(
    (to) => to !== from && canTransitionProcurement(from, to).ok,
  );
}

/**
 * Whether the current user may create packages / file TORs / record
 * transitions on this surface. Thin alias over the central
 * `canEditProjectBasics` rule (PR-31 cleanup); kept under the local name
 * so the surface's call sites and tests read naturally.
 */
export const canManageProcurement: (
  role: UserRole | null | undefined,
) => boolean = canEditProjectBasics;

/** Effective contract view after folding amendments, plus how many applied. */
export interface EffectiveContractView {
  effectiveAmount: number;
  effectiveExpirationDate: string | null;
  appliedCount: number;
}

/**
 * Fold a contract's amendments (in `amendmentNumber` order, regardless of
 * input order) over `applyAmendmentToContract` to derive the effective
 * amount + expiration date. Neither input is mutated.
 */
export function foldContractAmendments(
  contract: Pick<AwardedContract, 'awardAmount' | 'expirationDate'>,
  amendments: readonly ContractAmendment[],
): EffectiveContractView {
  const ordered = [...amendments].sort(
    (a, b) => a.amendmentNumber - b.amendmentNumber,
  );
  let seed: Pick<AwardedContract, 'awardAmount' | 'expirationDate'> = {
    awardAmount: contract.awardAmount,
    expirationDate: contract.expirationDate,
  };
  for (const amendment of ordered) {
    const next = applyAmendmentToContract(seed, amendment);
    seed = {
      awardAmount: next.effectiveAmount,
      expirationDate: next.effectiveExpirationDate,
    };
  }
  return {
    effectiveAmount: seed.awardAmount,
    effectiveExpirationDate: seed.expirationDate,
    appliedCount: ordered.length,
  };
}

/**
 * The contracting models a downstream AwardedContract may use given an
 * estimate of `basis`. Order follows `CONTRACTING_MODELS`. Used by the
 * create-contract form to hint at (not hard-block) incompatible pairings —
 * the server-side guard is the authority.
 */
export function compatibleContractingModelsForBasis(
  basis: EngineeringEstimateBasis,
): ContractingModel[] {
  return CONTRACTING_MODELS.filter((model) =>
    isEstimateBasisCompatible(basis, model),
  );
}
