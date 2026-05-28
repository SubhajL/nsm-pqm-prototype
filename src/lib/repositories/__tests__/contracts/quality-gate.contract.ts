import { describe, expect, it, beforeEach } from 'vitest';
import type { QualityGate } from '@/types/quality';
import type { QualityGateRepository } from '../../quality-gate.repository';

export function runQualityGateRepositoryContract(
  makeRepo: () => Promise<QualityGateRepository> | QualityGateRepository,
) {
  describe('QualityGateRepository contract', () => {
    let repo: QualityGateRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleGate(id: string, projectId = 'proj-x'): QualityGate {
      return {
        id,
        projectId,
        number: 1,
        name: `Gate ${id}`,
        nameEn: `Gate ${id}`,
        status: 'pending',
        date: '2026-06-01',
      };
    }

    it('listByProject + CRUD round-trip', async () => {
      const g = sampleGate('qg-c-1', 'proj-a');
      await repo.create(g);
      await repo.create(sampleGate('qg-c-2', 'proj-b'));
      const a = await repo.listByProject('proj-a');
      expect(a.some((entry) => entry.id === 'qg-c-1')).toBe(true);

      await repo.update(g.id, { status: 'conditional' });
      expect((await repo.findById(g.id))?.status).toBe('conditional');

      await repo.delete(g.id);
      expect(await repo.findById(g.id)).toBeNull();
    });
  });
}
