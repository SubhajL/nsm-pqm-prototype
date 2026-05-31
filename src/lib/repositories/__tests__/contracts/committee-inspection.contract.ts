import { beforeEach, describe, expect, it } from 'vitest';

import type { CommitteeInspection } from '@/types/committee-inspection';

import type { CommitteeInspectionRepository } from '../../committee-inspection.repository';

export function runCommitteeInspectionRepositoryContract(
  makeRepo: () =>
    | Promise<CommitteeInspectionRepository>
    | CommitteeInspectionRepository,
) {
  describe('CommitteeInspectionRepository contract', () => {
    let repo: CommitteeInspectionRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, workPeriodId = 'wp-x'): CommitteeInspection {
      return {
        id,
        workPeriodId,
        inspectedAt: '2026-06-15T09:00:00.000Z',
        inspectors: ['user-002', 'user-004', 'user-005'],
        result: 'pass',
        conditions: '',
        documentIds: ['doc-100'],
      };
    }

    it('listByWorkPeriod filters by workPeriodId', async () => {
      await repo.create(sample('ci-c-1', 'wp-a'));
      await repo.create(sample('ci-c-2', 'wp-b'));
      const onlyA = await repo.listByWorkPeriod('wp-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].workPeriodId).toBe('wp-a');
    });

    it('CRUD round-trip preserves inspectors and documentIds arrays', async () => {
      const insp = sample('ci-c-3');
      await repo.create(insp);
      const fetched = await repo.findById(insp.id);
      expect(fetched?.inspectors).toEqual(['user-002', 'user-004', 'user-005']);
      expect(fetched?.documentIds).toEqual(['doc-100']);

      const patched = await repo.update(insp.id, {
        result: 'fail',
        conditions: 'พบรอยรั่ว — ต้องแก้ไขก่อนเบิกเงิน',
      });
      expect(patched?.result).toBe('fail');
      expect(patched?.conditions).toContain('รอยรั่ว');

      await repo.delete(insp.id);
      expect(await repo.findById(insp.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('ci-missing', { result: 'pass' });
      expect(result).toBeNull();
    });

    it('list returns every persisted inspection', async () => {
      await repo.create(sample('ci-c-4', 'wp-a'));
      await repo.create(sample('ci-c-5', 'wp-b'));
      const all = await repo.list();
      expect(all.map((c) => c.id).sort()).toEqual(['ci-c-4', 'ci-c-5']);
    });
  });
}
