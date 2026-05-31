import { beforeEach, describe, expect, it } from 'vitest';

import type { AwardedContract } from '@/types/awarded-contract';

import type { AwardedContractRepository } from '../../awarded-contract.repository';

export function runAwardedContractRepositoryContract(
  makeRepo: () => Promise<AwardedContractRepository> | AwardedContractRepository,
) {
  describe('AwardedContractRepository contract', () => {
    let repo: AwardedContractRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      projectId = 'proj-x',
      packageId = 'pkg-x',
    ): AwardedContract {
      return {
        id,
        procurementPackageId: packageId,
        projectId,
        contractNumber: `CN-${id}`,
        contractorName: 'บริษัท XYZ จำกัด',
        contractorTaxId: null,
        awardAmount: 5_000_000,
        contractingModel: 'lump_sum',
        state: 'draft',
        signedAt: null,
        effectiveDate: null,
        expirationDate: null,
        warrantyMonths: null,
        notes: '',
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('ct-1', 'proj-a'));
      await repo.create(sample('ct-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('listByProcurementPackage filters by packageId', async () => {
      await repo.create(sample('ct-3', 'proj-c', 'pkg-a'));
      await repo.create(sample('ct-4', 'proj-c', 'pkg-b'));
      const onlyA = await repo.listByProcurementPackage('pkg-a');
      expect(onlyA).toHaveLength(1);
    });

    it('CRUD round-trip', async () => {
      const c = sample('ct-5');
      await repo.create(c);
      const patched = await repo.update(c.id, {
        state: 'signed',
        signedAt: '2026-06-10',
      });
      expect(patched?.state).toBe('signed');
      expect(patched?.signedAt).toBe('2026-06-10');
      await repo.delete(c.id);
      expect(await repo.findById(c.id)).toBeNull();
    });
  });
}
