import { NextResponse } from 'next/server';
import { AUTH_COOKIE_ROLE, AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit-helpers';
import { getCurrentApiUser } from '@/lib/project-api-access';
export async function POST(request: Request) {
  // Capture the actor BEFORE clearing the cookie so the audit event
  // correctly attributes the logout.
  const actor = getCurrentApiUser();

  const response = NextResponse.json({
    status: 'success',
    data: { ok: true },
  });

  response.cookies.set(AUTH_COOKIE_USER_ID, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(AUTH_COOKIE_ROLE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  await recordAuditEvent(request, {
    action: 'logout',
    resourceType: 'session',
    resourceId: actor?.id ?? 'anonymous',
    projectId: null,
    before: actor ? { userId: actor.id, role: actor.role } : null,
    after: null,
    decisionReason: 'session ended',
    authorityBasis: 'AUTH:logout',
    actor,
  });

  return response;
}
