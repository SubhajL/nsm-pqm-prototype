import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID, canCreateProject as canCreateProjectForRole } from '@/lib/auth';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { syncProjectExecutionState } from '@/lib/project-execution-sync';
import { canUserAccessProject, getActiveUser } from '@/lib/project-access';
import { getProjectStore } from '@/lib/project-store';
import type { ProjectStatus } from '@/types/project';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store = getProjectStore();
  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  if (!canUserAccessProject(currentUser, params.id, store)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: `Project ${params.id} is not accessible` },
      },
      { status: 403 },
    );
  }

  const project = store.find((p) => p.id === params.id);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  syncProjectExecutionState(params.id);

  return Response.json({ status: 'success', data: project });
}

const MANUAL_PROJECT_STATUSES: ProjectStatus[] = [
  'draft',
  'on_hold',
  'cancelled',
];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store = getProjectStore();
  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  if (!canUserAccessProject(currentUser, params.id, store)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: `Project ${params.id} is not accessible` },
      },
      { status: 403 },
    );
  }

  if (!currentUser || !canCreateProjectForRole(currentUser.role)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: 'Only project managers or system admins can update project status' },
      },
      { status: 403 },
    );
  }

  const project = store.find((candidate) => candidate.id === params.id);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const body = (await request.json()) as { status?: ProjectStatus };

  if (!body.status || !MANUAL_PROJECT_STATUSES.includes(body.status)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message:
            'Only draft, on hold, or cancelled can be set manually. Planning, in progress, and completed are derived automatically from Gantt execution.',
        },
      },
      { status: 400 },
    );
  }

  project.status = body.status;
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: project });
}
