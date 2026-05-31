/**
 * PR-30b — e-GP linker unit tests.
 *
 * `eGpReferenceForContract` is a pure transform from PQM's
 * `AwardedContract` to the synthetic e-GP reference shape we'd hand to
 * the eventual adapter. No HTTP. No randomness. Deterministic for a
 * given (contractNumber, fiscalYearBE, awardedAt) tuple.
 */
import { describe, expect, it } from 'vitest';

import type { AwardedContract } from '@/types/awarded-contract';

import { eGpReferenceForContract } from './linker';

function makeContract(
  overrides: Partial<AwardedContract> = {},
): AwardedContract {
  return {
    id: 'contract-1',
    procurementPackageId: 'pkg-1',
    projectId: 'proj-1',
    contractNumber: 'CON/2569/0042',
    contractorName: 'บริษัทรับเหมาทดสอบ จำกัด',
    contractorTaxId: '0105561012345',
    awardAmount: 5_500_000,
    contractingModel: 'unit_price',
    state: 'signed',
    signedAt: '2026-03-01T00:00:00.000Z',
    effectiveDate: '2026-03-10T00:00:00.000Z',
    expirationDate: '2027-03-09T00:00:00.000Z',
    warrantyMonths: 24,
    notes: '',
    ...overrides,
  };
}

describe('eGpReferenceForContract', () => {
  it('derives a reference id from the contract number and fiscal year', () => {
    const contract = makeContract({
      contractNumber: 'CON/2569/0042',
      signedAt: '2026-03-01T00:00:00.000Z',
    });
    const ref = eGpReferenceForContract(contract);
    // CE 2026 -> BE 2569 -> uses last two digits "69"
    expect(ref.referenceId).toBe('EGP-69-CON-2569-0042');
    expect(ref.fiscalYearBE).toBe(2569);
    expect(ref.linkedContractId).toBe(contract.id);
  });

  it('is deterministic — same input twice yields same reference', () => {
    const contract = makeContract();
    const a = eGpReferenceForContract(contract);
    const b = eGpReferenceForContract(contract);
    expect(a).toEqual(b);
  });

  it('falls back to the contract effectiveDate when signedAt is null', () => {
    const contract = makeContract({
      signedAt: null,
      effectiveDate: '2026-03-10T00:00:00.000Z',
    });
    const ref = eGpReferenceForContract(contract);
    expect(ref.fiscalYearBE).toBe(2569);
  });

  it.each([
    ['CON/2569/0042', 'CON-2569-0042'],
    ['Project_X', 'Project-X'],
    ['  spaced  num  ', 'spaced-num'],
    ['Multi//Slash', 'Multi-Slash'],
  ])(
    'normalises contract number %p to slug %p inside the reference',
    (input, expectedSlug) => {
      const contract = makeContract({ contractNumber: input });
      const ref = eGpReferenceForContract(contract);
      expect(ref.referenceId.endsWith(expectedSlug)).toBe(true);
    },
  );

  it('throws when both signedAt and effectiveDate are null', () => {
    const contract = makeContract({ signedAt: null, effectiveDate: null });
    expect(() => eGpReferenceForContract(contract)).toThrow(/fiscal year/i);
  });
});
