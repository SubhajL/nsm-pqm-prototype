import { beforeEach, describe, expect, it } from 'vitest';

import type { ContractAmendment } from '@/types/contract-amendment';

import type { ContractAmendmentRepository } from '../../contract-amendment.repository';

export function runContractAmendmentRepositoryContract(
  makeRepo: () => Promise<ContractAmendmentRepository> | ContractAmendmentRepository,
) {
  describe('ContractAmendmentRepository contract', () => {
    let repo: ContractAmendmentRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      contractId = 'ct-x',
      amendmentNumber = 1,
    ): ContractAmendment {
      return {
        id,
        contractId,
        amendmentNumber,
        amendedAt: '2026-07-01',
        amountDelta: 100_000,
        scheduleDeltaDays: 14,
        reason: 'เพิ่มขอบเขตงาน',
        approvedBy: 'user-002',
        documentFileId: null,
      };
    }

    it('listByContract filters by contractId', async () => {
      await repo.create(sample('am-1', 'ct-a', 1));
      await repo.create(sample('am-2', 'ct-a', 2));
      await repo.create(sample('am-3', 'ct-b', 1));
      const onlyA = await repo.listByContract('ct-a');
      expect(onlyA).toHaveLength(2);
      for (const row of onlyA) expect(row.contractId).toBe('ct-a');
    });

    it('CRUD round-trip', async () => {
      const a = sample('am-4');
      await repo.create(a);
      const patched = await repo.update(a.id, {
        amountDelta: -50_000,
        scheduleDeltaDays: -5,
      });
      expect(patched?.amountDelta).toBe(-50_000);
      expect(patched?.scheduleDeltaDays).toBe(-5);
      await repo.delete(a.id);
      expect(await repo.findById(a.id)).toBeNull();
    });
  });
}
