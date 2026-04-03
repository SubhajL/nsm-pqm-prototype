import { canAccessAdmin, canAccessExecutive } from '@/lib/auth';
import { getProjectMembershipStore, type ProjectAssignmentRole } from '@/lib/project-membership-store';
import { getProjectStore } from '@/lib/project-store';
import type { User, UserRole } from '@/types/admin';
import type { Notification } from '@/types/notification';
import type { Project } from '@/types/project';
import { getUserStore } from '@/lib/user-store';

export type AppMenuKey =
  | 'dashboard'
  | 'projects'
  | 'team'
  | 'wbs'
  | 'gantt'
  | 'daily-report'
  | 's-curve'
  | 'quality'
  | 'risk'
  | 'issues'
  | 'documents'
  | 'reports'
  | 'admin';

const MENU_LABELS: Record<AppMenuKey, string> = {
  dashboard: 'แดชบอร์ด',
  projects: 'โครงการ',
  team: 'ทีมโครงการ',
  wbs: 'WBS/BOQ',
  gantt: 'แผนงาน',
  'daily-report': 'รายงานประจำวัน',
  's-curve': 'งบประมาณ (EVM)',
  quality: 'คุณภาพ',
  risk: 'ความเสี่ยง',
  issues: 'ปัญหา',
  documents: 'เอกสาร',
  reports: 'รายงาน',
  admin: 'ผู้ดูแลระบบ',
};

const PROJECT_SCOPED_MENU_KEYS: AppMenuKey[] = [
  'team',
  'wbs',
  'gantt',
  'daily-report',
  's-curve',
  'quality',
  'risk',
  'issues',
  'documents',
];

const ROLE_MENU_ACCESS: Record<UserRole, AppMenuKey[]> = {
  'System Admin': [
    'dashboard',
    'projects',
    'team',
    'wbs',
    'gantt',
    'daily-report',
    's-curve',
    'quality',
    'risk',
    'issues',
    'documents',
    'reports',
    'admin',
  ],
  'Project Manager': [
    'dashboard',
    'projects',
    'team',
    'wbs',
    'gantt',
    'daily-report',
    's-curve',
    'quality',
    'risk',
    'issues',
    'documents',
  ],
  Engineer: [
    'dashboard',
    'projects',
    'team',
    'wbs',
    'gantt',
    'daily-report',
    'quality',
    'risk',
    'issues',
    'documents',
  ],
  Coordinator: [
    'dashboard',
    'projects',
    'team',
    'daily-report',
    'risk',
    'issues',
    'documents',
  ],
  'Team Member': ['dashboard', 'projects', 'team', 'daily-report', 'issues', 'documents'],
  Executive: ['dashboard', 'projects', 'reports'],
  Consultant: ['dashboard', 'projects', 'team', 'quality', 'documents'],
};

export function getActiveUser(userId: string | null | undefined) {
  if (!userId) {
    return null;
  }

  return getUserStore().find((user) => user.id === userId && user.status === 'active') ?? null;
}

export function getAssignmentRoleForUserRole(role: UserRole): ProjectAssignmentRole {
  if (role === 'Project Manager' || role === 'System Admin') {
    return 'manager';
  }

  if (role === 'Engineer') {
    return 'engineer';
  }

  if (role === 'Coordinator') {
    return 'coordinator';
  }

  if (role === 'Consultant') {
    return 'consultant';
  }

  return 'team_member';
}

export function getVisibleProjectsForUser(
  user: User | null,
  projects: Project[] = getProjectStore(),
) {
  if (!user) {
    return [];
  }

  const assignedProjectIds = getAssignedProjectIdsForUser(user, projects);

  if (canAccessAdmin(user.role) || canAccessExecutive(user.role)) {
    return [...projects];
  }

  return projects.filter((project) => assignedProjectIds.has(project.id));
}

export function getAssignedProjectCountForUser(
  user: User | null,
  projects: Project[] = getProjectStore(),
) {
  if (!user) {
    return 0;
  }

  return getAssignedProjectIdsForUser(user, projects).size;
}

function getAssignedProjectIdsForUser(
  user: User,
  projects: Project[],
) {
  const memberships = getProjectMembershipStore();
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

export function canUserAccessProject(
  user: User | null,
  projectId: string,
  projects: Project[] = getProjectStore(),
) {
  return getVisibleProjectsForUser(user, projects).some((project) => project.id === projectId);
}

export function filterNotificationsForUser(
  user: User | null,
  notifications: Notification[],
  projects: Project[] = getProjectStore(),
) {
  if (!user) {
    return [];
  }

  if (canAccessAdmin(user.role) || canAccessExecutive(user.role)) {
    return [...notifications];
  }

  const visibleProjectIds = new Set(
    getVisibleProjectsForUser(user, projects).map((project) => project.id),
  );

  return notifications.filter(
    (notification) =>
      notification.projectId === null ||
      visibleProjectIds.has(notification.projectId),
  );
}

export function canAccessMenuItem(role: UserRole | null, menuKey: AppMenuKey) {
  if (!role) {
    return false;
  }

  return ROLE_MENU_ACCESS[role].includes(menuKey);
}

export function isProjectScopedMenuItem(menuKey: AppMenuKey) {
  return PROJECT_SCOPED_MENU_KEYS.includes(menuKey);
}

export function getRoleMenuLabels(role: UserRole | null) {
  if (!role) {
    return [];
  }

  return ROLE_MENU_ACCESS[role].map((key) => MENU_LABELS[key]);
}
