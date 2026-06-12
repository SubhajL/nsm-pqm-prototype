export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_ROLE,
  AUTH_COOKIE_USER_ID,
  requiresProjectDuty,
} from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit-helpers';
import { sealAuthCookieValue } from '@/lib/auth-cookie';
import { getAssignedProjectCountForUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { loginRequestSchema } from '@/types/admin.schema';

export async function POST(request: Request) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(loginRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const repos = getRepositories();
  const store = await repos.users.list();
  const selectedUser = store.find((user) => user.id === body.userId && user.status === 'active');

  if (!selectedUser) {
    return NextResponse.json(
      { status: 'error', error: { code: 'INVALID_USER', message: 'Invalid login user' } },
      { status: 400 },
    );
  }

  const assignedProjectCount = await getAssignedProjectCountForUser(
    selectedUser,
    await repos.projects.list(),
  );

  if (requiresProjectDuty(selectedUser.role) && assignedProjectCount === 0) {
    return NextResponse.json(
      {
        status: 'error',
        error: {
          code: 'NO_PROJECT_DUTIES',
          message: 'ผู้ใช้นี้ไม่มีหน้าที่โครงการแล้ว จึงไม่สามารถเข้าสู่ระบบได้',
        },
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    status: 'success',
    data: { user: selectedUser },
  });

  response.cookies.set(AUTH_COOKIE_USER_ID, await sealAuthCookieValue(AUTH_COOKIE_USER_ID, selectedUser.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  response.cookies.set(AUTH_COOKIE_ROLE, await sealAuthCookieValue(AUTH_COOKIE_ROLE, selectedUser.role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });

  await recordAuditEvent(request, {
    action: 'login',
    resourceType: 'session',
    resourceId: selectedUser.id,
    projectId: null,
    before: null,
    after: { userId: selectedUser.id, role: selectedUser.role },
    decisionReason: 'mock single-click login',
    authorityBasis: 'AUTH:login',
    actor: selectedUser,
  });

  return response;
}
