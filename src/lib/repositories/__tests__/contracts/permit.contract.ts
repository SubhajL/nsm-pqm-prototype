import { beforeEach, describe, expect, it } from 'vitest';

import type { Permit } from '@/types/permit';

import type { PermitRepository } from '../../permit.repository';

export function runPermitRepositoryContract(
  makeRepo: () => Promise<PermitRepository> | PermitRepository,
) {
  describe('PermitRepository contract', () => {
    let repo: PermitRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function samplePermit(id: string, projectId = 'proj-x'): Permit {
      return {
        id,
        projectId,
        permitType: 'building',
        title: `ใบอนุญาตก่อสร้าง ${id} (Building permit ${id})`,
        issuingAuthority: 'อบต.ลำชี',
        status: 'draft',
        issuedAt: null,
        expiresAt: null,
        notes: '',
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(samplePermit('per-c-1', 'proj-a'));
      await repo.create(samplePermit('per-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip', async () => {
      const p = samplePermit('per-c-3');
      await repo.create(p);
      expect((await repo.findById(p.id))?.id).toBe(p.id);

      const patched = await repo.update(p.id, {
        status: 'issued',
        issuedAt: '2026-05-01',
        expiresAt: '2027-05-01',
      });
      expect(patched?.status).toBe('issued');
      expect(patched?.issuedAt).toBe('2026-05-01');
      expect(patched?.expiresAt).toBe('2027-05-01');

      await repo.delete(p.id);
      expect(await repo.findById(p.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      const result = await repo.update('per-missing', { status: 'issued' });
      expect(result).toBeNull();
    });

    it('list returns every persisted permit', async () => {
      await repo.create(samplePermit('per-c-4', 'proj-a'));
      await repo.create(samplePermit('per-c-5', 'proj-b'));
      const all = await repo.list();
      expect(all.map((p) => p.id).sort()).toEqual(['per-c-4', 'per-c-5']);
    });
  });
}
