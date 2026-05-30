/**
 * Auth / visibility helpers. PR-21b made the DB-touching ones async
 * because the data source (project + user + membership repositories) is
 * async. Pure helpers (menu access, role mapping) live in
 * `project-access-pure.ts` so client components can import them without
 * pulling the Postgres client into the browser bundle.
 */
import { canAccessAdmin, canAccessExecutive } from '@/lib/auth';
import { getRepositories } from '@/lib/repositories';
import type { User } from '@/types/admin';
import type { Notification } from '@/types/notification';
import type { Project } from '@/types/project';

export type { ProjectAssignmentRole } from '@/lib/repositories/team-membership.repository';

// Re-export pure helpers so existing imports of `project-access` keep
// working server-side.
export {
  type AppMenuKey,
  canAccessMenuItem,
  getAssignmentRoleForUserRole,
  getRoleMenuLabels,
  isProjectScopedMenuItem,
} from './project-access-pure';

export async function getActiveUser(userId: string | null | undefined): Promise<User | null> {
  if (!userId) return null;

  const user = await getRepositories().users.findById(userId);
  if (!user || user.status !== 'active') return null;
  return user;
}

export async function getVisibleProjectsForUser(
  user: User | null,
  projects?: Project[],
): Promise<Project[]> {
  if (!user) return [];

  const projectList = projects ?? (await getRepositories().projects.list());
  const assignedProjectIds = await getAssignedProjectIdsForUser(user, projectList);

  if (canAccessAdmin(user.role) || canAccessExecutive(user.role)) {
    return [...projectList];
  }

  return projectList.filter((project) => assignedProjectIds.has(project.id));
}

export async function getAssignedProjectCountForUser(
  user: User | null,
  projects?: Project[],
): Promise<number> {
  if (!user) return 0;

  const projectList = projects ?? (await getRepositories().projects.list());
  return (await getAssignedProjectIdsForUser(user, projectList)).size;
}

async function getAssignedProjectIdsForUser(
  user: User,
  projects: Project[],
): Promise<Set<string>> {
  const memberships = await getRepositories().teamMemberships.list();
  const assignedProjectIds = new Set(
    memberships
      .filter((membership) => membership.userId === user.id)
      .map((membership) => membership.projectId),
  );

  projects.forEach((project) => {
    if (project.managerId === user.id || project.managerName === user.name) {
      assignedProjectIds.add(project.id);
    }
  });

  return assignedProjectIds;
}

export async function canUserAccessProject(
  user: User | null,
  projectId: string,
  projects?: Project[],
): Promise<boolean> {
  const visible = await getVisibleProjectsForUser(user, projects);
  return visible.some((project) => project.id === projectId);
}

export async function filterNotificationsForUser(
  user: User | null,
  notifications: Notification[],
  projects?: Project[],
): Promise<Notification[]> {
  if (!user) return [];

  if (canAccessAdmin(user.role) || canAccessExecutive(user.role)) {
    return [...notifications];
  }

  const visibleProjects = await getVisibleProjectsForUser(user, projects);
  const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));

  return notifications.filter(
    (notification) =>
      notification.projectId === null ||
      visibleProjectIds.has(notification.projectId),
  );
}
