import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_ROLE,
  AUTH_COOKIE_USER_ID,
  requiresProjectDuty,
} from '@/lib/auth';
import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import { getAssignedProjectCountForUser } from '@/lib/project-access';
import { getProjectStore } from '@/lib/project-store';
import { getUserStore } from '@/lib/user-store';

export async function POST(request: Request) {
  await ensureProjectDemoStateHydrated();
  const body = (await request.json()) as { userId?: string };
  const store = getUserStore();
  const selectedUser = store.find((user) => user.id === body.userId && user.status === 'active');

  if (!selectedUser) {
    return NextResponse.json(
      { status: 'error', error: { code: 'INVALID_USER', message: 'Invalid login user' } },
      { status: 400 },
    );
  }

  const assignedProjectCount = getAssignedProjectCountForUser(
    selectedUser,
    getProjectStore(),
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

  response.cookies.set(AUTH_COOKIE_USER_ID, selectedUser.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
  response.cookies.set(AUTH_COOKIE_ROLE, selectedUser.role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });

  return response;
}
