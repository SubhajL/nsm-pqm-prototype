import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_USER_ID,
  canAccessAdmin,
  canAccessExecutive,
  isProtectedPath,
} from '@/lib/auth';
import { getUserStore } from '@/lib/user-store';
import type { User } from '@/types/admin';

/**
 * Header name used to propagate a per-request UUID end-to-end. Set on both
 * the inbound `NextRequest.headers` (so downstream API handlers can read it
 * via `getRequestId()` in `src/lib/audit-helpers.ts`) and the outbound
 * `NextResponse.headers` (so clients/logs can correlate). The value flows
 * into every `AuditEvent.requestId` emitted during the request.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

function unauthorizedApiResponse() {
  return NextResponse.json(
    {
      status: 'error',
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    },
    { status: 401 },
  );
}

function forbiddenApiResponse() {
  return NextResponse.json(
    {
      status: 'error',
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    },
    { status: 403 },
  );
}

function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export function middleware(request: NextRequest) {
  // Generate (or honor an upstream-supplied) request id once per request and
  // propagate it via the inbound headers — NextRequest.headers is mutable
  // inside middleware, so downstream API handlers can read it back even
  // though they don't see this code.
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  request.headers.set(REQUEST_ID_HEADER, requestId);

  const { pathname, search } = request.nextUrl;
  const userId = request.cookies.get(AUTH_COOKIE_USER_ID)?.value;
  const userStore: User[] = getUserStore();
  const currentUser =
    userStore.find((user) => user.id === userId && user.status === 'active') ?? null;
  const role = currentUser?.role ?? null;

  if (pathname.startsWith('/api/auth/')) {
    return withRequestId(
      NextResponse.next({ request: { headers: request.headers } }),
      requestId,
    );
  }

  if (pathname.startsWith('/api/')) {
    if (!currentUser) {
      return withRequestId(unauthorizedApiResponse(), requestId);
    }

    if (
      (pathname === '/api/users' ||
        pathname === '/api/org-structure' ||
        pathname.startsWith('/api/audit-logs')) &&
      !canAccessAdmin(role)
    ) {
      return withRequestId(forbiddenApiResponse(), requestId);
    }

    if (pathname.startsWith('/api/evaluation/') && !canAccessExecutive(role)) {
      return withRequestId(forbiddenApiResponse(), requestId);
    }

    return withRequestId(
      NextResponse.next({ request: { headers: request.headers } }),
      requestId,
    );
  }

  if (pathname === '/login') {
    if (currentUser) {
      return withRequestId(
        NextResponse.redirect(new URL('/dashboard', request.url)),
        requestId,
      );
    }

    return withRequestId(
      NextResponse.next({ request: { headers: request.headers } }),
      requestId,
    );
  }

  if (!isProtectedPath(pathname)) {
    return withRequestId(
      NextResponse.next({ request: { headers: request.headers } }),
      requestId,
    );
  }

  if (!currentUser) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return withRequestId(NextResponse.redirect(loginUrl), requestId);
  }

  if (pathname.startsWith('/admin') && !canAccessAdmin(role)) {
    return withRequestId(
      NextResponse.redirect(new URL('/dashboard', request.url)),
      requestId,
    );
  }

  if (pathname.startsWith('/executive') && !canAccessExecutive(role)) {
    return withRequestId(
      NextResponse.redirect(new URL('/dashboard', request.url)),
      requestId,
    );
  }

  return withRequestId(
    NextResponse.next({ request: { headers: request.headers } }),
    requestId,
  );
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/projects/:path*', '/notifications/:path*', '/admin/:path*', '/executive/:path*', '/api/:path*'],
};
