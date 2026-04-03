import { NextResponse } from 'next/server';
import { AUTH_COOKIE_ROLE, AUTH_COOKIE_USER_ID } from '@/lib/auth';

export async function POST() {
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

  return response;
}
