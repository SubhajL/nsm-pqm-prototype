import { describe, expect, it } from 'vitest';

import type { WBSNode } from '@/hooks/useWBS';
import {
  buildWeightingRows,
  deriveAutoProjectStatus,
  deriveProjectScheduleHealth,
  getExecutableGanttTasks,
  getTotalWeightedProgress,
  normalizeMatchKey,
  type WeightingRow,
} from '@/lib/project-progress-derivations';
import type { GanttTask } from '@/types/gantt';
import type { ProjectStatus } from '@/types/project';

// ---------------------------------------------------------------------------
// Characterization tests: pin CURRENT behavior of project progress derivations.
// All references to dates assume the demo evaluation date '2026-03-17' baked
// into project-progress-derivations.ts.
// ---------------------------------------------------------------------------

function makeWbsNode(overrides: Partial<WBSNode>): WBSNode {
  return {
    id: overrides.id ?? '',
    projectId: 'P-TEST',
    parentId: overrides.parentId ?? null,
    code: overrides.code ?? '',
    name: overrides.name ?? '',
    weight: overrides.weight ?? 0,
    progress: overrides.progress ?? 0,
    level: overrides.level ?? 0,
    hasBOQ: overrides.hasBOQ ?? false,
  };
}

function makeTask(overrides: Partial<GanttTask>): GanttTask {
  return {
    id: overrides.id ?? 1,
    text: overrides.text ?? 'Task',
    start_date: overrides.start_date ?? '2026-01-01',
    end_date: overrides.end_date ?? '2026-12-31',
    duration: overrides.duration ?? 30,
    progress: overrides.progress ?? 0,
    parent: overrides.parent ?? 0,
    type: overrides.type ?? 'task',
    owner: overrides.owner ?? 'owner',
  };
}

describe('normalizeMatchKey', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeMatchKey('  Hello   World  ')).toBe('hello world');
  });

  it('handles tabs and newlines as whitespace', () => {
    expect(normalizeMatchKey('Foo\tBar\nBaz')).toBe('foo bar baz');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeMatchKey('   \t\n  ')).toBe('');
  });

  it('preserves Thai characters', () => {
    expect(normalizeMatchKey('  งาน ทดสอบ  ')).toBe('งาน ทดสอบ');
  });
});

describe('getExecutableGanttTasks', () => {
  it('keeps only tasks with type === "task"', () => {
    const tasks = [
      makeTask({ id: 1, type: 'task', text: 'leaf' }),
      makeTask({ id: 2, type: 'project', text: 'phase' }),
      makeTask({ id: 3, type: 'milestone', text: 'milestone' }),
      makeTask({ id: 4, type: 'task', text: 'leaf2' }),
    ];
    const executable = getExecutableGanttTasks(tasks);
    expect(executable.map((t) => t.id)).toEqual([1, 4]);
  });

  it('returns an empty array when no tasks are executable', () => {
    expect(getExecutableGanttTasks([makeTask({ type: 'project' })])).toEqual([]);
  });
});

describe('buildWeightingRows + getTotalWeightedProgress', () => {
  it('keeps only level=1 nodes, sorted by code, and computes weighted column', () => {
    const nodes: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, weight: 100, progress: 50 }),
      makeWbsNode({ id: 'a', code: '1.2', level: 1, weight: 40, progress: 50, name: 'A' }),
      makeWbsNode({ id: 'b', code: '1.1', level: 1, weight: 60, progress: 80, name: 'B' }),
      makeWbsNode({ id: 'leaf', code: '1.1.1', level: 2, weight: 100, progress: 100 }),
    ];
    const rows = buildWeightingRows(nodes);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      key: 'b',
      wbs: '1.1',
      activity: 'B',
      weight: 60,
      completion: 80,
      weighted: 48, // 60 * 80 / 100
    });
    expect(rows[1]).toMatchObject({
      key: 'a',
      wbs: '1.2',
      activity: 'A',
      weight: 40,
      completion: 50,
      weighted: 20, // 40 * 50 / 100
    });
  });

  it('sums weighted column to total weighted progress', () => {
    const rows: WeightingRow[] = [
      { key: 'a', wbs: '1.1', activity: 'A', weight: 60, completion: 80, weighted: 48 },
      { key: 'b', wbs: '1.2', activity: 'B', weight: 40, completion: 50, weighted: 20 },
    ];
    expect(getTotalWeightedProgress(rows)).toBe(68);
  });

  it('returns 0 for empty row list', () => {
    expect(getTotalWeightedProgress([])).toBe(0);
  });
});

describe('deriveProjectScheduleHealth', () => {
  // Evaluation date is 2026-03-17.

  it('returns on_schedule when no executable tasks exist', () => {
    expect(deriveProjectScheduleHealth([])).toBe('on_schedule');
    expect(deriveProjectScheduleHealth([makeTask({ type: 'project' })])).toBe('on_schedule');
  });

  it('returns on_schedule when all tasks are completed', () => {
    const tasks = [
      makeTask({ id: 1, type: 'task', progress: 1, start_date: '2026-01-01', end_date: '2026-02-01' }),
    ];
    expect(deriveProjectScheduleHealth(tasks)).toBe('on_schedule');
  });

  it('returns delayed when a task is past its end date and incomplete', () => {
    const tasks = [
      makeTask({
        id: 1,
        type: 'task',
        progress: 0.5,
        start_date: '2026-01-01',
        end_date: '2026-02-01', // before 2026-03-17 → delayed
      }),
    ];
    expect(deriveProjectScheduleHealth(tasks)).toBe('delayed');
  });

  it('returns watch when due-soon (within 7 days) but on track', () => {
    // start=2026-01-01, end=2026-03-22 (5 days after eval), progress=0.97 →
    // forecastFinish lands before end → no slip → due-soon branch fires.
    const tasks = [
      makeTask({
        id: 1,
        type: 'task',
        progress: 0.97,
        start_date: '2026-01-01',
        end_date: '2026-03-22',
      }),
    ];
    expect(deriveProjectScheduleHealth(tasks)).toBe('watch');
  });

  it('returns delayed when forecast slip exceeds WATCH_SLIP_DAYS (3)', () => {
    // start=2026-01-01, end=2026-03-22, progress=0.9 → forecast slips 4 days
    const tasks = [
      makeTask({
        id: 1,
        type: 'task',
        progress: 0.9,
        start_date: '2026-01-01',
        end_date: '2026-03-22',
      }),
    ];
    expect(deriveProjectScheduleHealth(tasks)).toBe('delayed');
  });

  it('returns on_schedule when far from end date with steady progress', () => {
    const tasks = [
      makeTask({
        id: 1,
        type: 'task',
        progress: 0.95,
        start_date: '2026-01-01',
        end_date: '2026-12-31', // far in future
      }),
    ];
    expect(deriveProjectScheduleHealth(tasks)).toBe('on_schedule');
  });

  it('promotes "not_started" group to on_schedule (project-level mapping)', () => {
    // Task hasn't started yet (start_date after eval date) → group is not_started
    // → project-level mapping returns on_schedule
    const tasks = [
      makeTask({
        id: 1,
        type: 'task',
        progress: 0,
        start_date: '2026-06-01',
        end_date: '2026-08-01',
      }),
    ];
    expect(deriveProjectScheduleHealth(tasks)).toBe('on_schedule');
  });

  it('escalates to delayed when any task is delayed even if others are on_schedule', () => {
    const tasks = [
      makeTask({
        id: 1,
        type: 'task',
        progress: 0.5,
        start_date: '2026-01-01',
        end_date: '2026-02-01', // delayed
      }),
      makeTask({
        id: 2,
        type: 'task',
        progress: 1,
        start_date: '2026-01-01',
        end_date: '2026-02-01',
      }),
    ];
    expect(deriveProjectScheduleHealth(tasks)).toBe('delayed');
  });
});

describe('deriveAutoProjectStatus', () => {
  const sampleTasks: GanttTask[] = [
    makeTask({ id: 1, type: 'task', progress: 0.5 }),
  ];

  const manualStatuses: ProjectStatus[] = ['draft', 'on_hold', 'cancelled'];

  it.each(manualStatuses)('preserves manual status %s regardless of progress', (status) => {
    expect(deriveAutoProjectStatus(status, 1, sampleTasks)).toBe(status);
  });

  it('returns completed when progress ratio >= 1', () => {
    expect(deriveAutoProjectStatus('in_progress', 1, [])).toBe('completed');
    expect(deriveAutoProjectStatus('in_progress', 1.5, [])).toBe('completed');
  });

  it('returns completed when every executable task is complete', () => {
    const allDone = [
      makeTask({ id: 1, type: 'task', progress: 1 }),
      makeTask({ id: 2, type: 'task', progress: 1 }),
      makeTask({ id: 3, type: 'project', progress: 0.5 }), // ignored (non-executable)
    ];
    expect(deriveAutoProjectStatus('in_progress', 0.5, allDone)).toBe('completed');
  });

  it('returns in_progress when progressRatio > 0', () => {
    expect(deriveAutoProjectStatus('planning', 0.25, [])).toBe('in_progress');
  });

  it('returns in_progress when any executable task has progress > 0', () => {
    const tasks = [makeTask({ id: 1, type: 'task', progress: 0.1 })];
    expect(deriveAutoProjectStatus('planning', 0, tasks)).toBe('in_progress');
  });

  it('returns planning when nothing has started', () => {
    expect(deriveAutoProjectStatus('planning', 0, [])).toBe('planning');
    expect(
      deriveAutoProjectStatus('planning', 0, [makeTask({ id: 1, type: 'task', progress: 0 })]),
    ).toBe('planning');
  });

  it('clamps a negative progressRatio to 0 (no early "completed")', () => {
    expect(deriveAutoProjectStatus('planning', -1, [])).toBe('planning');
  });
});
