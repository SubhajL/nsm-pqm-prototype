import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_ROLE,
  AUTH_COOKIE_USER_ID,
  canAccessAdmin,
  canAccessExecutive,
  isProtectedPath,
} from '@/lib/auth';

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

function withRequestId(response: NextResponse, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Phase 1 — Edge middleware is now COOKIE-PRESENCE-ONLY for API routes.
 *
 * Background: this used to import a static seed copy of `users.json` to
 * resolve the cookie's userId → User and gate admin/executive paths.
 * That created a dual source of truth — admin-UI mutations (status:
 * suspended, role demoted) lived in Postgres but never reached the
 * middleware's in-process seed, so suspended users kept passing the
 * edge gate. The fix is to push role/status enforcement into the DB-
 * backed route handlers (`requireAdminUser` / `requireExecutiveUser`)
 * and reduce middleware to coarse cookie-presence + HTML role-hint
 * routing.
 *
 * HTML pages (`/admin/*`, `/executive/*`) still get a soft role-cookie
 * check here — the cookie can drift but it's a navigation hint, and
 * the page-level data fetches enforce real authz via the same DB-
 * backed helpers. API routes (`/api/*`) get cookie-presence only; the
 * handlers do the real check.
 */
export function middleware(request: NextRequest) {
  // Generate (or honor an upstream-supplied) request id once per request and
  // propagate it via the inbound headers — NextRequest.headers is mutable
  // inside middleware, so downstream API handlers can read it back even
  // though they don't see this code.
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  request.headers.set(REQUEST_ID_HEADER, requestId);

  const { pathname, search } = request.nextUrl;
  const hasUserCookie = Boolean(request.cookies.get(AUTH_COOKIE_USER_ID)?.value);
  // Role-hint cookie for HTML route routing only — NOT authoritative.
  const roleCookie = request.cookies.get(AUTH_COOKIE_ROLE)?.value ?? null;

  if (pathname.startsWith('/api/auth/')) {
    return withRequestId(
      NextResponse.next({ request: { headers: request.headers } }),
      requestId,
    );
  }

  if (pathname.startsWith('/api/')) {
    // API routes only require a cookie at the edge. Per-route handlers
    // perform the authoritative role/status check against Postgres via
    // `requireAdminUser` / `requireExecutiveUser` /
    // `requireProjectAccess` — the middleware no longer second-guesses
    // role/status here.
    if (!hasUserCookie) {
      return withRequestId(unauthorizedApiResponse(), requestId);
    }
    return withRequestId(
      NextResponse.next({ request: { headers: request.headers } }),
      requestId,
    );
  }

  if (pathname === '/login') {
    // Phase 1 — do NOT redirect to /dashboard just because a userId
    // cookie is present. A suspended / deleted / role-changed user
    // would be stuck in an infinite bounce: middleware redirects to
    // /dashboard, the dashboard layout redirects back to /login,
    // loop. Let everyone reach /login; the login page (server
    // component) decides whether to redirect them to /dashboard
    // based on a fresh DB lookup.
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

  if (!hasUserCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return withRequestId(NextResponse.redirect(loginUrl), requestId);
  }

  // HTML route role-hint gating. The cookie can drift from the canonical
  // DB role; if the cookie says "Executive" but the DB role was demoted
  // to "Team Member", the page renders briefly with stale data and the
  // page's data fetches reject the request. Acceptable for the demo.
  if (pathname.startsWith('/admin') && !canAccessAdmin(roleCookie)) {
    return withRequestId(
      NextResponse.redirect(new URL('/dashboard', request.url)),
      requestId,
    );
  }

  if (pathname.startsWith('/executive') && !canAccessExecutive(roleCookie)) {
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
