import { beforeEach, describe, expect, it } from 'vitest';

import type { ProcurementPackage } from '@/types/procurement-package';

import type { ProcurementPackageRepository } from '../../procurement-package.repository';

export function runProcurementPackageRepositoryContract(
  makeRepo: () => Promise<ProcurementPackageRepository> | ProcurementPackageRepository,
) {
  describe('ProcurementPackageRepository contract', () => {
    let repo: ProcurementPackageRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function samplePackage(
      id: string,
      projectId = 'proj-x',
    ): ProcurementPackage {
      return {
        id,
        projectId,
        name: `จัดซื้อจัดจ้าง ${id} (Procurement ${id})`,
        state: 'draft',
        budgetCeiling: 1_000_000,
        procurementMethod: 'e_bidding',
        openedAt: null,
        closedAt: null,
        notes: '',
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(samplePackage('pkg-c-1', 'proj-a'));
      await repo.create(samplePackage('pkg-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip', async () => {
      const p = samplePackage('pkg-c-3');
      await repo.create(p);
      expect((await repo.findById(p.id))?.id).toBe(p.id);

      const patched = await repo.update(p.id, {
        state: 'tor_review',
        budgetCeiling: 2_000_000,
      });
      expect(patched?.state).toBe('tor_review');
      expect(patched?.budgetCeiling).toBe(2_000_000);

      await repo.delete(p.id);
      expect(await repo.findById(p.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('pkg-missing', { state: 'tor_review' });
      expect(result).toBeNull();
    });

    it('list returns every persisted package', async () => {
      await repo.create(samplePackage('pkg-c-4', 'proj-a'));
      await repo.create(samplePackage('pkg-c-5', 'proj-b'));
      const all = await repo.list();
      expect(all.map((p) => p.id).sort()).toEqual(['pkg-c-4', 'pkg-c-5']);
    });
  });
}
