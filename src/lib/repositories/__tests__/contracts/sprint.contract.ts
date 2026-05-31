import { beforeEach, describe, expect, it } from 'vitest';

import type { ItSprint } from '@/types/sprint';

import type { ItSprintRepository } from '../../sprint.repository';

export function runItSprintRepositoryContract(
  makeRepo: () => Promise<ItSprintRepository> | ItSprintRepository,
) {
  describe('ItSprintRepository contract', () => {
    let repo: ItSprintRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sample(
      id: string,
      projectId = 'proj-x',
      overrides: Partial<ItSprint> = {},
    ): ItSprint {
      return {
        id,
        projectId,
        lifecycleStage: 'construction',
        sprintNumber: 1,
        startDate: '2026-06-01',
        endDate: '2026-06-14',
        goal: 'Sprint 1 kickoff',
        velocityPoints: 21,
        completedPoints: 0,
        notes: '',
        ...overrides,
      };
    }

    it('listByProject filters by projectId', async () => {
      await repo.create(sample('sp-c-1', 'proj-a'));
      await repo.create(sample('sp-c-2', 'proj-b'));
      const onlyA = await repo.listByProject('proj-a');
      expect(onlyA).toHaveLength(1);
      expect(onlyA[0].projectId).toBe('proj-a');
    });

    it('CRUD round-trip preserves velocity values', async () => {
      const s = sample('sp-c-3');
      await repo.create(s);
      const fetched = await repo.findById(s.id);
      expect(fetched?.velocityPoints).toBe(21);

      const patched = await repo.update(s.id, { completedPoints: 18 });
      expect(patched?.completedPoints).toBe(18);

      await repo.delete(s.id);
      expect(await repo.findById(s.id)).toBeNull();
    });

    it('lifecycleStage is stored as plain text (no enum coercion)', async () => {
      await repo.create(
        sample('sp-c-4', 'proj-x', { lifecycleStage: 'survey_design' }),
      );
      const fetched = await repo.findById('sp-c-4');
      expect(fetched?.lifecycleStage).toBe('survey_design');
    });

    it('update returns null for unknown id', async () => {
      expect(await repo.update('sp-missing', { completedPoints: 1 })).toBeNull();
    });

    it('list returns every persisted sprint', async () => {
      await repo.create(sample('sp-c-5', 'proj-a'));
      await repo.create(sample('sp-c-6', 'proj-b'));
      const all = await repo.list();
      expect(all.map((s) => s.id).sort()).toEqual(['sp-c-5', 'sp-c-6']);
    });
  });
}
