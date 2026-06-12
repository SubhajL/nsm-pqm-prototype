/**
 * Pure (client-safe) helpers extracted from `project-access.ts`. These do
 * not touch the repository registry / Postgres client, so they're safe to
 * import from React client components.
 */
import type {
  ProjectAssignmentRole,
} from '@/lib/repositories/team-membership.repository';
import type { UserRole } from '@/types/admin';

export type AppMenuKey =
  | 'dashboard'
  | 'projects'
  | 'team'
  | 'wbs'
  | 'gantt'
  | 'daily-report'
  | 's-curve'
  | 'work-periods'
  | 'procurement'
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
  'work-periods': 'งวดงาน (Work Periods)',
  procurement: 'จัดซื้อจัดจ้าง (Procurement)',
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
  'work-periods',
  'procurement',
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
    'work-periods',
    'procurement',
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
    'work-periods',
    'procurement',
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
    'work-periods',
    'procurement',
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
