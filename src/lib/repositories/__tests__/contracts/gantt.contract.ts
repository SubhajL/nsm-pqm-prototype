import { describe, expect, it, beforeEach } from 'vitest';
import type { GanttRepository } from '../../gantt.repository';

export function runGanttRepositoryContract(
  makeRepo: () => Promise<GanttRepository> | GanttRepository,
) {
  describe('GanttRepository contract', () => {
    let repo: GanttRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    it('getProjectData returns a non-null GanttData blob (even for unknown projects)', async () => {
      const data = await repo.getProjectData('proj-gantt-c-new');
      expect(data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(Array.isArray(data.links)).toBe(true);
    });

    it('nextTaskId is monotonic — strictly greater than the max existing id', async () => {
      const data = await repo.getProjectData('proj-gantt-c-1');
      const before = await repo.nextTaskId('proj-gantt-c-1');
      // PR-21b: persisting via `replaceProjectData` is the contract; the
      // Database impl no longer reads in-place mutations to `data.data`.
      await repo.replaceProjectData('proj-gantt-c-1', {
        data: [
          ...data.data,
          {
            id: before,
            text: 'tmp',
            owner: '',
            start_date: '2026-01-01',
            end_date: '2026-01-02',
            duration: 2,
            progress: 0,
            parent: 0,
            type: 'task',
          },
        ],
        links: data.links,
      });
      const after = await repo.nextTaskId('proj-gantt-c-1');
      expect(after).toBeGreaterThan(before);
    });

    it('replaceProjectData persists tasks + links back to storage', async () => {
      const next = {
        data: [
          {
            id: 42,
            text: 'A',
            owner: '',
            start_date: '2026-02-01',
            end_date: '2026-02-02',
            duration: 2,
            progress: 0,
            parent: 0,
            type: 'task' as const,
          },
        ],
        links: [
          { id: 1, source: 1, target: 42, type: 'FS' as const, lagDays: 0 },
        ],
      };
      await repo.replaceProjectData('proj-gantt-c-2', next);
      const out = await repo.getProjectData('proj-gantt-c-2');
      expect(out.data.find((t) => t.id === 42)).toBeDefined();
      expect(out.links.find((l) => l.id === 1)).toBeDefined();
    });
  });
}
