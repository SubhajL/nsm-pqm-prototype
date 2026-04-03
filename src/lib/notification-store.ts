import notifications from '@/data/notifications.json';
import type { Notification } from '@/types/notification';

let store: Notification[] | null = null;

export function getNotificationStore(): Notification[] {
  if (!store) {
    store = [...notifications] as Notification[];
  }
  return store;
}

/** Push a new notification into the in-memory store */
export function pushNotification(notification: Notification) {
  getNotificationStore().unshift(notification);
}
