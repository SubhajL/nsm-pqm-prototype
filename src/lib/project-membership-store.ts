import seedMemberships from '@/data/project-memberships.json';

export type ProjectAssignmentRole =
  | 'manager'
  | 'engineer'
  | 'coordinator'
  | 'team_member'
  | 'consultant';

export interface ProjectMembership {
  projectId: string;
  userId: string;
  assignmentRole: ProjectAssignmentRole;
}

declare global {
  // eslint-disable-next-line no-var
  var __nsmProjectMembershipStore: ProjectMembership[] | undefined;
}

export function getProjectMembershipStore() {
  if (!globalThis.__nsmProjectMembershipStore) {
    globalThis.__nsmProjectMembershipStore = [
      ...(seedMemberships as ProjectMembership[]),
    ];
  }

  return globalThis.__nsmProjectMembershipStore;
}

export function hasProjectMembership(projectId: string, userId: string) {
  return getProjectMembershipStore().some(
    (membership) =>
      membership.projectId === projectId && membership.userId === userId,
  );
}

export function addProjectMembership(membership: ProjectMembership) {
  if (hasProjectMembership(membership.projectId, membership.userId)) {
    return false;
  }

  getProjectMembershipStore().push(membership);
  return true;
}

export function removeProjectMembership(projectId: string, userId: string) {
  const store = getProjectMembershipStore();
  const index = store.findIndex(
    (membership) =>
      membership.projectId === projectId && membership.userId === userId,
  );

  if (index === -1) {
    return false;
  }

  store.splice(index, 1);
  return true;
}
