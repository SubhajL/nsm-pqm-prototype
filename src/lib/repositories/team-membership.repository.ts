import {
  addProjectMembership,
  getProjectMembershipStore,
  hasProjectMembership,
  removeProjectMembership,
  type ProjectMembership,
} from '@/lib/project-membership-store';

/**
 * Team memberships are looked up by the composite `(projectId, userId)`
 * primary key rather than a single id, so the standard `Repository<T>`
 * surface doesn't quite fit. We expose targeted methods covering the
 * operations the `/api/team/[projectId]` route performs.
 */
export interface TeamMembershipRepository {
  list(): Promise<ProjectMembership[]>;
  listByProject(projectId: string): Promise<ProjectMembership[]>;
  has(projectId: string, userId: string): Promise<boolean>;
  find(projectId: string, userId: string): Promise<ProjectMembership | null>;
  add(membership: ProjectMembership): Promise<boolean>;
  remove(projectId: string, userId: string): Promise<boolean>;
}

export class InMemoryTeamMembershipRepository implements TeamMembershipRepository {
  async list(): Promise<ProjectMembership[]> {
    return getProjectMembershipStore();
  }

  async listByProject(projectId: string): Promise<ProjectMembership[]> {
    return getProjectMembershipStore().filter(
      (membership) => membership.projectId === projectId,
    );
  }

  async has(projectId: string, userId: string): Promise<boolean> {
    return hasProjectMembership(projectId, userId);
  }

  async find(
    projectId: string,
    userId: string,
  ): Promise<ProjectMembership | null> {
    return (
      getProjectMembershipStore().find(
        (membership) =>
          membership.projectId === projectId && membership.userId === userId,
      ) ?? null
    );
  }

  async add(membership: ProjectMembership): Promise<boolean> {
    return addProjectMembership(membership);
  }

  async remove(projectId: string, userId: string): Promise<boolean> {
    return removeProjectMembership(projectId, userId);
  }
}
