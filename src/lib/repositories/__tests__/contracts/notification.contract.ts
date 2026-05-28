import { describe, expect, it, beforeEach } from 'vitest';
import type { Notification } from '@/types/notification';
import type { NotificationRepository } from '../../notification.repository';

export function runNotificationRepositoryContract(
  makeRepo: () => Promise<NotificationRepository> | NotificationRepository,
) {
  describe('NotificationRepository contract', () => {
    let repo: NotificationRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleNotification(id: string): Notification {
      return {
        id,
        type: 'approval',
        title: `Title ${id}`,
        message: 'msg',
        projectId: 'proj-x',
        isRead: false,
        timestamp: new Date().toISOString(),
        actionUrl: '/',
        severity: 'info',
      };
    }

    it('push then markRead flips the read flag', async () => {
      const n = sampleNotification('notif-c-1');
      await repo.push(n);
      const before = (await repo.list()).find((entry) => entry.id === n.id);
      expect(before?.isRead).toBe(false);
      const updated = await repo.markRead(n.id);
      expect(updated?.isRead).toBe(true);
    });

    it('markRead returns null for unknown ids', async () => {
      expect(await repo.markRead('does-not-exist')).toBeNull();
    });
  });
}
