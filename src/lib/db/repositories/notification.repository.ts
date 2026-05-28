import { desc, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { notifications } from '@/lib/db/schema';
import type { NotificationRepository } from '@/lib/repositories/notification.repository';
import type { Notification, NotificationSeverity, NotificationType } from '@/types/notification';

/**
 * The InMemory store `unshift`s newest entries to the front. We mimic that
 * by tagging each row with a monotonically-increasing `seq` and ordering
 * by `seq DESC` on read.
 */
export class DatabaseNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Notification[]> {
    const rows = await this.db.select().from(notifications).orderBy(desc(notifications.seq));
    return rows.map(rowToNotification);
  }

  async push(notification: Notification): Promise<Notification> {
    const nextSeq = await this.nextSeq();
    const [row] = await this.db
      .insert(notifications)
      .values({
        ...notificationToRow(notification),
        seq: nextSeq,
      })
      .returning();
    return rowToNotification(row);
  }

  async markRead(id: string): Promise<Notification | null> {
    const [row] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return row ? rowToNotification(row) : null;
  }

  private async nextSeq(): Promise<number> {
    const rows = await this.db
      .select({ seq: notifications.seq })
      .from(notifications)
      .orderBy(desc(notifications.seq))
      .limit(1);
    return (rows[0]?.seq ?? 0) + 1;
  }
}

type Row = typeof notifications.$inferSelect;

function rowToNotification(row: Row): Notification {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    projectId: row.projectId,
    isRead: row.isRead,
    timestamp: row.timestamp,
    actionUrl: row.actionUrl,
    severity: row.severity as NotificationSeverity,
  };
}

function notificationToRow(notification: Notification): Omit<typeof notifications.$inferInsert, 'seq'> {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    projectId: notification.projectId,
    isRead: notification.isRead,
    timestamp: notification.timestamp,
    actionUrl: notification.actionUrl,
    severity: notification.severity,
  };
}
