import { beforeEach, describe, expect, it } from 'vitest';

import type { EnvironmentalAssessment } from '@/types/environmental-assessment';

import type { EnvironmentalAssessmentRepository } from '../../environmental-assessment.repository';

export function runEnvironmentalAssessmentRepositoryContract(
  makeRepo: () =>
    | Promise<EnvironmentalAssessmentRepository>
    | EnvironmentalAssessmentRepository,
) {
  describe('EnvironmentalAssessmentRepository contract', () => {
    let repo: EnvironmentalAssessmentRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, projectId = 'proj-x'): EnvironmentalAssessment {
      return {
        id,
        projectId,
        kind: 'EIA',
        status: 'not_started',
        approvedAt: null,
        approvalReference: null,
        notes: '',
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('eia-c-1', 'proj-a'));
      await repo.create(sample('eia-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip', async () => {
      const e = sample('eia-c-3');
      await repo.create(e);
      expect((await repo.findById(e.id))?.id).toBe(e.id);

      const patched = await repo.update(e.id, {
        status: 'approved',
        approvedAt: '2026-04-15',
        approvalReference: 'EIA-2569-0042',
      });
      expect(patched?.status).toBe('approved');
      expect(patched?.approvalReference).toBe('EIA-2569-0042');

      await repo.delete(e.id);
      expect(await repo.findById(e.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('eia-missing', { status: 'approved' });
      expect(result).toBeNull();
    });
  });
}
