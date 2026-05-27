import { getAssignedProjectCountForUser } from '@/lib/project-access';
import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import { getProjectStore } from '@/lib/project-store';
import { recordAuditEvent } from '@/lib/audit-helpers';
import { addUser, getUserStore, updateUser } from '@/lib/user-store';
import { parseRequestBody } from '@/lib/validation';
import type { User } from '@/types/admin';
import {
  createUserRequestSchema,
  updateUserRequestSchema,
} from '@/types/admin.schema';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();

  const { searchParams } = new URL(request.url);
  const department = searchParams.get('department');

  const projects = getProjectStore();
  let filtered = [...getUserStore()].map((user) => ({
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
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createUserRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const nextUser: User = {
    ...body,
    id: `user-${crypto.randomUUID()}`,
    projectCount: 0,
  };

  addUser(nextUser);
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
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateUserRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const beforeUser = getUserStore().find((entry) => entry.id === body.id);
  const updatedUser = updateUser(body.id, body.updates);

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
