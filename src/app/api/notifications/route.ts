import { cookies } from 'next/headers';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { getNotificationStore } from '@/lib/notification-store';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { filterNotificationsForUser, getActiveUser } from '@/lib/project-access';
import { parseRequestBody } from '@/lib/validation';
import type { Notification } from '@/types/notification';
import { markNotificationsReadRequestSchema } from '@/types/notification.schema';

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
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(markNotificationsReadRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { ids } = parsed.data;

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
