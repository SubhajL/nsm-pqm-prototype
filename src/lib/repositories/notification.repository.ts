import type { Notification } from '@/types/notification';

/**
 * Notifications are insertion-ordered (newest first). Updates happen via
 * `markRead`; new entries via `push`.
 */
export interface NotificationRepository {
  list(): Promise<Notification[]>;
  push(notification: Notification): Promise<Notification>;
  markRead(id: string): Promise<Notification | null>;
}
