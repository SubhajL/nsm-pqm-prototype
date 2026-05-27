import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { AUTHZ_MATRIX, type Action } from '@/lib/authz-matrix';
import { canUserAccessProject, getActiveUser, getVisibleProjectsForUser } from '@/lib/project-access';
import { getProjectStore } from '@/lib/project-store';
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

export function getCurrentApiUser() {
  return getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);
}

export function requireProjectAccess(projectId: string) {
  const currentUser = getCurrentApiUser();

  if (!currentUser) {
    return unauthorizedResponse();
  }

  const store = getProjectStore();

  if (!canUserAccessProject(currentUser, projectId, store)) {
    return projectForbiddenResponse(projectId);
  }

  return null;
}

export function getVisibleProjectIdsForCurrentUser() {
  const currentUser = getCurrentApiUser();

  if (!currentUser) {
    return new Set<string>();
  }

  return new Set(
    getVisibleProjectsForUser(currentUser, getProjectStore()).map((project) => project.id),
  );
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
export function canPerformProjectAction(
  user: User | null,
  projectId: string,
  action: Action,
): boolean {
  if (!user) {
    return false;
  }

  if (!canUserAccessProject(user, projectId)) {
    return false;
  }

  return AUTHZ_MATRIX[user.role].has(action);
}
