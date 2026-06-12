import { describe, expect, it } from 'vitest';

import {
  canAccessMenuItem,
  canEditProjectBasics,
  isProjectScopedMenuItem,
} from './project-access-pure';

describe('work-periods menu access (PR work-periods)', () => {
  it('grants work-periods to the roles that can run the payment flow', () => {
    expect(canAccessMenuItem('System Admin', 'work-periods')).toBe(true);
    expect(canAccessMenuItem('Project Manager', 'work-periods')).toBe(true);
    expect(canAccessMenuItem('Engineer', 'work-periods')).toBe(true);
  });

  it('withholds work-periods from roles outside the delivery/payment flow', () => {
    expect(canAccessMenuItem('Coordinator', 'work-periods')).toBe(false);
    expect(canAccessMenuItem('Team Member', 'work-periods')).toBe(false);
    expect(canAccessMenuItem('Executive', 'work-periods')).toBe(false);
    expect(canAccessMenuItem('Consultant', 'work-periods')).toBe(false);
  });

  it('returns false for work-periods when role is null', () => {
    expect(canAccessMenuItem(null, 'work-periods')).toBe(false);
  });

  it('marks work-periods as a project-scoped menu item', () => {
    expect(isProjectScopedMenuItem('work-periods')).toBe(true);
  });
});

describe('procurement menu access (PR procurement-ui)', () => {
  it('grants procurement to the roles that run solicitations', () => {
    expect(canAccessMenuItem('System Admin', 'procurement')).toBe(true);
    expect(canAccessMenuItem('Project Manager', 'procurement')).toBe(true);
    expect(canAccessMenuItem('Engineer', 'procurement')).toBe(true);
  });

  it('withholds procurement from roles outside the procurement flow', () => {
    expect(canAccessMenuItem('Coordinator', 'procurement')).toBe(false);
    expect(canAccessMenuItem('Team Member', 'procurement')).toBe(false);
    expect(canAccessMenuItem('Executive', 'procurement')).toBe(false);
    expect(canAccessMenuItem('Consultant', 'procurement')).toBe(false);
  });

  it('returns false for procurement when role is null', () => {
    expect(canAccessMenuItem(null, 'procurement')).toBe(false);
  });

  it('marks procurement as a project-scoped menu item', () => {
    expect(isProjectScopedMenuItem('procurement')).toBe(true);
  });
});

describe('handover menu access (PR handover-ui)', () => {
  it('grants handover to the roles that run SOP 8.1 handovers', () => {
    expect(canAccessMenuItem('System Admin', 'handover')).toBe(true);
    expect(canAccessMenuItem('Project Manager', 'handover')).toBe(true);
    expect(canAccessMenuItem('Engineer', 'handover')).toBe(true);
  });

  it('withholds handover from roles outside the handover flow', () => {
    expect(canAccessMenuItem('Coordinator', 'handover')).toBe(false);
    expect(canAccessMenuItem('Team Member', 'handover')).toBe(false);
    expect(canAccessMenuItem('Executive', 'handover')).toBe(false);
    expect(canAccessMenuItem('Consultant', 'handover')).toBe(false);
  });

  it('returns false for handover when role is null', () => {
    expect(canAccessMenuItem(null, 'handover')).toBe(false);
  });

  it('marks handover as a project-scoped menu item', () => {
    expect(isProjectScopedMenuItem('handover')).toBe(true);
  });
});

describe('permits menu access (PR permits-land-eia-ui)', () => {
  it('grants permits to the roles that maintain readiness registers', () => {
    expect(canAccessMenuItem('System Admin', 'permits')).toBe(true);
    expect(canAccessMenuItem('Project Manager', 'permits')).toBe(true);
    expect(canAccessMenuItem('Engineer', 'permits')).toBe(true);
  });

  it('withholds permits from roles outside the readiness flow', () => {
    expect(canAccessMenuItem('Coordinator', 'permits')).toBe(false);
    expect(canAccessMenuItem('Team Member', 'permits')).toBe(false);
    expect(canAccessMenuItem('Executive', 'permits')).toBe(false);
    expect(canAccessMenuItem('Consultant', 'permits')).toBe(false);
  });

  it('returns false for permits when role is null', () => {
    expect(canAccessMenuItem(null, 'permits')).toBe(false);
  });

  it('marks permits as a project-scoped menu item', () => {
    expect(isProjectScopedMenuItem('permits')).toBe(true);
  });
});

describe('canEditProjectBasics (PR-31 cleanup)', () => {
  it('grants edit-basics to the two managing roles', () => {
    expect(canEditProjectBasics('System Admin')).toBe(true);
    expect(canEditProjectBasics('Project Manager')).toBe(true);
  });

  it('withholds edit-basics from every read-only role', () => {
    expect(canEditProjectBasics('Engineer')).toBe(false);
    expect(canEditProjectBasics('Coordinator')).toBe(false);
    expect(canEditProjectBasics('Team Member')).toBe(false);
    expect(canEditProjectBasics('Executive')).toBe(false);
    expect(canEditProjectBasics('Consultant')).toBe(false);
  });

  it('returns false for null / undefined roles', () => {
    expect(canEditProjectBasics(null)).toBe(false);
    expect(canEditProjectBasics(undefined)).toBe(false);
  });
});
