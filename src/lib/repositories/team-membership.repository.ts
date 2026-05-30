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
