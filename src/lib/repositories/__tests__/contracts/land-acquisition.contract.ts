import { beforeEach, describe, expect, it } from 'vitest';

import type { LandAcquisitionRecord } from '@/types/land-acquisition';

import type { LandAcquisitionRepository } from '../../land-acquisition.repository';

export function runLandAcquisitionRepositoryContract(
  makeRepo: () =>
    | Promise<LandAcquisitionRepository>
    | LandAcquisitionRepository,
) {
  describe('LandAcquisitionRepository contract', () => {
    let repo: LandAcquisitionRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, projectId = 'proj-x'): LandAcquisitionRecord {
      return {
        id,
        projectId,
        parcelReference: `โฉนดเลขที่ ${id}`,
        landownerName: 'นายสมชาย ใจดี',
        areaRai: 4.5,
        status: 'identified',
        compensationAmount: null,
        notes: '',
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('land-c-1', 'proj-a'));
      await repo.create(sample('land-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip', async () => {
      const l = sample('land-c-3');
      await repo.create(l);
      expect((await repo.findById(l.id))?.id).toBe(l.id);

      const patched = await repo.update(l.id, {
        status: 'compensated',
        compensationAmount: 850000,
      });
      expect(patched?.status).toBe('compensated');
      expect(patched?.compensationAmount).toBe(850000);

      await repo.delete(l.id);
      expect(await repo.findById(l.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('land-missing', { status: 'compensated' });
      expect(result).toBeNull();
    });
  });
}
