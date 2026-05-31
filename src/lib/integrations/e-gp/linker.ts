/**
 * PR-30b — Bridge: PQM `AwardedContract` → e-GP reference identifier.
 *
 * Pure transform. No HTTP. Deterministic. Given the same input it
 * always returns the same reference object.
 *
 * The reference id schema mirrors the synthetic prefix used by the
 * fixtures: `EGP-<be2>-<slug>` where `<be2>` is the last two digits of
 * the contract's BE fiscal year and `<slug>` is the contract number
 * normalised to a `[A-Za-z0-9-]+` token.
 *
 * Fiscal year is derived from `signedAt` first, falling back to
 * `effectiveDate`. If neither date is present the contract is not yet
 * traceable to a fiscal year and we throw — the caller is expected to
 * gate on signature first.
 */
import type { AwardedContract } from '@/types/awarded-contract';

export interface EgpReference {
  /** Synthetic e-GP reference id derived from the contract. */
  referenceId: string;
  /** Buddhist-era fiscal year derived from the contract date. */
  fiscalYearBE: number;
  /** Back-pointer to the PQM contract that produced this reference. */
  linkedContractId: string;
}

const BE_OFFSET = 543;

function normaliseSlug(input: string): string {
  return input
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fiscalYearForContract(contract: AwardedContract): number {
  const iso = contract.signedAt ?? contract.effectiveDate;
  if (!iso) {
    throw new Error(
      'cannot derive fiscal year for contract — neither signedAt nor effectiveDate set',
    );
  }
  const ce = new Date(iso).getUTCFullYear();
  if (Number.isNaN(ce)) {
    throw new Error(`cannot parse fiscal year from contract date: ${iso}`);
  }
  return ce + BE_OFFSET;
}

export function eGpReferenceForContract(
  contract: AwardedContract,
): EgpReference {
  const fiscalYearBE = fiscalYearForContract(contract);
  const be2 = String(fiscalYearBE).slice(-2);
  const slug = normaliseSlug(contract.contractNumber);
  return {
    referenceId: `EGP-${be2}-${slug}`,
    fiscalYearBE,
    linkedContractId: contract.id,
  };
}
