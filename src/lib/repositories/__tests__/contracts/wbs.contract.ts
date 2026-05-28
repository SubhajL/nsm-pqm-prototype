import { describe, expect, it, beforeEach } from 'vitest';
import type { WBSNode } from '@/hooks/useWBS';
import type { WbsRepository } from '../../wbs.repository';

export function runWbsRepositoryContract(
  makeRepo: () => Promise<WbsRepository> | WbsRepository,
) {
  describe('WbsRepository contract', () => {
    let repo: WbsRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleNode(id: string, projectId = 'proj-x'): WBSNode {
      return {
        id,
        projectId,
        parentId: null,
        code: '1.0',
        name: `WBS ${id}`,
        weight: 0,
        progress: 0,
        level: 1,
        hasBOQ: false,
      };
    }

    it('create + findById round-trip', async () => {
      const node = sampleNode('wbs-c-1');
      await repo.create(node);
      expect((await repo.findById(node.id))?.id).toBe(node.id);
    });

    it('listByProject filters by projectId', async () => {
      await repo.create(sampleNode('wbs-c-2', 'proj-a'));
      await repo.create(sampleNode('wbs-c-3', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA.every((n) => n.projectId === 'proj-a')).toBe(true);
      expect(onlyA.some((n) => n.id === 'wbs-c-2')).toBe(true);
    });

    it('update patches in place', async () => {
      const node = sampleNode('wbs-c-4');
      await repo.create(node);
      const updated = await repo.update(node.id, { progress: 75 });
      expect(updated?.progress).toBe(75);
    });

    it('delete removes the entity', async () => {
      const node = sampleNode('wbs-c-5');
      await repo.create(node);
      await repo.delete(node.id);
      expect(await repo.findById(node.id)).toBeNull();
    });
  });
}
