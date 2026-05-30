import { getAssignedProjectCountForUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
import { recordAuditEvent } from '@/lib/audit-helpers';
import { parseRequestBody } from '@/lib/validation';
import type { User } from '@/types/admin';
import {
  createUserRequestSchema,
  updateUserRequestSchema,
} from '@/types/admin.schema';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const { searchParams } = new URL(request.url);
  const department = searchParams.get('department');

  const repos = getRepositories();
  const projects = await repos.projects.list();
  let filtered = [...(await repos.users.list())].map((user) => ({
    ...user,
    projectCount: getAssignedProjectCountForUser(user, projects),
  }));

  if (department) {
    filtered = filtered.filter((u) => u.departmentId === department);
  }

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createUserRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const nextUser: User = {
    ...body,
    id: `user-${crypto.randomUUID()}`,
    projectCount: 0,
  };

  await getRepositories().users.create(nextUser);
  await recordAuditEvent(request, {
    action: 'edit_user',
    resourceType: 'user',
    resourceId: nextUser.id,
    projectId: null,
    before: null,
    after: nextUser,
    decisionReason: `create user ${nextUser.name}`,
    authorityBasis: 'ADMIN:edit_user',
  });

  return Response.json({ status: 'success', data: nextUser }, { status: 201 });
}

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateUserRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const repos = getRepositories();
  const beforeUser = await repos.users.findById(body.id);
  const updatedUser = await repos.users.update(body.id, body.updates);

  if (!updatedUser) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_user',
    resourceType: 'user',
    resourceId: updatedUser.id,
    projectId: null,
    before: beforeUser ?? null,
    after: updatedUser,
    decisionReason: body.updates.status
      ? `status → ${body.updates.status}`
      : 'update user fields',
    authorityBasis: 'ADMIN:edit_user',
  });

  return Response.json({ status: 'success', data: updatedUser });
}
