import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { getNotificationStore } from '@/lib/notification-store';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { filterNotificationsForUser, getActiveUser } from '@/lib/project-access';
import type { Notification } from '@/types/notification';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  const { searchParams } = new URL(request.url);
  const isReadParam = searchParams.get('isRead');

  let filtered = filterNotificationsForUser(currentUser, getNotificationStore());

  if (isReadParam !== null) {
    const isRead = isReadParam === 'true';
    filtered = filtered.filter((n) => n.isRead === isRead);
  }

  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return Response.json({ status: 'success', data: filtered });
}

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();

  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids || !Array.isArray(ids)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'ids array is required' },
      },
      { status: 400 },
    );
  }

  const updated: Notification[] = [];

  for (const id of ids) {
    const notification = getNotificationStore().find((n) => n.id === id);
    if (notification) {
      notification.isRead = true;
      updated.push(notification);
    }
  }
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: updated });
}
