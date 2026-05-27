import { getAssignedProjectCountForUser } from '@/lib/project-access';
import {
  ensureProjectDemoStateHydrated,
  persistProjectDemoState,
} from '@/lib/project-demo-state';
import { getProjectStore } from '@/lib/project-store';
import { appendAuditLog } from '@/lib/audit-log-store';
import { getCurrentApiUser } from '@/lib/project-api-access';
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
  appendAuditLog(getCurrentApiUser(), 'Admin', `เพิ่มผู้ใช้งาน ${nextUser.name}`);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: nextUser }, { status: 201 });
}

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateUserRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const updatedUser = updateUser(body.id, body.updates);

  if (!updatedUser) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    );
  }

  appendAuditLog(
    getCurrentApiUser(),
    'Admin',
    body.updates.status
      ? `${body.updates.status === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} ${updatedUser.name}`
      : `แก้ไขข้อมูลผู้ใช้งาน ${updatedUser.name}`,
  );
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: updatedUser });
}
