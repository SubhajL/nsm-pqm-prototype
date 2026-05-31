import { beforeEach, describe, expect, it } from 'vitest';

import type { VendorSow } from '@/types/vendor-sow';

import type { VendorSowRepository } from '../../vendor-sow.repository';

export function runVendorSowRepositoryContract(
  makeRepo: () => Promise<VendorSowRepository> | VendorSowRepository,
) {
  describe('VendorSowRepository contract', () => {
    let repo: VendorSowRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      projectId = 'proj-x',
      overrides: Partial<VendorSow> = {},
    ): VendorSow {
      return {
        id,
        projectId,
        contractId: null,
        phase: 'Phase 1 - SRS',
        scopeSummary: 'Software Requirements Specification deliverable.',
        uatCriteria: '- All requirements traced.',
        warrantyMonths: 12,
        state: 'draft',
        signedAt: null,
        acceptedAt: null,
        notes: '',
        ...overrides,
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('sow-c-1', 'proj-a'));
      await repo.create(sample('sow-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip preserves contractId and warrantyMonths', async () => {
      const s = sample('sow-c-3', 'proj-x', {
        contractId: 'ct-123',
        warrantyMonths: 24,
      });
      await repo.create(s);
      const fetched = await repo.findById(s.id);
      expect(fetched?.contractId).toBe('ct-123');
      expect(fetched?.warrantyMonths).toBe(24);

      const patched = await repo.update(s.id, {
        state: 'agreed',
        signedAt: '2026-06-10T00:00:00.000Z',
      });
      expect(patched?.state).toBe('agreed');
      expect(patched?.signedAt).toBe('2026-06-10T00:00:00.000Z');

      await repo.delete(s.id);
      expect(await repo.findById(s.id)).toBeNull();
    });

    it('nullable fields (contractId, warrantyMonths, signedAt, acceptedAt) round-trip null', async () => {
      await repo.create(sample('sow-c-4'));
      const fetched = await repo.findById('sow-c-4');
      expect(fetched?.contractId).toBeNull();
      expect(fetched?.warrantyMonths).toBe(12);
      expect(fetched?.signedAt).toBeNull();
      expect(fetched?.acceptedAt).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('sow-missing', { state: 'agreed' });
      expect(result).toBeNull();
    });

    it('list returns every persisted SOW', async () => {
      await repo.create(sample('sow-c-5', 'proj-a'));
      await repo.create(sample('sow-c-6', 'proj-b'));
      const all = await repo.list();
      expect(all.map((s) => s.id).sort()).toEqual(['sow-c-5', 'sow-c-6']);
    });
  });
}
