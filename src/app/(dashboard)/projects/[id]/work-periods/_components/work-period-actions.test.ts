import { describe, expect, it } from 'vitest';

import {
  evidenceReadyForState,
  getLegalNextPaymentVoucherStates,
  getLegalNextWorkPeriodStates,
  type EvidencePresence,
} from './work-period-actions';

const NO_EVIDENCE: EvidencePresence = {
  hasDeliverySlip: false,
  hasCommitteeInspection: false,
  paymentVoucherState: null,
};

describe('getLegalNextWorkPeriodStates', () => {
  it('outsourced: submitted may go to inspection pass/fail (+cancel), not straight to payment', () => {
    const next = getLegalNextWorkPeriodStates('submitted', 'outsourced');
    expect(next).toContain('inspection_passed');
    expect(next).toContain('inspection_failed');
    expect(next).toContain('cancelled');
    expect(next).not.toContain('payment_requested');
  });

  it('in_house: submitted skips inspection and goes straight to payment_requested', () => {
    const next = getLegalNextWorkPeriodStates('submitted', 'in_house');
    expect(next).toContain('payment_requested');
    expect(next).not.toContain('inspection_passed');
    expect(next).not.toContain('inspection_failed');
  });

  it('inspection_failed can only rework back to in_progress (+cancel)', () => {
    const next = getLegalNextWorkPeriodStates('inspection_failed', 'outsourced');
    expect(next).toContain('in_progress');
    expect(next).toContain('cancelled');
    expect(next).not.toContain('submitted');
  });

  it('terminal payment_disbursed has no legal next states', () => {
    expect(getLegalNextWorkPeriodStates('payment_disbursed', 'outsourced')).toEqual([]);
  });

  it('terminal cancelled has no legal next states', () => {
    expect(getLegalNextWorkPeriodStates('cancelled', 'in_house')).toEqual([]);
  });

  it('never includes a self-transition', () => {
    expect(getLegalNextWorkPeriodStates('in_progress', 'in_house')).not.toContain('in_progress');
  });
});

describe('getLegalNextPaymentVoucherStates', () => {
  it('draft advances only to submitted', () => {
    expect(getLegalNextPaymentVoucherStates('draft')).toEqual(['submitted']);
  });

  it('submitted may be approved or rejected', () => {
    expect(getLegalNextPaymentVoucherStates('submitted')).toEqual(
      expect.arrayContaining(['approved', 'rejected']),
    );
  });

  it('approved advances only to paid', () => {
    expect(getLegalNextPaymentVoucherStates('approved')).toEqual(['paid']);
  });

  it('paid is terminal', () => {
    expect(getLegalNextPaymentVoucherStates('paid')).toEqual([]);
  });
});

describe('evidenceReadyForState', () => {
  it('submitted requires a delivery slip', () => {
    expect(evidenceReadyForState('submitted', NO_EVIDENCE)).toBe(false);
    expect(
      evidenceReadyForState('submitted', { ...NO_EVIDENCE, hasDeliverySlip: true }),
    ).toBe(true);
  });

  it('inspection_passed requires a committee inspection', () => {
    expect(evidenceReadyForState('inspection_passed', NO_EVIDENCE)).toBe(false);
    expect(
      evidenceReadyForState('inspection_passed', {
        ...NO_EVIDENCE,
        hasCommitteeInspection: true,
      }),
    ).toBe(true);
  });

  it('payment_requested requires a submitted (or later) voucher, not a draft', () => {
    expect(evidenceReadyForState('payment_requested', NO_EVIDENCE)).toBe(false);
    expect(
      evidenceReadyForState('payment_requested', {
        ...NO_EVIDENCE,
        paymentVoucherState: 'draft',
      }),
    ).toBe(false);
    expect(
      evidenceReadyForState('payment_requested', {
        ...NO_EVIDENCE,
        paymentVoucherState: 'submitted',
      }),
    ).toBe(true);
  });

  it('payment_approved requires an approved (or paid) voucher', () => {
    expect(
      evidenceReadyForState('payment_approved', {
        ...NO_EVIDENCE,
        paymentVoucherState: 'submitted',
      }),
    ).toBe(false);
    expect(
      evidenceReadyForState('payment_approved', {
        ...NO_EVIDENCE,
        paymentVoucherState: 'approved',
      }),
    ).toBe(true);
  });

  it('payment_disbursed requires a paid voucher', () => {
    expect(
      evidenceReadyForState('payment_disbursed', {
        ...NO_EVIDENCE,
        paymentVoucherState: 'approved',
      }),
    ).toBe(false);
    expect(
      evidenceReadyForState('payment_disbursed', {
        ...NO_EVIDENCE,
        paymentVoucherState: 'paid',
      }),
    ).toBe(true);
  });

  it('states with no evidence requirement are always ready', () => {
    expect(evidenceReadyForState('in_progress', NO_EVIDENCE)).toBe(true);
    expect(evidenceReadyForState('cancelled', NO_EVIDENCE)).toBe(true);
  });
});
