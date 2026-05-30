import { describe, expect, it } from 'vitest';

import { canPerformProjectAction } from '@/lib/project-api-access';
import type { User, UserRole } from '@/types/admin';

// ---------------------------------------------------------------------------
// canPerformProjectAction tests
//
// Uses real fixture data (src/data/projects.json + src/data/project-
// memberships.json) so the visibility composition is exercised end-to-end:
//
//   - user-002 (Project Manager) is a member of proj-001 and proj-004
//   - user-003 (Engineer) is a member of proj-001 and proj-002
//   - user-005 (Team Member, suspended) is NOT visible anywhere
//   - user-007 (Executive) sees every project via the role bypass in
//     getVisibleProjectsForUser
//   - user-009 (Consultant) is a member of proj-001 only
//
// We assert behavior against these stable IDs; the seed data is part of the
// contract for the project-access library.
//
// PR-21b: helpers are async — they now hit the Database registry, which is
// seeded from the same JSON fixtures so identity / role / visibility logic
// is unchanged behaviourally.
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<User>): User {
  return {
    id: 'user-test',
    name: 'Test User',
    position: 'tester',
    role: 'Engineer',
    department: 'qa',
    departmentId: 'dept-qa',
    status: 'active',
    projectCount: 0,
    email: 'test@example.com',
    phone: '0',
    ...overrides,
  };
}

const VISIBLE_PROJECT_ID = 'proj-001';
const NOT_A_MEMBER_PROJECT_ID = 'proj-005'; // user-002 / user-003 are NOT in proj-005
const PROJECT_MANAGER: User = makeUser({
  id: 'user-002',
  role: 'Project Manager' as UserRole,
});
const ENGINEER: User = makeUser({
  id: 'user-003',
  role: 'Engineer' as UserRole,
});
const TEAM_MEMBER: User = makeUser({
  id: 'user-010',
  role: 'Team Member' as UserRole,
});
const EXECUTIVE: User = makeUser({
  id: 'user-007',
  role: 'Executive' as UserRole,
});
const NON_MEMBER_ENGINEER: User = makeUser({
  id: 'user-999',
  role: 'Engineer' as UserRole,
});

describe('canPerformProjectAction — denial paths', () => {
  it('returns false for null user', async () => {
    expect(await canPerformProjectAction(null, VISIBLE_PROJECT_ID, 'view')).toBe(false);
    expect(await canPerformProjectAction(null, VISIBLE_PROJECT_ID, 'edit_schedule')).toBe(false);
  });

  it('returns false when user is not a member of the project (visibility fails)', async () => {
    // user-002 is a manager of proj-001/proj-004 — NOT proj-005.
    // Even though the role has the action, visibility must succeed first.
    expect(
      await canPerformProjectAction(PROJECT_MANAGER, NOT_A_MEMBER_PROJECT_ID, 'edit_schedule'),
    ).toBe(false);
  });

  it('returns false for unknown user id (not in store)', async () => {
    expect(await canPerformProjectAction(NON_MEMBER_ENGINEER, VISIBLE_PROJECT_ID, 'view')).toBe(false);
  });
});

describe('canPerformProjectAction — allow paths', () => {
  it('allows a Project Manager to edit_schedule on their own project', async () => {
    expect(await canPerformProjectAction(PROJECT_MANAGER, VISIBLE_PROJECT_ID, 'edit_schedule')).toBe(
      true,
    );
  });

  it('allows an Engineer member to edit_wbs and submit_daily_report', async () => {
    expect(await canPerformProjectAction(ENGINEER, VISIBLE_PROJECT_ID, 'edit_wbs')).toBe(true);
    expect(await canPerformProjectAction(ENGINEER, VISIBLE_PROJECT_ID, 'submit_daily_report')).toBe(true);
  });

  it('allows an Executive to view every project (visibility bypass + matrix view)', async () => {
    expect(await canPerformProjectAction(EXECUTIVE, VISIBLE_PROJECT_ID, 'view')).toBe(true);
    expect(await canPerformProjectAction(EXECUTIVE, NOT_A_MEMBER_PROJECT_ID, 'view')).toBe(true);
  });
});

describe('canPerformProjectAction — role × action denials inside visibility', () => {
  it('denies Engineer approve_daily_report even on a project they belong to', async () => {
    expect(await canPerformProjectAction(ENGINEER, VISIBLE_PROJECT_ID, 'approve_daily_report')).toBe(
      false,
    );
  });

  it('denies Team Member edit_schedule on their own project', async () => {
    expect(await canPerformProjectAction(TEAM_MEMBER, 'proj-005', 'edit_schedule')).toBe(false);
  });

  it('denies Executive any write action even with visibility', async () => {
    expect(await canPerformProjectAction(EXECUTIVE, VISIBLE_PROJECT_ID, 'edit_basic')).toBe(false);
    expect(await canPerformProjectAction(EXECUTIVE, VISIBLE_PROJECT_ID, 'approve_change_request')).toBe(
      false,
    );
    expect(await canPerformProjectAction(EXECUTIVE, VISIBLE_PROJECT_ID, 'delete_project')).toBe(false);
  });

  it('denies Project Manager delete_project everywhere (reserved for System Admin)', async () => {
    expect(await canPerformProjectAction(PROJECT_MANAGER, VISIBLE_PROJECT_ID, 'delete_project')).toBe(
      false,
    );
  });
});
