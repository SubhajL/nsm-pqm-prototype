import { beforeEach, describe, expect, it } from 'vitest';

import type { ContractorPrequalification } from '@/types/contractor-prequalification';

import type { ContractorPrequalificationRepository } from '../../contractor-prequalification.repository';

export function runContractorPrequalificationRepositoryContract(
  makeRepo: () =>
    | Promise<ContractorPrequalificationRepository>
    | ContractorPrequalificationRepository,
) {
  describe('ContractorPrequalificationRepository contract', () => {
    let repo: ContractorPrequalificationRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      projectId = 'proj-x',
    ): ContractorPrequalification {
      return {
        id,
        projectId,
        contractorName: 'บริษัท ABC จำกัด',
        contractorTaxId: null,
        prequalifiedAt: '2026-04-01',
        validUntil: '2027-04-01',
        ahpScore: null,
        evidenceDocIds: [],
        notes: '',
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('pq-1', 'proj-a'));
      await repo.create(sample('pq-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip including evidenceDocIds array', async () => {
      const pq = sample('pq-3');
      pq.evidenceDocIds = ['doc-1', 'doc-2'];
      await repo.create(pq);
      const back = await repo.findById(pq.id);
      expect(back?.evidenceDocIds).toEqual(['doc-1', 'doc-2']);

      const patched = await repo.update(pq.id, { ahpScore: 0.85 });
      expect(patched?.ahpScore).toBeCloseTo(0.85);

      await repo.delete(pq.id);
      expect(await repo.findById(pq.id)).toBeNull();
    });
  });
}
