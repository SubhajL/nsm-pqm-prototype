import type { UserRole } from '@/types/admin';

export const AUTH_COOKIE_USER_ID = 'pqm_user_id';
export const AUTH_COOKIE_ROLE = 'pqm_user_role';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 8;

export const ADMIN_ROLES: UserRole[] = ['System Admin'];
export const EXECUTIVE_ROLES: UserRole[] = ['System Admin', 'Executive'];

export function canAccessAdmin(role: string | null | undefined): role is UserRole {
  return Boolean(role && ADMIN_ROLES.includes(role as UserRole));
}

export function canAccessExecutive(role: string | null | undefined): role is UserRole {
  return Boolean(role && EXECUTIVE_ROLES.includes(role as UserRole));
}

export function requiresProjectDuty(role: string | null | undefined): role is UserRole {
  return Boolean(role && !canAccessAdmin(role) && !canAccessExecutive(role));
}

export function canCreateProject(role: string | null | undefined): role is UserRole {
  return Boolean(role && (canAccessAdmin(role) || role === 'Project Manager'));
}

export function canManageGantt(role: string | null | undefined): role is UserRole {
  return Boolean(
    role && (canAccessAdmin(role) || role === 'Project Manager' || role === 'Coordinator'),
  );
}

export function canReviewDailyReport(role: string | null | undefined): role is UserRole {
  return Boolean(
    role && (canAccessAdmin(role) || role === 'Project Manager' || role === 'Coordinator'),
  );
}

export function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/executive')
  );
}

export function getDefaultRouteForRole(role: string | null | undefined) {
  if (canAccessAdmin(role) || canAccessExecutive(role)) {
    return '/dashboard';
  }

  return '/dashboard';
}
