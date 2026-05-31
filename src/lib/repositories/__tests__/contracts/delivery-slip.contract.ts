import { beforeEach, describe, expect, it } from 'vitest';

import type { DeliverySlip } from '@/types/delivery-slip';

import type { DeliverySlipRepository } from '../../delivery-slip.repository';

export function runDeliverySlipRepositoryContract(
  makeRepo: () => Promise<DeliverySlipRepository> | DeliverySlipRepository,
) {
  describe('DeliverySlipRepository contract', () => {
    let repo: DeliverySlipRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, workPeriodId = 'wp-x'): DeliverySlip {
      return {
        id,
        workPeriodId,
        submittedAt: '2026-06-10T08:00:00.000Z',
        submittedBy: 'user-002',
        attachedDocIds: ['doc-001', 'doc-002'],
        notes: 'ส่งมอบงานงวดที่ 1',
      };
    }

    it('listByWorkPeriod filters by workPeriodId', async () => {
      await repo.create(sample('ds-c-1', 'wp-a'));
      await repo.create(sample('ds-c-2', 'wp-b'));
      const onlyA = await repo.listByWorkPeriod('wp-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].workPeriodId).toBe('wp-a');
    });

    it('CRUD round-trip preserves attachedDocIds array', async () => {
      const slip = sample('ds-c-3');
      await repo.create(slip);
      const fetched = await repo.findById(slip.id);
      expect(fetched?.attachedDocIds).toEqual(['doc-001', 'doc-002']);

      const patched = await repo.update(slip.id, {
        notes: 'แก้ไขหมายเหตุ',
      });
      expect(patched?.notes).toBe('แก้ไขหมายเหตุ');

      await repo.delete(slip.id);
      expect(await repo.findById(slip.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('ds-missing', { notes: 'x' });
      expect(result).toBeNull();
    });

    it('list returns every persisted slip', async () => {
      await repo.create(sample('ds-c-4', 'wp-a'));
      await repo.create(sample('ds-c-5', 'wp-b'));
      const all = await repo.list();
      expect(all.map((s) => s.id).sort()).toEqual(['ds-c-4', 'ds-c-5']);
    });
  });
}
