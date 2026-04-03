import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';

export default function Home() {
  const cookieStore = cookies();
  const currentUserId = cookieStore.get(AUTH_COOKIE_USER_ID)?.value;

  redirect(currentUserId ? '/dashboard' : '/login');
}
