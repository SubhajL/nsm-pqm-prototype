export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { unsealAuthCookieValue } from '@/lib/auth-cookie';
import { getRepositories } from '@/lib/repositories';

export async function GET() {
  const cookieStore = cookies();
  const userId = await unsealAuthCookieValue(
    AUTH_COOKIE_USER_ID,
    cookieStore.get(AUTH_COOKIE_USER_ID)?.value,
  );

  if (!userId) {
    return Response.json({ status: 'success', data: { user: null } });
  }

  const currentUser =
    (await getRepositories().users.list()).find(
      (user) => user.id === userId && user.status === 'active',
    ) ?? null;

  return Response.json({
    status: 'success',
    data: { user: currentUser },
  });
}
