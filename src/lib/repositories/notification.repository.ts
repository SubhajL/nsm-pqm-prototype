import {
  getNotificationStore,
  pushNotification,
} from '@/lib/notification-store';
import type { Notification } from '@/types/notification';

/**
 * Notifications are insertion-ordered (newest first, via `unshift`). Updates
 * happen by mutating entries in place — the API only sets `isRead`.
 */
export interface NotificationRepository {
  list(): Promise<Notification[]>;
  push(notification: Notification): Promise<Notification>;
  markRead(id: string): Promise<Notification | null>;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  async list(): Promise<Notification[]> {
    return getNotificationStore();
  }

  async push(notification: Notification): Promise<Notification> {
    pushNotification(notification);
    return notification;
  }

  async markRead(id: string): Promise<Notification | null> {
    const notification = getNotificationStore().find((entry) => entry.id === id);
    if (!notification) return null;
    notification.isRead = true;
    return notification;
  }
}
