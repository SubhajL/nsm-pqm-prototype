import { beforeEach, describe, expect, it } from 'vitest';

import type { WorkPeriod } from '@/types/work-period';

import type { WorkPeriodRepository } from '../../work-period.repository';

export function runWorkPeriodRepositoryContract(
  makeRepo: () => Promise<WorkPeriodRepository> | WorkPeriodRepository,
) {
  describe('WorkPeriodRepository contract', () => {
    let repo: WorkPeriodRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, projectId = 'proj-x', overrides: Partial<WorkPeriod> = {}): WorkPeriod {
      return {
        id,
        projectId,
        milestoneId: null,
        number: 1,
        title: `งวดที่ 1 ${id}`,
        deliverables: ['ส่งแบบก่อสร้าง', 'รายงานความคืบหน้า'],
        plannedStartDate: '2026-06-01',
        plannedEndDate: '2026-06-30',
        amount: 1_000_000,
        percentage: 10,
        state: 'planned',
        createdAt: '2026-05-30T00:00:00.000Z',
        updatedAt: '2026-05-30T00:00:00.000Z',
        ...overrides,
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('wp-c-1', 'proj-a'));
      await repo.create(sample('wp-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip preserves deliverables array', async () => {
      const wp = sample('wp-c-3');
      await repo.create(wp);
      const fetched = await repo.findById(wp.id);
      expect(fetched?.deliverables).toEqual(['ส่งแบบก่อสร้าง', 'รายงานความคืบหน้า']);

      const patched = await repo.update(wp.id, {
        state: 'in_progress',
        updatedAt: '2026-06-02T00:00:00.000Z',
      });
      expect(patched?.state).toBe('in_progress');
      expect(patched?.updatedAt).toBe('2026-06-02T00:00:00.000Z');

      await repo.delete(wp.id);
      expect(await repo.findById(wp.id)).toBeNull();
    });

    it('milestoneId is optional and round-trips both null and a string', async () => {
      await repo.create(sample('wp-c-4'));
      await repo.create(sample('wp-c-5', 'proj-x', { milestoneId: 'ms-001' }));
      const linked = await repo.findById('wp-c-5');
      expect(linked?.milestoneId).toBe('ms-001');
      const unlinked = await repo.findById('wp-c-4');
      expect(unlinked?.milestoneId).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('wp-missing', { state: 'submitted' });
      expect(result).toBeNull();
    });

    it('list returns every persisted work period', async () => {
      await repo.create(sample('wp-c-6', 'proj-a'));
      await repo.create(sample('wp-c-7', 'proj-b'));
      const all = await repo.list();
      expect(all.map((wp) => wp.id).sort()).toEqual(['wp-c-6', 'wp-c-7']);
    });
  });
}
