import { describe, expect, it, beforeEach } from 'vitest';
import type { Milestone } from '@/types/project';
import type { MilestoneRepository } from '../../milestone.repository';

export function runMilestoneRepositoryContract(
  makeRepo: () => Promise<MilestoneRepository> | MilestoneRepository,
) {
  describe('MilestoneRepository contract', () => {
    let repo: MilestoneRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleMilestone(id: string, projectId = 'proj-x'): Milestone {
      return {
        id,
        projectId,
        number: 1,
        name: `Milestone ${id}`,
        dueDate: '2026-06-01',
        amount: 100_000,
        percentage: 10,
        deliverables: 'งานต้นแบบ',
        status: 'pending',
      };
    }

    it('listByProject + CRUD round-trip', async () => {
      const m = sampleMilestone('ms-c-1', 'proj-a');
      await repo.create(m);
      await repo.create(sampleMilestone('ms-c-2', 'proj-b'));
      const a = await repo.listByProject('proj-a');
      expect(a.some((entry) => entry.id === 'ms-c-1')).toBe(true);

      await repo.update(m.id, { status: 'completed' });
      expect((await repo.findById(m.id))?.status).toBe('completed');

      await repo.delete(m.id);
      expect(await repo.findById(m.id)).toBeNull();
    });
  });
}
