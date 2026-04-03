import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { canUserAccessProject, getActiveUser, getVisibleProjectsForUser } from '@/lib/project-access';
import { getProjectStore } from '@/lib/project-store';

function unauthorizedResponse() {
  return Response.json(
    {
      status: 'error',
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    },
    { status: 401 },
  );
}

function forbiddenResponse(projectId: string) {
  return Response.json(
    {
      status: 'error',
      error: { code: 'FORBIDDEN', message: `Project ${projectId} is not accessible` },
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
    return forbiddenResponse(projectId);
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
