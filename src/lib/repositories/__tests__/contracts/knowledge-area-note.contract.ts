import { beforeEach, describe, expect, it } from 'vitest';

import type { KnowledgeAreaNote } from '@/types/knowledge-area-note';

import type { KnowledgeAreaNoteRepository } from '../../knowledge-area-note.repository';

export function runKnowledgeAreaNoteRepositoryContract(
  makeRepo: () =>
    | Promise<KnowledgeAreaNoteRepository>
    | KnowledgeAreaNoteRepository,
) {
  describe('KnowledgeAreaNoteRepository contract', () => {
    let repo: KnowledgeAreaNoteRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      projectId = 'proj-x',
      overrides: Partial<KnowledgeAreaNote> = {},
    ): KnowledgeAreaNote {
      return {
        id,
        projectId,
        area: 'integration',
        version: 1,
        content: '# Integration\nDraft',
        authoredBy: 'user-001',
        authoredAt: '2026-05-30T00:00:00.000Z',
        ...overrides,
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('kn-c-1', 'proj-a'));
      await repo.create(sample('kn-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('findLatestByProjectArea returns null when no rows', async () => {
      const latest = await repo.findLatestByProjectArea(
        'proj-empty',
        'integration',
      );
      expect(latest).toBeNull();
    });

    it('findLatestByProjectArea returns the highest version for the (project, area) pair', async () => {
      await repo.create(
        sample('kn-c-3', 'proj-a', { area: 'integration', version: 1 }),
      );
      await repo.create(
        sample('kn-c-4', 'proj-a', { area: 'integration', version: 2 }),
      );
      await repo.create(
        sample('kn-c-5', 'proj-a', { area: 'communication_plan', version: 1 }),
      );
      const latestInteg = await repo.findLatestByProjectArea(
        'proj-a',
        'integration',
      );
      expect(latestInteg?.version).toBe(2);
      expect(latestInteg?.area).toBe('integration');

      const latestComm = await repo.findLatestByProjectArea(
        'proj-a',
        'communication_plan',
      );
      expect(latestComm?.version).toBe(1);
    });

    it('CRUD round-trip preserves area + version + content', async () => {
      const n = sample('kn-c-6');
      await repo.create(n);
      const fetched = await repo.findById(n.id);
      expect(fetched?.area).toBe('integration');
      expect(fetched?.version).toBe(1);
      expect(fetched?.content).toBe('# Integration\nDraft');

      const patched = await repo.update(n.id, { content: '# Integration v2' });
      expect(patched?.content).toBe('# Integration v2');

      await repo.delete(n.id);
      expect(await repo.findById(n.id)).toBeNull();
    });

    it('update returns null for unknown id', async () => {
      expect(await repo.update('kn-missing', { content: 'x' })).toBeNull();
    });
  });
}
