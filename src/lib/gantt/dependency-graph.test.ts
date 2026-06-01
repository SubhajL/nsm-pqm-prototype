import { describe, expect, it } from 'vitest';

import type { GanttLink, GanttTask } from '@/types/gantt';

import {
  computeCriticalPath,
  topologicalOrder,
  wouldCreateCycle,
} from './dependency-graph';

function task(id: number, start: string, days: number, parent = 0): GanttTask {
  // duration is 1-based (a same-day task = 1). The CPM helper treats
  // it as the number of working days the bar consumes.
  return {
    id,
    text: `task-${id}`,
    owner: '',
    start_date: start,
    end_date: addDaysIso(start, Math.max(0, days - 1)),
    duration: days,
    progress: 0,
    parent,
    type: 'task',
  };
}

function link(
  id: number,
  source: number,
  target: number,
  type: GanttLink['type'] = 'FS',
  lagDays = 0,
): GanttLink {
  return { id, source, target, type, lagDays };
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('wouldCreateCycle', () => {
  it('returns true when the proposed edge is a self-edge', () => {
    expect(wouldCreateCycle([], { predecessorId: 1, successorId: 1 })).toBe(true);
  });

  it('returns false when the graph is empty and the edge is not a self-edge', () => {
    expect(wouldCreateCycle([], { predecessorId: 1, successorId: 2 })).toBe(false);
  });

  it('returns false for a fresh edge that does not close a path', () => {
    const links = [link(1, 1, 2), link(2, 2, 3)];
    // Adding 4 → 5 doesn't touch the existing chain.
    expect(wouldCreateCycle(links, { predecessorId: 4, successorId: 5 })).toBe(false);
  });

  it('returns true when adding an edge would close a 2-node cycle', () => {
    const links = [link(1, 1, 2)];
    expect(wouldCreateCycle(links, { predecessorId: 2, successorId: 1 })).toBe(true);
  });

  it('returns true when adding an edge would close a longer cycle', () => {
    const links = [link(1, 1, 2), link(2, 2, 3), link(3, 3, 4)];
    expect(wouldCreateCycle(links, { predecessorId: 4, successorId: 1 })).toBe(true);
  });

  it('returns false on a parallel diamond (not actually a cycle)', () => {
    // 1 → 2 → 4
    // 1 → 3 → 4
    const links = [link(1, 1, 2), link(2, 1, 3), link(3, 2, 4), link(4, 3, 4)];
    expect(wouldCreateCycle(links, { predecessorId: 1, successorId: 4 })).toBe(false);
  });
});

describe('topologicalOrder', () => {
  it('returns the input order when there are no links', () => {
    const tasks = [task(3, '2026-01-01', 1), task(1, '2026-01-01', 1)];
    expect(topologicalOrder(tasks, [])).toEqual([3, 1]);
  });

  it('linearises a simple chain', () => {
    const tasks = [task(1, '2026-01-01', 1), task(2, '2026-01-02', 1), task(3, '2026-01-03', 1)];
    const links = [link(1, 1, 2), link(2, 2, 3)];
    expect(topologicalOrder(tasks, links)).toEqual([1, 2, 3]);
  });

  it('returns null when the graph contains a cycle', () => {
    const tasks = [task(1, '2026-01-01', 1), task(2, '2026-01-02', 1)];
    const links = [link(1, 1, 2), link(2, 2, 1)];
    expect(topologicalOrder(tasks, links)).toBeNull();
  });

  it('ignores links that reference unknown task ids', () => {
    const tasks = [task(1, '2026-01-01', 1), task(2, '2026-01-02', 1)];
    const links = [link(1, 1, 2), link(2, 99, 100)];
    expect(topologicalOrder(tasks, links)).toEqual([1, 2]);
  });
});

describe('computeCriticalPath', () => {
  it('returns an empty result for an empty task list', () => {
    const result = computeCriticalPath([], []);
    expect(result.criticalTaskIds.size).toBe(0);
    expect(result.criticalLinkIds.size).toBe(0);
    expect(result.projectDurationDays).toBe(0);
  });

  it('marks the single task as critical when there are no links', () => {
    const tasks = [task(1, '2026-01-01', 3)];
    const result = computeCriticalPath(tasks, []);
    expect(Array.from(result.criticalTaskIds)).toEqual([1]);
    expect(result.projectDurationDays).toBe(3);
  });

  it('marks every task on a simple FS chain as critical', () => {
    // 1 (3d) → 2 (2d) → 3 (4d)
    const tasks = [
      task(1, '2026-01-01', 3),
      task(2, '2026-01-04', 2),
      task(3, '2026-01-06', 4),
    ];
    const links = [link(1, 1, 2), link(2, 2, 3)];
    const result = computeCriticalPath(tasks, links);
    expect(Array.from(result.criticalTaskIds).sort()).toEqual([1, 2, 3]);
    expect(result.criticalLinkIds.size).toBe(2);
    expect(result.projectDurationDays).toBe(9); // 3 + 2 + 4
  });

  it('flags only the longer parallel branch as critical', () => {
    //        ┌─ 2 (1d) ─┐
    // 1 (1d) ┤          ├─ 4 (1d)
    //        └─ 3 (5d) ─┘
    const tasks = [
      task(1, '2026-01-01', 1),
      task(2, '2026-01-02', 1),
      task(3, '2026-01-02', 5),
      task(4, '2026-01-07', 1),
    ];
    const links = [link(1, 1, 2), link(2, 1, 3), link(3, 2, 4), link(4, 3, 4)];
    const result = computeCriticalPath(tasks, links);
    // 1 → 3 → 4 is critical (total 7 days); 2 has slack and is NOT critical.
    expect(result.criticalTaskIds.has(1)).toBe(true);
    expect(result.criticalTaskIds.has(3)).toBe(true);
    expect(result.criticalTaskIds.has(4)).toBe(true);
    expect(result.criticalTaskIds.has(2)).toBe(false);
    expect(result.projectDurationDays).toBe(7);
  });

  it('honours FS lag — successor pushed later by lagDays', () => {
    const tasks = [task(1, '2026-01-01', 2), task(2, '2026-01-03', 2)];
    const links = [link(1, 1, 2, 'FS', 3)]; // 3-day lag
    const result = computeCriticalPath(tasks, links);
    expect(result.earliestStart.get(1)).toBe(0);
    expect(result.earliestStart.get(2)).toBe(5); // 0 + 2 (pred dur) + 3 (lag)
    expect(result.projectDurationDays).toBe(7);
  });

  it('honours SS link — successor can start as soon as predecessor starts', () => {
    const tasks = [task(1, '2026-01-01', 4), task(2, '2026-01-01', 3)];
    const links = [link(1, 1, 2, 'SS', 0)];
    const result = computeCriticalPath(tasks, links);
    expect(result.earliestStart.get(2)).toBe(0);
    expect(result.projectDurationDays).toBe(4);
  });

  it('honours FF link — successor.finish constrained by predecessor.finish', () => {
    // Task 1 is 5 days starting day 0 (finish = 5).
    // Task 2 has its own start_date pushing it to day 0 (same origin),
    // duration 3 days. Without the FF link, succ.start would be 0.
    // With the link, succ.finish >= pred.finish = 5, so succ.start >= 2.
    // The helper respects max(baseStart, link-constraint), so earliest = 2.
    const tasks = [task(1, '2026-01-01', 5), task(2, '2026-01-01', 3)];
    const links = [link(1, 1, 2, 'FF', 0)];
    const result = computeCriticalPath(tasks, links);
    expect(result.earliestStart.get(2)).toBe(2);
    expect(result.projectDurationDays).toBe(5);
  });

  it('returns empty result on a cyclic graph', () => {
    const tasks = [task(1, '2026-01-01', 1), task(2, '2026-01-02', 1)];
    const links = [link(1, 1, 2), link(2, 2, 1)];
    const result = computeCriticalPath(tasks, links);
    expect(result.criticalTaskIds.size).toBe(0);
    expect(result.criticalLinkIds.size).toBe(0);
  });

  it('marks all links between critical tasks as critical', () => {
    const tasks = [task(1, '2026-01-01', 2), task(2, '2026-01-03', 2)];
    const links = [link(7, 1, 2, 'FS')];
    const result = computeCriticalPath(tasks, links);
    expect(Array.from(result.criticalLinkIds)).toEqual([7]);
  });
});
