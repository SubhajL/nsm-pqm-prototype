import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { unsealAuthCookieValue } from '@/lib/auth-cookie';

export default async function Home() {
  const cookieStore = cookies();
  const currentUserId = await unsealAuthCookieValue(
    AUTH_COOKIE_USER_ID,
    cookieStore.get(AUTH_COOKIE_USER_ID)?.value,
  );

  redirect(currentUserId ? '/dashboard' : '/login');
}
