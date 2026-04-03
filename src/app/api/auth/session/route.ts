import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { getUserStore } from '@/lib/user-store';

export async function GET() {
  const cookieStore = cookies();
  const userId = cookieStore.get(AUTH_COOKIE_USER_ID)?.value;

  if (!userId) {
    return Response.json({ status: 'success', data: { user: null } });
  }

  const currentUser =
    getUserStore().find((user) => user.id === userId && user.status === 'active') ?? null;

  return Response.json({
    status: 'success',
    data: { user: currentUser },
  });
}
