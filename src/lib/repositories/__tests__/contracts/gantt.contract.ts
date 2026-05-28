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
      data.data.push({
        id: before,
        text: 'tmp',
        owner: '',
        start_date: '2026-01-01',
        end_date: '2026-01-02',
        duration: 2,
        progress: 0,
        parent: 0,
        type: 'task',
      });
      const after = await repo.nextTaskId('proj-gantt-c-1');
      expect(after).toBeGreaterThan(before);
    });
  });
}
