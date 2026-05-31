/**
 * PR-27 — Change-request + project-approval workflow routing rules.
 *
 * These pure helpers classify a CR's required approval level (per PR-14
 * authority table) and gate state transitions for both `ChangeRequest`
 * and `ProjectApprovalRequest` workflows by actor role.
 *
 * Threshold contract (per spec):
 *   - Small  CR  (|impact| < ฿1M)            → PM approval only
 *   - Medium CR  (฿1M ≤ |impact| < ฿10M)     → bureau head approval
 *   - Large  CR  (|impact| ≥ ฿10M)
 *     OR the parent project's sizeTier === 'large'
 *                                            → committee approval
 *
 * Negative budget deltas (scope reductions / refunds) are bucketed by
 * absolute magnitude — a ฿15M REDUCTION is as material as a ฿15M
 * INCREASE and warrants the same authority sign-off.
 */
import { describe, expect, it } from 'vitest';

import type { ChangeRequest } from '@/types/document';
import type { ProjectApprovalRequest } from '@/types/project-approval-request';
import type { UserRole } from '@/types/admin';

import {
  canTransitionApprovalRequest,
  canTransitionChangeRequest,
  requiredApprovalLevelForChangeRequest,
  type ApprovalLevel,
} from './change-request-routing';

describe('requiredApprovalLevelForChangeRequest', () => {
  it.each<[number, 'small' | 'medium' | 'large', ApprovalLevel]>([
    // Small CRs on small projects → PM
    [0, 'small', 'pm'],
    [1, 'small', 'pm'],
    [500_000, 'small', 'pm'],
    [999_999, 'small', 'pm'],
    // Exactly at ฿1M boundary → bureau (inclusive lower bound of medium)
    [1_000_000, 'small', 'bureau_head'],
    [5_000_000, 'small', 'bureau_head'],
    [9_999_999, 'small', 'bureau_head'],
    // ≥ ฿10M → committee
    [10_000_000, 'small', 'committee'],
    [25_000_000, 'small', 'committee'],
    [100_000_000, 'medium', 'committee'],
    // Negative deltas — use absolute magnitude
    [-500_000, 'small', 'pm'],
    [-1_000_000, 'small', 'bureau_head'],
    [-15_000_000, 'small', 'committee'],
  ])(
    'impact %s THB on a %s project → %s',
    (impact, sizeTier, expected) => {
      expect(requiredApprovalLevelForChangeRequest(impact, sizeTier)).toBe(expected);
    },
  );

  it('large projects ALWAYS escalate to committee regardless of CR size', () => {
    expect(requiredApprovalLevelForChangeRequest(0, 'large')).toBe('committee');
    expect(requiredApprovalLevelForChangeRequest(100, 'large')).toBe('committee');
    expect(requiredApprovalLevelForChangeRequest(500_000, 'large')).toBe('committee');
    expect(requiredApprovalLevelForChangeRequest(2_000_000, 'large')).toBe('committee');
  });
});

describe('canTransitionChangeRequest', () => {
  type Status = ChangeRequest['status'];

  it('allows the canonical happy path: submitted → under_review → pm_approved → applied', () => {
    expect(canTransitionChangeRequest('submitted', 'under_review', 'Project Manager').ok).toBe(true);
    expect(canTransitionChangeRequest('under_review', 'pm_approved', 'Project Manager').ok).toBe(true);
    expect(canTransitionChangeRequest('pm_approved', 'applied', 'Project Manager').ok).toBe(true);
  });

  it('allows escalation chain: under_review → bureau_approved → committee_approved → applied', () => {
    // Bureau approval needs Project Manager (acts as bureau head in MVP role mapping).
    expect(canTransitionChangeRequest('under_review', 'bureau_approved', 'Project Manager').ok).toBe(true);
    // Committee escalation needs System Admin (MVP placeholder per approval-authority).
    expect(canTransitionChangeRequest('bureau_approved', 'committee_approved', 'System Admin').ok).toBe(true);
    expect(canTransitionChangeRequest('committee_approved', 'applied', 'System Admin').ok).toBe(true);
  });

  it('allows rejecting from any non-terminal state', () => {
    const statuses: Status[] = ['submitted', 'under_review', 'pm_approved', 'bureau_approved', 'committee_approved'];
    for (const from of statuses) {
      const result = canTransitionChangeRequest(from, 'rejected', 'Project Manager');
      expect(result.ok, `from=${from}`).toBe(true);
    }
  });

  it('refuses to move OUT of terminal states (applied | rejected)', () => {
    expect(canTransitionChangeRequest('applied', 'under_review', 'System Admin').ok).toBe(false);
    expect(canTransitionChangeRequest('rejected', 'submitted', 'System Admin').ok).toBe(false);
    expect(canTransitionChangeRequest('applied', 'rejected', 'System Admin').ok).toBe(false);
  });

  it('refuses transitions that skip the workflow chain', () => {
    // submitted cannot jump directly to applied
    expect(canTransitionChangeRequest('submitted', 'applied', 'System Admin').ok).toBe(false);
    // under_review cannot jump directly to applied
    expect(canTransitionChangeRequest('under_review', 'applied', 'System Admin').ok).toBe(false);
  });

  it('rejects actors who lack approve_change_request capability', () => {
    const result = canTransitionChangeRequest('under_review', 'pm_approved', 'Team Member');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/role|capability|not permitted/i);
    }
  });

  it('rejects unauthorized actors from rejecting', () => {
    const result = canTransitionChangeRequest('submitted', 'rejected', 'Team Member');
    expect(result.ok).toBe(false);
  });

  it('returns the same shape ({ok:false, reason}) for every refusal', () => {
    const cases: Array<[Status, Status, UserRole]> = [
      ['applied', 'rejected', 'System Admin'],
      ['rejected', 'applied', 'System Admin'],
      ['submitted', 'applied', 'System Admin'],
      ['under_review', 'pm_approved', 'Executive'],
    ];
    for (const [from, to, role] of cases) {
      const result = canTransitionChangeRequest(from, to, role);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('canTransitionApprovalRequest', () => {
  type State = ProjectApprovalRequest['state'];

  it('allows the canonical happy path through PM → bureau → committee → approved', () => {
    expect(canTransitionApprovalRequest('submitted', 'pm_review', 'Project Manager').ok).toBe(true);
    expect(canTransitionApprovalRequest('pm_review', 'bureau_review', 'Project Manager').ok).toBe(true);
    expect(canTransitionApprovalRequest('bureau_review', 'committee_review', 'Project Manager').ok).toBe(true);
    expect(canTransitionApprovalRequest('committee_review', 'approved', 'System Admin').ok).toBe(true);
  });

  it('allows shortcut paths: pm_review → approved (small projects skip bureau/committee)', () => {
    expect(canTransitionApprovalRequest('pm_review', 'approved', 'Project Manager').ok).toBe(true);
    expect(canTransitionApprovalRequest('bureau_review', 'approved', 'Project Manager').ok).toBe(true);
  });

  it('allows rejection from any review state', () => {
    const states: State[] = ['submitted', 'pm_review', 'bureau_review', 'committee_review'];
    for (const from of states) {
      const result = canTransitionApprovalRequest(from, 'rejected', 'Project Manager');
      expect(result.ok, `from=${from}`).toBe(true);
    }
  });

  it('allows the submitter to withdraw from any pre-terminal state', () => {
    const states: State[] = ['submitted', 'pm_review', 'bureau_review', 'committee_review'];
    for (const from of states) {
      const result = canTransitionApprovalRequest(from, 'withdrawn', 'Project Manager');
      expect(result.ok, `from=${from}`).toBe(true);
    }
  });

  it('refuses transitions OUT of terminal states (approved | rejected | withdrawn)', () => {
    const terminals: State[] = ['approved', 'rejected', 'withdrawn'];
    for (const from of terminals) {
      const result = canTransitionApprovalRequest(from, 'pm_review', 'System Admin');
      expect(result.ok, `from=${from}`).toBe(false);
    }
  });

  it('refuses backward transitions (e.g. committee_review → pm_review)', () => {
    expect(canTransitionApprovalRequest('committee_review', 'pm_review', 'System Admin').ok).toBe(false);
    expect(canTransitionApprovalRequest('bureau_review', 'pm_review', 'System Admin').ok).toBe(false);
  });

  it('refuses self-transitions (no-op)', () => {
    expect(canTransitionApprovalRequest('pm_review', 'pm_review', 'Project Manager').ok).toBe(false);
  });

  it('rejects actors who lack approve capability', () => {
    const result = canTransitionApprovalRequest('pm_review', 'approved', 'Team Member');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/role|capability|not permitted/i);
    }
  });

  it('returns consistent {ok:false, reason} shape', () => {
    const cases: Array<[State, State, UserRole]> = [
      ['approved', 'pm_review', 'System Admin'],
      ['pm_review', 'pm_review', 'Project Manager'],
      ['committee_review', 'pm_review', 'System Admin'],
      ['pm_review', 'approved', 'Executive'],
    ];
    for (const [from, to, role] of cases) {
      const result = canTransitionApprovalRequest(from, to, role);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(0);
      }
    }
  });
});
