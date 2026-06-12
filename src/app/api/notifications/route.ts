export const dynamic = 'force-dynamic';

import { getCurrentApiUser } from '@/lib/project-api-access';
import { filterNotificationsForUser } from '@/lib/project-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { Notification } from '@/types/notification';
import { markNotificationsReadRequestSchema } from '@/types/notification.schema';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const currentUser = await getCurrentApiUser();

  const { searchParams } = new URL(request.url);
  const isReadParam = searchParams.get('isRead');

  let filtered = await filterNotificationsForUser(currentUser, await getRepositories().notifications.list());

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
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(markNotificationsReadRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { ids } = parsed.data;

  const updated: Notification[] = [];
  const repos = getRepositories();

  for (const id of ids) {
    const notification = await repos.notifications.markRead(id);
    if (notification) {
      updated.push(notification);
    }
  }
  return Response.json({ status: 'success', data: updated });
}
