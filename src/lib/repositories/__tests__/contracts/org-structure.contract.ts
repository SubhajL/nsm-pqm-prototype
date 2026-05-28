import { describe, expect, it, beforeEach } from 'vitest';
import type { OrgUnit } from '@/types/admin';
import type { OrgStructureRepository } from '../../org-structure.repository';

export function runOrgStructureRepositoryContract(
  makeRepo: () => Promise<OrgStructureRepository> | OrgStructureRepository,
) {
  describe('OrgStructureRepository contract', () => {
    let repo: OrgStructureRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleUnit(id: string, parentId: string | null = null): OrgUnit {
      return {
        id,
        kind: 'department',
        name: `Unit ${id}`,
        nameEn: null,
        parentId,
        costCenter: null,
      };
    }

    it('create + findById + delete', async () => {
      const u = sampleUnit('org-c-1');
      await repo.create(u);
      expect((await repo.findById(u.id))?.id).toBe(u.id);
      await repo.delete(u.id);
      expect(await repo.findById(u.id)).toBeNull();
    });

    it('hasChildren reflects parent/child relationships', async () => {
      const parent = sampleUnit('org-c-parent');
      const child = sampleUnit('org-c-child', parent.id);
      await repo.create(parent);
      await repo.create(child);
      expect(await repo.hasChildren(parent.id)).toBe(true);
      expect(await repo.hasChildren(child.id)).toBe(false);
    });
  });
}
