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

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const userId = request.cookies.get(AUTH_COOKIE_USER_ID)?.value;
  const userStore: User[] = getUserStore();
  const currentUser =
    userStore.find((user) => user.id === userId && user.status === 'active') ?? null;
  const role = currentUser?.role ?? null;

  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (!currentUser) {
      return unauthorizedApiResponse();
    }

    if (
      (pathname === '/api/users' ||
        pathname === '/api/org-structure' ||
        pathname === '/api/audit-logs') &&
      !canAccessAdmin(role)
    ) {
      return forbiddenApiResponse();
    }

    if (pathname.startsWith('/api/evaluation/') && !canAccessExecutive(role)) {
      return forbiddenApiResponse();
    }

    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (currentUser) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!currentUser) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && !canAccessAdmin(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/executive') && !canAccessExecutive(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/projects/:path*', '/notifications/:path*', '/admin/:path*', '/executive/:path*', '/api/:path*'],
};
