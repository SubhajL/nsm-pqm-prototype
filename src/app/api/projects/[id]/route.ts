export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit-helpers';
import { canPerformProjectAction, forbiddenResponse } from '@/lib/project-api-access';
import { syncProjectExecutionState } from '@/lib/project-execution-sync';
import { canUserAccessProject, getActiveUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { updateProjectStatusRequestSchema } from '@/types/project.schema';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.projects.list();
  const currentUser = await getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  if (!(await canUserAccessProject(currentUser, params.id, store))) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'FORBIDDEN', message: `Project ${params.id} is not accessible` },
      },
      { status: 403 },
    );
  }

  await syncProjectExecutionState(params.id);
  // Re-read after sync so the response reflects the synced values.
  const project = (await repos.projects.list()).find((p) => p.id === params.id);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  return Response.json({ status: 'success', data: project });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateProjectStatusRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const currentUser = await getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  if (!(await canPerformProjectAction(currentUser, params.id, 'edit_basic'))) {
    return forbiddenResponse('edit_basic');
  }

  const project = await repos.projects.findById(params.id);

  if (!project) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: `Project ${params.id} not found` },
      },
      { status: 404 },
    );
  }

  const beforeSnapshot = { ...project };
  const updated = await repos.projects.update(params.id, {
    status: parsed.data.status,
  });
  await recordAuditEvent(request, {
    action: 'edit_basic',
    resourceType: 'project',
    resourceId: project.id,
    projectId: project.id,
    before: beforeSnapshot,
    after: updated ?? project,
    decisionReason: `status → ${parsed.data.status}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updated ?? project });
}
