import { beforeEach, describe, expect, it } from 'vitest';

import type { EngineeringEstimate } from '@/types/engineering-estimate';

import type { EngineeringEstimateRepository } from '../../engineering-estimate.repository';

export function runEngineeringEstimateRepositoryContract(
  makeRepo: () =>
    | Promise<EngineeringEstimateRepository>
    | EngineeringEstimateRepository,
) {
  describe('EngineeringEstimateRepository contract', () => {
    let repo: EngineeringEstimateRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(id: string, packageId = 'pkg-x'): EngineeringEstimate {
      return {
        id,
        procurementPackageId: packageId,
        boqId: null,
        basis: 'unit_price',
        estimatedTotal: 1_000_000,
        contingencyPercent: 0.1,
        estimatedBy: 'user-002',
        estimatedAt: '2026-05-15',
        notes: '',
      };
    }

    it('listByProcurementPackage filters by packageId', async () => {
      await repo.create(sample('est-1', 'pkg-a'));
      await repo.create(sample('est-2', 'pkg-b'));
      const onlyA = await repo.listByProcurementPackage('pkg-a');
      expect(onlyA).toHaveLength(1);
    });

    it('CRUD round-trip', async () => {
      const e = sample('est-3');
      await repo.create(e);
      const patched = await repo.update(e.id, {
        estimatedTotal: 1_500_000,
        contingencyPercent: 0.15,
      });
      expect(patched?.estimatedTotal).toBe(1_500_000);
      expect(patched?.contingencyPercent).toBeCloseTo(0.15);
      await repo.delete(e.id);
      expect(await repo.findById(e.id)).toBeNull();
    });
  });
}
