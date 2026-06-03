import { describe, expect, it } from 'vitest';

import { canAccessMenuItem, isProjectScopedMenuItem } from './project-access-pure';

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
