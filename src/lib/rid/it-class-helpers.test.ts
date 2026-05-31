/**
 * PR-30a — Pure helper tests for IT-class extensions.
 *
 * Covers:
 *   - `canTransitionSow` — SOW state machine (draft → agreed → in_delivery
 *     → uat → accepted | rejected, rejected → in_delivery rework).
 *   - `isSprintComplete` — sprint is "complete" when end date is past AND
 *     velocity is recorded.
 *   - `computeSprintHealth` — completed/planned ratio banding.
 */

import { describe, expect, it } from 'vitest';

import {
  canTransitionSow,
  computeSprintHealth,
  isSprintComplete,
} from './it-class-helpers';
import type { SowState } from '@/types/vendor-sow';

describe('canTransitionSow', () => {
  describe('happy-path transitions', () => {
    it.each([
      ['draft', 'agreed'],
      ['agreed', 'in_delivery'],
      ['in_delivery', 'uat'],
      ['uat', 'accepted'],
      ['uat', 'rejected'],
      ['rejected', 'in_delivery'],
    ] as Array<[SowState, SowState]>)('allows %s → %s', (from, to) => {
      const decision = canTransitionSow(from, to);
      expect(decision.ok).toBe(true);
    });
  });

  describe('illegal transitions are rejected', () => {
    it.each([
      // skip-ahead from draft
      ['draft', 'in_delivery'],
      ['draft', 'uat'],
      ['draft', 'accepted'],
      ['draft', 'rejected'],
      // skip-ahead from agreed
      ['agreed', 'uat'],
      ['agreed', 'accepted'],
      ['agreed', 'rejected'],
      // skip-ahead from in_delivery
      ['in_delivery', 'accepted'],
      ['in_delivery', 'rejected'],
      ['in_delivery', 'agreed'],
      // skip-ahead from rejected
      ['rejected', 'uat'],
      ['rejected', 'accepted'],
      ['rejected', 'agreed'],
      ['rejected', 'draft'],
      // backwards from uat
      ['uat', 'in_delivery'],
      ['uat', 'agreed'],
      ['uat', 'draft'],
    ] as Array<[SowState, SowState]>)(
      'rejects %s → %s with an informative reason',
      (from, to) => {
        const decision = canTransitionSow(from, to);
        if (decision.ok) throw new Error(`expected ${from} → ${to} to be rejected`);
        expect(decision.reason).toMatch(/transition|terminal|self/i);
      },
    );
  });

  describe('accepted is terminal', () => {
    it.each(['draft', 'agreed', 'in_delivery', 'uat', 'rejected'] as SowState[])(
      'rejects accepted → %s',
      (to) => {
        const decision = canTransitionSow('accepted', to);
        if (decision.ok) throw new Error('expected accepted to be terminal');
        expect(decision.reason).toMatch(/terminal|accepted/i);
      },
    );
  });

  describe('self-transitions are rejected', () => {
    it.each([
      'draft',
      'agreed',
      'in_delivery',
      'uat',
      'accepted',
      'rejected',
    ] as SowState[])('rejects %s → %s', (state) => {
      const decision = canTransitionSow(state, state);
      if (decision.ok) throw new Error('expected self-transition rejected');
      expect(decision.reason).toMatch(/self|unchanged/i);
    });
  });
});

describe('isSprintComplete', () => {
  it('returns true when the sprint ended in the past and velocity was recorded', () => {
    expect(
      isSprintComplete(
        { endDate: '2026-04-30', completedPoints: 24 },
        '2026-05-30T00:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('returns false when the sprint ended in the past but no velocity recorded', () => {
    expect(
      isSprintComplete(
        { endDate: '2026-04-30', completedPoints: 0 },
        '2026-05-30T00:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('returns false when the sprint has not ended yet (future endDate)', () => {
    expect(
      isSprintComplete(
        { endDate: '2026-12-30', completedPoints: 30 },
        '2026-05-30T00:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('returns true when endDate equals now (boundary: just ended) and points recorded', () => {
    expect(
      isSprintComplete(
        { endDate: '2026-05-30', completedPoints: 1 },
        '2026-05-30T23:59:59.999Z',
      ),
    ).toBe(true);
  });

  it('returns false when completedPoints is negative (defensive)', () => {
    expect(
      isSprintComplete(
        { endDate: '2026-04-30', completedPoints: -1 },
        '2026-05-30T00:00:00.000Z',
      ),
    ).toBe(false);
  });
});

describe('computeSprintHealth', () => {
  describe('banding thresholds', () => {
    it('returns on_track when completed/planned >= 0.85', () => {
      expect(computeSprintHealth(20, 20)).toBe('on_track');
      expect(computeSprintHealth(20, 17)).toBe('on_track'); // 0.85 exact
      expect(computeSprintHealth(20, 18)).toBe('on_track');
    });

    it('returns at_risk when 0.6 <= completed/planned < 0.85', () => {
      expect(computeSprintHealth(20, 16)).toBe('at_risk'); // 0.80
      expect(computeSprintHealth(20, 12)).toBe('at_risk'); // 0.60 exact
      expect(computeSprintHealth(20, 13)).toBe('at_risk'); // 0.65
    });

    it('returns off_track when completed/planned < 0.6', () => {
      expect(computeSprintHealth(20, 11)).toBe('off_track'); // 0.55
      expect(computeSprintHealth(20, 0)).toBe('off_track');
    });
  });

  describe('edge cases', () => {
    it('returns off_track when planned is 0 and completed is 0 (degenerate)', () => {
      expect(computeSprintHealth(0, 0)).toBe('off_track');
    });

    it('returns on_track when completed exceeds planned (over-delivery)', () => {
      expect(computeSprintHealth(20, 30)).toBe('on_track');
    });

    it('treats negative planned as off_track (defensive)', () => {
      expect(computeSprintHealth(-5, 10)).toBe('off_track');
    });

    it('treats negative completed as off_track (defensive)', () => {
      expect(computeSprintHealth(20, -1)).toBe('off_track');
    });
  });

  describe('determinism', () => {
    it('is deterministic — same inputs return same band', () => {
      const a = computeSprintHealth(20, 17);
      const b = computeSprintHealth(20, 17);
      expect(a).toBe(b);
    });
  });
});
