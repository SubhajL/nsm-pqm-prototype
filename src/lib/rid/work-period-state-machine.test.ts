/**
 * PR-23 — Pure state-machine matrix tests for the WorkPeriod lifecycle.
 *
 * The state machine is the core of งวดงาน-driven payment release. It
 * encodes RID's three-rail flow: in_house skips committee inspection,
 * outsourced and consultant_supervised do not. Every cell in the
 * (state × state × deliveryMethod) cube is asserted here so a stray
 * permissive transition cannot slip into the code without a failing
 * test.
 */

import { describe, expect, it } from 'vitest';

import { canTransitionWorkPeriod } from './work-period-state-machine';
import type { DeliveryMethod } from '@/types/rid/vocabulary';

const SKIP_INSPECTION: DeliveryMethod[] = ['in_house'];
const REQUIRES_INSPECTION: DeliveryMethod[] = [
  'outsourced',
  'consultant_supervised',
];

describe('canTransitionWorkPeriod', () => {
  describe('shared rules (apply to every delivery method)', () => {
    const ALL_METHODS: DeliveryMethod[] = [
      'in_house',
      'outsourced',
      'consultant_supervised',
    ];

    it.each(ALL_METHODS)('planned → in_progress is legal (%s)', (method) => {
      expect(canTransitionWorkPeriod('planned', 'in_progress', method)).toEqual({
        ok: true,
      });
    });

    it.each(ALL_METHODS)('in_progress → submitted is legal (%s)', (method) => {
      expect(canTransitionWorkPeriod('in_progress', 'submitted', method)).toEqual(
        { ok: true },
      );
    });

    it.each(ALL_METHODS)(
      'planned → planned is rejected (no-op self-transitions are not permitted) (%s)',
      (method) => {
        const decision = canTransitionWorkPeriod('planned', 'planned', method);
        expect(decision.ok).toBe(false);
      },
    );

    it.each(ALL_METHODS)(
      'inspection_failed → in_progress is legal (rework) (%s)',
      (method) => {
        expect(
          canTransitionWorkPeriod('inspection_failed', 'in_progress', method),
        ).toEqual({ ok: true });
      },
    );

    it.each(ALL_METHODS)(
      'inspection_failed → submitted is rejected (must re-enter in_progress first) (%s)',
      (method) => {
        const decision = canTransitionWorkPeriod(
          'inspection_failed',
          'submitted',
          method,
        );
        expect(decision.ok).toBe(false);
      },
    );

    it.each(ALL_METHODS)(
      'payment_disbursed is terminal — any onward transition is rejected (%s)',
      (method) => {
        const decision = canTransitionWorkPeriod(
          'payment_disbursed',
          'payment_requested',
          method,
        );
        expect(decision.ok).toBe(false);
      },
    );

    it.each(ALL_METHODS)(
      'cancelled is terminal — any onward transition is rejected (%s)',
      (method) => {
        const decision = canTransitionWorkPeriod(
          'cancelled',
          'in_progress',
          method,
        );
        expect(decision.ok).toBe(false);
      },
    );

    it.each(ALL_METHODS)(
      'cancelled is reachable from every non-terminal state (%s)',
      (method) => {
        const nonTerminal = [
          'planned',
          'in_progress',
          'submitted',
          'inspection_passed',
          'inspection_failed',
          'payment_requested',
          'payment_approved',
        ] as const;
        for (const from of nonTerminal) {
          expect(canTransitionWorkPeriod(from, 'cancelled', method)).toEqual({
            ok: true,
          });
        }
      },
    );

    it.each(ALL_METHODS)(
      'payment_approved → payment_disbursed is legal (%s)',
      (method) => {
        expect(
          canTransitionWorkPeriod(
            'payment_approved',
            'payment_disbursed',
            method,
          ),
        ).toEqual({ ok: true });
      },
    );

    it.each(ALL_METHODS)(
      'payment_requested → payment_approved is legal (%s)',
      (method) => {
        expect(
          canTransitionWorkPeriod(
            'payment_requested',
            'payment_approved',
            method,
          ),
        ).toEqual({ ok: true });
      },
    );
  });

  describe('in_house — committee inspection is skipped', () => {
    it.each(SKIP_INSPECTION)(
      'submitted → payment_requested is legal (%s)',
      (method) => {
        expect(
          canTransitionWorkPeriod('submitted', 'payment_requested', method),
        ).toEqual({ ok: true });
      },
    );

    it.each(SKIP_INSPECTION)(
      'submitted → inspection_passed is rejected (%s)',
      (method) => {
        const decision = canTransitionWorkPeriod(
          'submitted',
          'inspection_passed',
          method,
        );
        expect(decision.ok).toBe(false);
      },
    );

    it.each(SKIP_INSPECTION)(
      'submitted → inspection_failed is rejected (%s)',
      (method) => {
        const decision = canTransitionWorkPeriod(
          'submitted',
          'inspection_failed',
          method,
        );
        expect(decision.ok).toBe(false);
      },
    );
  });

  describe('outsourced + consultant_supervised — committee inspection required', () => {
    it.each(REQUIRES_INSPECTION)(
      'submitted → inspection_passed is legal (%s)',
      (method) => {
        expect(
          canTransitionWorkPeriod('submitted', 'inspection_passed', method),
        ).toEqual({ ok: true });
      },
    );

    it.each(REQUIRES_INSPECTION)(
      'submitted → inspection_failed is legal (%s)',
      (method) => {
        expect(
          canTransitionWorkPeriod('submitted', 'inspection_failed', method),
        ).toEqual({ ok: true });
      },
    );

    it.each(REQUIRES_INSPECTION)(
      'inspection_passed → payment_requested is legal (%s)',
      (method) => {
        expect(
          canTransitionWorkPeriod(
            'inspection_passed',
            'payment_requested',
            method,
          ),
        ).toEqual({ ok: true });
      },
    );

    it.each(REQUIRES_INSPECTION)(
      'submitted → payment_requested is rejected (must pass inspection first) (%s)',
      (method) => {
        const decision = canTransitionWorkPeriod(
          'submitted',
          'payment_requested',
          method,
        );
        expect(decision.ok).toBe(false);
      },
    );
  });

  describe('cross-rail illegal transitions', () => {
    it('planned → payment_requested is always rejected', () => {
      expect(
        canTransitionWorkPeriod('planned', 'payment_requested', 'in_house').ok,
      ).toBe(false);
      expect(
        canTransitionWorkPeriod('planned', 'payment_requested', 'outsourced').ok,
      ).toBe(false);
      expect(
        canTransitionWorkPeriod(
          'planned',
          'payment_requested',
          'consultant_supervised',
        ).ok,
      ).toBe(false);
    });

    it('in_progress → inspection_passed is always rejected (must go through submitted)', () => {
      expect(
        canTransitionWorkPeriod('in_progress', 'inspection_passed', 'in_house')
          .ok,
      ).toBe(false);
      expect(
        canTransitionWorkPeriod(
          'in_progress',
          'inspection_passed',
          'outsourced',
        ).ok,
      ).toBe(false);
    });

    it('payment_approved → submitted is always rejected (no backward movement)', () => {
      expect(
        canTransitionWorkPeriod(
          'payment_approved',
          'submitted',
          'outsourced',
        ).ok,
      ).toBe(false);
    });
  });

  describe('rejection reasons are informative', () => {
    it('in_house rejection of inspection_passed names delivery method', () => {
      const decision = canTransitionWorkPeriod(
        'submitted',
        'inspection_passed',
        'in_house',
      );
      if (decision.ok) throw new Error('expected rejection');
      expect(decision.reason).toMatch(/in_house|inspection/i);
    });

    it('terminal-state rejection names the terminal state', () => {
      const decision = canTransitionWorkPeriod(
        'cancelled',
        'planned',
        'in_house',
      );
      if (decision.ok) throw new Error('expected rejection');
      expect(decision.reason).toMatch(/cancelled|terminal/i);
    });
  });
});

/* ============================================================================
 * PR-23 follow-up (post-rebase senior review): payment-voucher transitions +
 * evidence-record gating. These were the two HIGH bugs surfaced by the
 * senior team lead's g-check pass.
 * ========================================================================== */

import { canTransitionPaymentVoucher, evidenceRequirementForState } from './work-period-state-machine';
import type { PaymentVoucherState } from '@/types/payment-voucher';

describe('canTransitionPaymentVoucher', () => {
  describe('happy-path transitions', () => {
    it.each([
      ['draft', 'submitted'],
      ['submitted', 'approved'],
      ['submitted', 'rejected'],
      ['approved', 'paid'],
      ['rejected', 'draft'],
    ] as Array<[PaymentVoucherState, PaymentVoucherState]>)(
      'allows %s → %s',
      (from, to) => {
        expect(canTransitionPaymentVoucher(from, to).ok).toBe(true);
      },
    );
  });

  describe('blocks illegal transitions (the HIGH bug the route currently permits)', () => {
    it.each([
      // skip from draft straight to paid
      ['draft', 'approved'],
      ['draft', 'paid'],
      ['submitted', 'paid'],
      // reversals from terminal / late states
      ['paid', 'draft'],
      ['paid', 'submitted'],
      ['paid', 'approved'],
      ['paid', 'rejected'],
      ['approved', 'draft'],
      ['approved', 'submitted'],
      ['rejected', 'submitted'],
      ['rejected', 'approved'],
      ['rejected', 'paid'],
    ] as Array<[PaymentVoucherState, PaymentVoucherState]>)(
      'rejects %s → %s with an informative reason',
      (from, to) => {
        const decision = canTransitionPaymentVoucher(from, to);
        if (decision.ok) throw new Error(`expected ${from} → ${to} to be rejected`);
        expect(decision.reason).toMatch(/transition|terminal|self/i);
      },
    );
  });

  describe('self-transition guard', () => {
    it.each(['draft', 'submitted', 'approved', 'paid', 'rejected'] as PaymentVoucherState[])(
      'rejects %s → %s',
      (state) => {
        const decision = canTransitionPaymentVoucher(state, state);
        if (decision.ok) throw new Error('expected self-transition to be rejected');
        expect(decision.reason).toMatch(/self|unchanged/i);
      },
    );
  });

  describe('paid is terminal', () => {
    it.each(['draft', 'submitted', 'approved', 'rejected'] as PaymentVoucherState[])(
      'rejects paid → %s',
      (to) => {
        const decision = canTransitionPaymentVoucher('paid', to);
        if (decision.ok) throw new Error('expected paid to be terminal');
        expect(decision.reason).toMatch(/terminal|paid/i);
      },
    );
  });
});

describe('evidenceRequirementForState', () => {
  it('requires a delivery slip before entering submitted', () => {
    expect(evidenceRequirementForState('submitted')).toBe('delivery_slip');
  });

  it.each(['inspection_passed', 'inspection_failed'] as const)(
    'requires a committee inspection before entering %s',
    (state) => {
      expect(evidenceRequirementForState(state)).toBe('committee_inspection');
    },
  );

  it.each(['payment_requested', 'payment_approved', 'payment_disbursed'] as const)(
    'requires a payment voucher before entering %s',
    (state) => {
      expect(evidenceRequirementForState(state)).toBe('payment_voucher');
    },
  );

  it.each(['planned', 'in_progress', 'cancelled'] as const)(
    'has no evidence requirement for %s',
    (state) => {
      expect(evidenceRequirementForState(state)).toBeNull();
    },
  );
});
