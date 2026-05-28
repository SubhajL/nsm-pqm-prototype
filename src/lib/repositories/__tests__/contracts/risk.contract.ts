import { describe, expect, it, beforeEach } from 'vitest';
import type { Risk } from '@/types/risk';
import type { RiskRepository } from '../../risk.repository';

export function runRiskRepositoryContract(
  makeRepo: () => Promise<RiskRepository> | RiskRepository,
) {
  describe('RiskRepository contract', () => {
    let repo: RiskRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleRisk(id: string, projectId = 'proj-x'): Risk {
      return {
        id,
        projectId,
        title: `Risk ${id}`,
        description: '',
        likelihood: 2,
        impact: 3,
        score: 6,
        level: 'medium',
        status: 'open',
        owner: 'Owner',
        dateIdentified: '2026-01-01',
        mitigation: '',
      };
    }

    it('listByProject filters correctly', async () => {
      await repo.create(sampleRisk('r-c-1', 'proj-a'));
      await repo.create(sampleRisk('r-c-2', 'proj-b'));
      const a = await repo.listByProject('proj-a');
      expect(a.every((r) => r.projectId === 'proj-a')).toBe(true);
    });

    it('CRUD round-trip', async () => {
      const r = sampleRisk('r-c-3');
      await repo.create(r);
      expect((await repo.findById(r.id))?.id).toBe(r.id);
      await repo.update(r.id, { status: 'closed' });
      expect((await repo.findById(r.id))?.status).toBe('closed');
      await repo.delete(r.id);
      expect(await repo.findById(r.id)).toBeNull();
    });
  });
}
