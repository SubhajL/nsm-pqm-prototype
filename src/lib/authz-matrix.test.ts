import { describe, expect, it } from 'vitest';

import { ALL_ACTIONS, ALL_ROLES, AUTHZ_MATRIX, type Action } from '@/lib/authz-matrix';
import type { UserRole } from '@/types/admin';

// ---------------------------------------------------------------------------
// Matrix-completeness tests
//
// Every role must have an explicit allow/deny decision for every action. The
// matrix is the source of truth for project-action authorization — if a role
// is missing from AUTHZ_MATRIX, or if a new action is added without
// re-evaluating each role, the gap will surface here rather than as a silent
// runtime bypass.
// ---------------------------------------------------------------------------

describe('AUTHZ_MATRIX completeness', () => {
  it('contains an entry for every UserRole', () => {
    for (const role of ALL_ROLES) {
      expect(AUTHZ_MATRIX[role], `role "${role}" missing from AUTHZ_MATRIX`).toBeInstanceOf(Set);
    }
  });

  it('each role entry is a Set of valid Action values', () => {
    const validActions = new Set<string>(ALL_ACTIONS);

    for (const role of ALL_ROLES) {
      const actions = Array.from(AUTHZ_MATRIX[role]);
      for (const action of actions) {
        expect(
          validActions.has(action),
          `role "${role}" allows unknown action "${action}"`,
        ).toBe(true);
      }
    }
  });

  it('every (role, action) cell is explicitly decided', () => {
    // "Explicitly decided" = the action either is or is not in the Set. Sets
    // do not have an undefined state, so the check is really: every role's Set
    // has been constructed (not undefined) AND we have considered every
    // action. We cover both above; this test additionally asserts the matrix
    // is exhaustively keyed by enumerating role × action.
    const decisions: Array<{ role: UserRole; action: Action; allowed: boolean }> = [];

    for (const role of ALL_ROLES) {
      for (const action of ALL_ACTIONS) {
        decisions.push({ role, action, allowed: AUTHZ_MATRIX[role].has(action) });
      }
    }

    expect(decisions).toHaveLength(ALL_ROLES.length * ALL_ACTIONS.length);
  });
});

describe('AUTHZ_MATRIX sensible defaults', () => {
  it('System Admin can perform every action', () => {
    for (const action of ALL_ACTIONS) {
      expect(
        AUTHZ_MATRIX['System Admin'].has(action),
        `System Admin should be able to "${action}"`,
      ).toBe(true);
    }
  });

  it('every role can view a project they belong to', () => {
    for (const role of ALL_ROLES) {
      expect(AUTHZ_MATRIX[role].has('view'), `role "${role}" cannot view`).toBe(true);
    }
  });

  it('only System Admin can delete a project', () => {
    for (const role of ALL_ROLES) {
      const expected = role === 'System Admin';
      expect(AUTHZ_MATRIX[role].has('delete_project')).toBe(expected);
    }
  });

  it('Executive is view-only (no write actions)', () => {
    const executiveActions = AUTHZ_MATRIX.Executive;

    expect(executiveActions.size).toBe(1);
    expect(executiveActions.has('view')).toBe(true);
  });

  it('Project Manager can do everything except delete_project', () => {
    const pmActions = AUTHZ_MATRIX['Project Manager'];

    for (const action of ALL_ACTIONS) {
      if (action === 'delete_project') {
        expect(pmActions.has(action), 'PM should NOT delete_project').toBe(false);
      } else {
        expect(pmActions.has(action), `PM should be able to "${action}"`).toBe(true);
      }
    }
  });

  it('Engineer can edit execution artifacts but cannot approve milestones or daily reports', () => {
    const engineer = AUTHZ_MATRIX.Engineer;

    expect(engineer.has('edit_schedule')).toBe(true);
    expect(engineer.has('edit_wbs')).toBe(true);
    expect(engineer.has('edit_boq')).toBe(true);
    expect(engineer.has('edit_quality_inspection')).toBe(true);
    expect(engineer.has('submit_daily_report')).toBe(true);

    expect(engineer.has('approve_milestone')).toBe(false);
    expect(engineer.has('approve_daily_report')).toBe(false);
    expect(engineer.has('approve_change_request')).toBe(false);
    expect(engineer.has('delete_project')).toBe(false);
  });

  it('Coordinator can approve daily reports and milestones', () => {
    const coordinator = AUTHZ_MATRIX.Coordinator;

    expect(coordinator.has('approve_daily_report')).toBe(true);
    expect(coordinator.has('approve_milestone')).toBe(true);
    expect(coordinator.has('submit_change_request')).toBe(true);
  });

  it('Team Member is restricted to view, own daily reports, and issues', () => {
    const teamMember = AUTHZ_MATRIX['Team Member'];

    expect(teamMember.has('view')).toBe(true);
    expect(teamMember.has('submit_daily_report')).toBe(true);
    expect(teamMember.has('edit_issue')).toBe(true);

    expect(teamMember.has('edit_schedule')).toBe(false);
    expect(teamMember.has('edit_budget')).toBe(false);
    expect(teamMember.has('approve_daily_report')).toBe(false);
    expect(teamMember.has('manage_team')).toBe(false);
  });

  it('Consultant is scoped to quality and documents', () => {
    const consultant = AUTHZ_MATRIX.Consultant;

    expect(consultant.has('view')).toBe(true);
    expect(consultant.has('edit_quality_inspection')).toBe(true);
    expect(consultant.has('upload_document')).toBe(true);
    expect(consultant.has('approve_document')).toBe(true);

    expect(consultant.has('edit_schedule')).toBe(false);
    expect(consultant.has('edit_budget')).toBe(false);
    expect(consultant.has('edit_wbs')).toBe(false);
    expect(consultant.has('approve_daily_report')).toBe(false);
  });
});
