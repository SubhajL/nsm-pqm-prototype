/**
 * PR-30b — RID org-unit → GFMIS cost-center mapping.
 *
 * Pure function. No HTTP. Today the mapping is "use the cost-center
 * the org-unit already declares, if it is well-formed". This mirrors
 * `RidOrgUnit.costCenter` being the agreed source of truth (see
 * `src/types/rid/vocabulary.ts`).
 *
 * Once RID-IT publishes the canonical code list, this module is where
 * we apply additional fallback logic (e.g. walk the parent tree until
 * we find an ancestor with a declared cost center). For PR-30b we
 * keep it strictly self-contained.
 */
import type { RidOrgUnit } from '@/types/rid/vocabulary';

/** GFMIS cost-center is a 10-digit canonical code. */
const GFMIS_COST_CENTER_REGEX = /^\d{10}$/;

export function gfmisCostCenterFor(unit: RidOrgUnit): string | null {
  const raw = unit.costCenter;
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (!GFMIS_COST_CENTER_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}
