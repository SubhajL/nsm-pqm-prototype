import { describe, expect, it } from 'vitest';

import type { ContractAmendment } from '@/types/contract-amendment';

import {
  canManageProcurement,
  compatibleContractingModelsForBasis,
  foldContractAmendments,
  getLegalNextProcurementStates,
} from './procurement-actions';

describe('getLegalNextProcurementStates', () => {
  it('returns the forward step plus cancelled from each non-terminal state', () => {
    expect(getLegalNextProcurementStates('draft')).toEqual(['tor_review', 'cancelled']);
    expect(getLegalNextProcurementStates('tor_review')).toEqual([
      'tender_open',
      'cancelled',
    ]);
    expect(getLegalNextProcurementStates('tender_open')).toEqual([
      'evaluation',
      'cancelled',
    ]);
    expect(getLegalNextProcurementStates('evaluation')).toEqual([
      'awarded',
      'cancelled',
    ]);
  });

  it('returns no states from the terminal states', () => {
    expect(getLegalNextProcurementStates('awarded')).toEqual([]);
    expect(getLegalNextProcurementStates('cancelled')).toEqual([]);
  });

  it('never includes the self-transition', () => {
    for (const state of [
      'draft',
      'tor_review',
      'tender_open',
      'evaluation',
      'awarded',
      'cancelled',
    ] as const) {
      expect(getLegalNextProcurementStates(state)).not.toContain(state);
    }
  });
});

describe('foldContractAmendments', () => {
  const contract = { awardAmount: 1_000_000, expirationDate: '2026-12-31' };

  const amendment = (
    overrides: Partial<ContractAmendment> & Pick<ContractAmendment, 'amendmentNumber'>,
  ): ContractAmendment => ({
    id: `amd-${overrides.amendmentNumber}`,
    contractId: 'ctr-001',
    amendedAt: '2026-06-01',
    amountDelta: 0,
    scheduleDeltaDays: 0,
    reason: '',
    approvedBy: 'user-001',
    documentFileId: null,
    ...overrides,
  });

  it('returns the original values when there are no amendments', () => {
    expect(foldContractAmendments(contract, [])).toEqual({
      effectiveAmount: 1_000_000,
      effectiveExpirationDate: '2026-12-31',
      appliedCount: 0,
    });
  });

  it('applies amendments in amendmentNumber order even when input is unsorted', () => {
    const result = foldContractAmendments(contract, [
      amendment({ amendmentNumber: 2, amountDelta: -100_000, scheduleDeltaDays: 0 }),
      amendment({ amendmentNumber: 1, amountDelta: 500_000, scheduleDeltaDays: 30 }),
    ]);
    expect(result.effectiveAmount).toBe(1_400_000);
    expect(result.effectiveExpirationDate).toBe('2027-01-30');
    expect(result.appliedCount).toBe(2);
  });

  it('preserves a null expiration date regardless of schedule deltas', () => {
    const result = foldContractAmendments({ awardAmount: 1, expirationDate: null }, [
      amendment({ amendmentNumber: 1, scheduleDeltaDays: 90 }),
    ]);
    expect(result.effectiveExpirationDate).toBeNull();
  });

  it('does not mutate the input amendments array', () => {
    const input = [
      amendment({ amendmentNumber: 2 }),
      amendment({ amendmentNumber: 1 }),
    ];
    foldContractAmendments(contract, input);
    expect(input.map((a) => a.amendmentNumber)).toEqual([2, 1]);
  });
});

describe('canManageProcurement', () => {
  it('allows System Admin and Project Manager', () => {
    expect(canManageProcurement('System Admin')).toBe(true);
    expect(canManageProcurement('Project Manager')).toBe(true);
  });

  it('denies every other role and missing roles', () => {
    expect(canManageProcurement('Engineer')).toBe(false);
    expect(canManageProcurement('Coordinator')).toBe(false);
    expect(canManageProcurement('Team Member')).toBe(false);
    expect(canManageProcurement('Executive')).toBe(false);
    expect(canManageProcurement('Consultant')).toBe(false);
    expect(canManageProcurement(null)).toBe(false);
    expect(canManageProcurement(undefined)).toBe(false);
  });
});

describe('compatibleContractingModelsForBasis', () => {
  it('mirrors the estimate-basis compatibility matrix', () => {
    expect(compatibleContractingModelsForBasis('unit_price')).toEqual([
      'lump_sum',
      'unit_price',
      'design_build',
    ]);
    expect(compatibleContractingModelsForBasis('lump_sum')).toEqual(['lump_sum']);
    expect(compatibleContractingModelsForBasis('cost_plus')).toEqual(['cost_plus']);
  });
});
