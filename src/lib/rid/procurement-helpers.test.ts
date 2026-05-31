import { describe, expect, it } from 'vitest';

import type { AwardedContract } from '@/types/awarded-contract';
import type { ContractAmendment } from '@/types/contract-amendment';
import type { EngineeringEstimate } from '@/types/engineering-estimate';
import {
  PROCUREMENT_STATES,
  type ProcurementState,
} from '@/types/procurement-package';

import {
  applyAmendmentToContract,
  canTransitionProcurement,
  isEstimateBasisCompatible,
} from './procurement-helpers';

describe('canTransitionProcurement', () => {
  // Explicit, exhaustive matrix per spec.
  const allowed: Array<[ProcurementState, ProcurementState]> = [
    ['draft', 'tor_review'],
    ['draft', 'cancelled'],
    ['tor_review', 'tender_open'],
    ['tor_review', 'cancelled'],
    ['tender_open', 'evaluation'],
    ['tender_open', 'cancelled'],
    ['evaluation', 'awarded'],
    ['evaluation', 'cancelled'],
  ];

  it.each(allowed)('allows %s -> %s', (from, to) => {
    const result = canTransitionProcurement(from, to);
    expect(result.ok).toBe(true);
  });

  it('rejects transitions out of terminal awarded state', () => {
    for (const to of PROCUREMENT_STATES) {
      if (to === 'awarded') continue; // self-edge not interesting
      const result = canTransitionProcurement('awarded', to);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/awarded/i);
      }
    }
  });

  it('rejects transitions out of terminal cancelled state', () => {
    for (const to of PROCUREMENT_STATES) {
      if (to === 'cancelled') continue;
      const result = canTransitionProcurement('cancelled', to);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/cancelled/i);
      }
    }
  });

  it('rejects self-transitions (no-op moves)', () => {
    for (const state of PROCUREMENT_STATES) {
      const result = canTransitionProcurement(state, state);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects skipping stages (draft -> tender_open)', () => {
    const result = canTransitionProcurement('draft', 'tender_open');
    expect(result.ok).toBe(false);
  });

  it('rejects backward transitions (evaluation -> draft)', () => {
    const result = canTransitionProcurement('evaluation', 'draft');
    expect(result.ok).toBe(false);
  });
});

describe('isEstimateBasisCompatible', () => {
  const compatible: Array<
    [EngineeringEstimate['basis'], AwardedContract['contractingModel']]
  > = [
    ['unit_price', 'unit_price'],
    ['lump_sum', 'lump_sum'],
    ['cost_plus', 'cost_plus'],
    // unit_price estimates can also back design_build and lump_sum awards
    // (BOQ is the canonical pricing input even when the contract sums to a
    // lump number or rolls in design effort).
    ['unit_price', 'lump_sum'],
    ['unit_price', 'design_build'],
  ];

  const incompatible: Array<
    [EngineeringEstimate['basis'], AwardedContract['contractingModel']]
  > = [
    ['lump_sum', 'unit_price'],
    ['lump_sum', 'cost_plus'],
    ['cost_plus', 'unit_price'],
    ['cost_plus', 'lump_sum'],
    ['cost_plus', 'design_build'],
  ];

  it.each(compatible)('accepts basis=%s + model=%s', (basis, model) => {
    expect(isEstimateBasisCompatible(basis, model)).toBe(true);
  });

  it.each(incompatible)('rejects basis=%s + model=%s', (basis, model) => {
    expect(isEstimateBasisCompatible(basis, model)).toBe(false);
  });
});

describe('applyAmendmentToContract', () => {
  const baseContract: Pick<AwardedContract, 'awardAmount' | 'expirationDate'> = {
    awardAmount: 10_000_000,
    expirationDate: '2026-12-31',
  };

  function amendment(
    overrides: Partial<
      Pick<ContractAmendment, 'amountDelta' | 'scheduleDeltaDays'>
    > = {},
  ): Pick<ContractAmendment, 'amountDelta' | 'scheduleDeltaDays'> {
    return {
      amountDelta: 0,
      scheduleDeltaDays: 0,
      ...overrides,
    };
  }

  it('returns the contract base when amendment deltas are zero', () => {
    const result = applyAmendmentToContract(baseContract, amendment());
    expect(result.effectiveAmount).toBe(10_000_000);
    expect(result.effectiveExpirationDate).toBe('2026-12-31');
  });

  it('adds positive amountDelta', () => {
    const result = applyAmendmentToContract(
      baseContract,
      amendment({ amountDelta: 500_000 }),
    );
    expect(result.effectiveAmount).toBe(10_500_000);
  });

  it('subtracts negative amountDelta (deductive amendment)', () => {
    const result = applyAmendmentToContract(
      baseContract,
      amendment({ amountDelta: -250_000 }),
    );
    expect(result.effectiveAmount).toBe(9_750_000);
  });

  it('shifts expirationDate by scheduleDeltaDays', () => {
    const result = applyAmendmentToContract(
      baseContract,
      amendment({ scheduleDeltaDays: 30 }),
    );
    // 2026-12-31 + 30 days = 2027-01-30
    expect(result.effectiveExpirationDate).toBe('2027-01-30');
  });

  it('shifts expirationDate negatively (early termination amendment)', () => {
    const result = applyAmendmentToContract(
      baseContract,
      amendment({ scheduleDeltaDays: -10 }),
    );
    // 2026-12-31 - 10 days = 2026-12-21
    expect(result.effectiveExpirationDate).toBe('2026-12-21');
  });

  it('returns null expirationDate when the contract has no end date', () => {
    const result = applyAmendmentToContract(
      { awardAmount: 1_000_000, expirationDate: null },
      amendment({ scheduleDeltaDays: 30 }),
    );
    expect(result.effectiveExpirationDate).toBeNull();
  });

  it('composes correctly when applied iteratively (chained amendments)', () => {
    const r1 = applyAmendmentToContract(
      baseContract,
      amendment({ amountDelta: 100_000, scheduleDeltaDays: 5 }),
    );
    const r2 = applyAmendmentToContract(
      { awardAmount: r1.effectiveAmount, expirationDate: r1.effectiveExpirationDate },
      amendment({ amountDelta: -50_000, scheduleDeltaDays: 10 }),
    );
    expect(r2.effectiveAmount).toBe(10_050_000);
    // 2026-12-31 + 5 + 10 = 2027-01-15
    expect(r2.effectiveExpirationDate).toBe('2027-01-15');
  });
});
