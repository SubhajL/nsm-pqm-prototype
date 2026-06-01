import { cookies } from 'next/headers';
import {
  AUTH_COOKIE_USER_ID,
  canAccessAdmin,
  canAccessExecutive,
} from '@/lib/auth';
import { AUTHZ_MATRIX, type Action } from '@/lib/authz-matrix';
import { canUserAccessProject, getActiveUser, getVisibleProjectsForUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
import type { User } from '@/types/admin';

function unauthorizedResponse() {
  return Response.json(
    {
      status: 'error',
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    },
    { status: 401 },
  );
}

function projectForbiddenResponse(projectId: string) {
  return Response.json(
    {
      status: 'error',
      error: { code: 'FORBIDDEN', message: `Project ${projectId} is not accessible` },
    },
    { status: 403 },
  );
}

/**
 * Standard 403 envelope for action-level authorization failures.
 *
 * Mirrors the middleware.ts FORBIDDEN shape so clients can rely on a single
 * error contract regardless of which ring rejected the request.
 */
export function forbiddenResponse(action: Action) {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'FORBIDDEN',
        message: `Action "${action}" is not permitted for the current user`,
      },
    },
    { status: 403 },
  );
}

export async function getCurrentApiUser(): Promise<User | null> {
  return getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);
}

function accountInactiveResponse() {
  return Response.json(
    {
      status: 'error',
      error: {
        code: 'ACCOUNT_INACTIVE',
        message: 'User account is not active',
      },
    },
    { status: 403 },
  );
}

function roleForbiddenResponse(reason: string) {
  return Response.json(
    {
      status: 'error',
      error: { code: 'FORBIDDEN', message: reason },
    },
    { status: 403 },
  );
}

/**
 * Phase 1 — DB-backed gate for admin-only API routes.
 *
 * Returns `null` if the caller is an active System Admin, otherwise a
 * 401/403 Response that the route handler should pass back directly.
 *
 * Closes the dual-source bug from before Phase 1: `middleware.ts` used
 * to gate these routes against a static seed of `users.json`, which
 * never reflected admin-UI mutations (status: suspended, role demoted).
 * The middleware now only enforces cookie presence; this helper is the
 * authoritative role/status check.
 *
 * Use at the TOP of every admin-only handler:
 *   const guard = await requireAdminUser();
 *   if (guard) return guard;
 */
/**
 * Look up the cookie-bound user WITHOUT the `status === 'active'` filter
 * that `getActiveUser` applies. The admin guards need this so they can
 * tell "no cookie / unknown user" (401) apart from "cookie points at a
 * suspended account" (403 ACCOUNT_INACTIVE). Both block the request, but
 * the differentiated response makes audit-log triage faster.
 */
async function getRawCookieUser(): Promise<User | null> {
  const userId = cookies().get(AUTH_COOKIE_USER_ID)?.value;
  if (!userId) return null;
  return getRepositories().users.findById(userId);
}

export async function requireAdminUser(): Promise<Response | null> {
  const user = await getRawCookieUser();
  if (!user) return unauthorizedResponse();
  if (user.status !== 'active') return accountInactiveResponse();
  if (!canAccessAdmin(user.role)) {
    return roleForbiddenResponse(
      'Admin-only endpoint; current role is not permitted',
    );
  }
  return null;
}

/**
 * Phase 1 — DB-backed gate for executive-or-admin API routes. Same
 * semantics as `requireAdminUser` but accepts both `System Admin` and
 * `Executive` roles per `canAccessExecutive`. Closes the same dual-
 * source bug for `/api/evaluation/*`.
 */
export async function requireExecutiveUser(): Promise<Response | null> {
  const user = await getRawCookieUser();
  if (!user) return unauthorizedResponse();
  if (user.status !== 'active') return accountInactiveResponse();
  if (!canAccessExecutive(user.role)) {
    return roleForbiddenResponse(
      'Executive-only endpoint; current role is not permitted',
    );
  }
  return null;
}

/**
 * Phase 1 — Server-Component-friendly check for the cookie-bound user.
 *
 * Layouts and pages cannot return a `Response` object the way API
 * handlers can; they need to decide between rendering and redirecting.
 * This helper returns the raw record so the layout can branch on
 * `null` (no cookie / unknown user), `user.status !== 'active'`, or
 * the role check, then call `redirect()` from `next/navigation` as
 * appropriate.
 *
 * Server-side-only — calling from a client component will fail because
 * `cookies()` only works in server contexts.
 */
export async function getCookieBoundUserForServerComponent(): Promise<User | null> {
  return getRawCookieUser();
}

export async function requireProjectAccess(projectId: string): Promise<Response | null> {
  const currentUser = await getCurrentApiUser();

  if (!currentUser) {
    return unauthorizedResponse();
  }

  const store = await getRepositories().projects.list();

  if (!(await canUserAccessProject(currentUser, projectId, store))) {
    return projectForbiddenResponse(projectId);
  }

  return null;
}

export async function getVisibleProjectIdsForCurrentUser(): Promise<Set<string>> {
  const currentUser = await getCurrentApiUser();

  if (!currentUser) {
    return new Set<string>();
  }

  const projects = await getRepositories().projects.list();
  const visible = await getVisibleProjectsForUser(currentUser, projects);
  return new Set(visible.map((project) => project.id));
}

/**
 * Authorization policy layer: can `user` perform `action` on `projectId`?
 *
 * Composes the existing visibility check (`canUserAccessProject`) with the
 * role × action capability matrix (`AUTHZ_MATRIX`). Returns `false` for any
 * of:
 *   - null user (not authenticated)
 *   - user has no visibility into the project
 *   - user's role lacks the action in the matrix
 *
 * Per MVP plan PR-03: every mutating route must gate on this in addition to
 * the existing visibility check. Middleware path-level RBAC remains the outer
 * ring; this is the action-level inner ring.
 */
export async function canPerformProjectAction(
  user: User | null,
  projectId: string,
  action: Action,
): Promise<boolean> {
  if (!user) {
    return false;
  }

  if (!(await canUserAccessProject(user, projectId))) {
    return false;
  }

  return AUTHZ_MATRIX[user.role].has(action);
}
