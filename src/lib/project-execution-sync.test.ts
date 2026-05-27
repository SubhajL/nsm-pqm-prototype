import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WBSNode } from '@/hooks/useWBS';
import { syncProjectExecutionState } from '@/lib/project-execution-sync';
import type { GanttData, GanttTask } from '@/types/gantt';
import type { Milestone, Project } from '@/types/project';

// ---------------------------------------------------------------------------
// Characterization tests for syncProjectExecutionState.
//
// The dependency stores read from `globalThis.__nsm*Store` (lazy singletons).
// We populate those globals BEFORE the SUT is called so the test owns the world.
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __nsmWbsStore: WBSNode[] | undefined;
  // eslint-disable-next-line no-var
  var __nsmProjectStore: Project[] | undefined;
  // eslint-disable-next-line no-var
  var __nsmGanttStore: Record<string, GanttData> | undefined;
  // eslint-disable-next-line no-var
  var __nsmMilestoneStore: Milestone[] | undefined;
}

const PROJECT_ID = 'P-SYNC';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: PROJECT_ID,
    code: 'PJ-TEST',
    name: 'Test Project',
    nameEn: 'Test Project',
    type: 'construction',
    executionModel: 'in_house',
    sizeTier: 'medium',
    status: 'planning',
    budget: 1_000_000,
    progress: 0,
    scheduleHealth: 'on_schedule',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    duration: 365,
    spiValue: 1,
    cpiValue: 1,
    managerId: 'm-1',
    managerName: 'Manager',
    departmentId: 'd-1',
    departmentName: 'Department',
    openIssues: 0,
    highRisks: 0,
    currentMilestone: 0,
    totalMilestones: 0,
    currentLifecycleStage: 'planning',
    lifecycleStageHistory: [
      {
        stage: 'planning',
        enteredAt: '2026-01-01T00:00:00.000Z',
        enteredBy: null,
        artifactDocIds: [],
      },
    ],
    ...overrides,
  };
}

function makeWbsNode(overrides: Partial<WBSNode>): WBSNode {
  return {
    id: overrides.id ?? '',
    projectId: overrides.projectId ?? PROJECT_ID,
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

function seedStores(args: {
  project?: Project;
  wbs?: WBSNode[];
  gantt?: GanttData;
  milestones?: Milestone[];
}) {
  globalThis.__nsmProjectStore = args.project ? [args.project] : [];
  globalThis.__nsmWbsStore = args.wbs ?? [];
  globalThis.__nsmGanttStore = {
    [PROJECT_ID]: args.gantt ?? { data: [], links: [] },
  };
  globalThis.__nsmMilestoneStore = args.milestones ?? [];
}

beforeEach(() => {
  globalThis.__nsmProjectStore = undefined;
  globalThis.__nsmWbsStore = undefined;
  globalThis.__nsmGanttStore = undefined;
  globalThis.__nsmMilestoneStore = undefined;
});

afterEach(() => {
  globalThis.__nsmProjectStore = undefined;
  globalThis.__nsmWbsStore = undefined;
  globalThis.__nsmGanttStore = undefined;
  globalThis.__nsmMilestoneStore = undefined;
});

describe('syncProjectExecutionState — no-op cases', () => {
  it('returns early without mutation when project is missing from the store', () => {
    seedStores({ project: undefined, wbs: [], gantt: { data: [], links: [] } });
    expect(() => syncProjectExecutionState(PROJECT_ID)).not.toThrow();
    expect(globalThis.__nsmProjectStore).toEqual([]);
  });
});

describe('syncProjectExecutionState — empty WBS', () => {
  it('derives progress from average gantt task progress when no WBS nodes exist', () => {
    const project = makeProject({ progress: 0.1, status: 'planning' });
    const gantt: GanttData = {
      data: [
        makeTask({ id: 1, type: 'task', progress: 0.5 }),
        makeTask({ id: 2, type: 'task', progress: 0.25 }),
      ],
      links: [],
    };
    seedStores({ project, gantt });

    syncProjectExecutionState(PROJECT_ID);

    const updated = globalThis.__nsmProjectStore![0];
    expect(updated.progress).toBeCloseTo(0.375, 5);
    expect(updated.status).toBe('in_progress'); // hasStarted via progressRatio > 0
    expect(updated.scheduleHealth).toBe('on_schedule');
    expect(updated.openIssues).toBe(0);
    expect(updated.highRisks).toBe(0);
    expect(updated.totalMilestones).toBe(0);
    expect(updated.currentMilestone).toBe(0);
  });

  it('preserves project.progress unchanged when WBS is empty AND no executable tasks', () => {
    const project = makeProject({ progress: 0.42 });
    seedStores({ project, gantt: { data: [], links: [] } });

    syncProjectExecutionState(PROJECT_ID);

    expect(globalThis.__nsmProjectStore![0].progress).toBe(0.42);
  });
});

describe('syncProjectExecutionState — populated WBS', () => {
  it('derives progress from weighted level-1 WBS nodes and updates root', () => {
    const project = makeProject();
    const wbs: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
      makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 60, progress: 80 }),
      makeWbsNode({ id: 'b', code: '1.2', level: 1, parentId: 'r', weight: 40, progress: 50 }),
    ];
    seedStores({ project, wbs, gantt: { data: [], links: [] } });

    syncProjectExecutionState(PROJECT_ID);

    const updated = globalThis.__nsmProjectStore![0];
    // weighted progress = (80*60 + 50*40)/100 = 68 → progressRatio = 0.68
    expect(updated.progress).toBeCloseTo(0.68, 5);
    expect(updated.status).toBe('in_progress');
    // Root node gets weighted progress assigned
    const root = globalThis.__nsmWbsStore!.find((n) => n.id === 'r');
    expect(root?.progress).toBeCloseTo(68, 5);
  });

  it('sets status to completed when WBS weighted progress is 100%', () => {
    const project = makeProject({ status: 'in_progress' });
    const wbs: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
      makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 100, progress: 100 }),
    ];
    seedStores({ project, wbs, gantt: { data: [], links: [] } });

    syncProjectExecutionState(PROJECT_ID);

    expect(globalThis.__nsmProjectStore![0].progress).toBe(1);
    expect(globalThis.__nsmProjectStore![0].status).toBe('completed');
  });
});

describe('syncProjectExecutionState — updatedTask option', () => {
  it('applies a matched task progress to a WBS leaf and propagates to ancestors', () => {
    const project = makeProject();
    const wbs: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
      makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 100, progress: 0 }),
      makeWbsNode({
        id: 'a1',
        code: '1.1.1',
        level: 2,
        parentId: 'a',
        weight: 100,
        progress: 0,
        name: 'Pour concrete',
      }),
    ];
    seedStores({ project, wbs, gantt: { data: [], links: [] } });

    const updatedTask = makeTask({
      id: 100,
      type: 'task',
      progress: 0.6,
      text: 'Pour concrete',
    });

    syncProjectExecutionState(PROJECT_ID, { updatedTask });

    const leaf = globalThis.__nsmWbsStore!.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(60);
    const project1 = globalThis.__nsmProjectStore![0];
    // Level 1 weighted progress = 60% → progressRatio = 0.6
    expect(project1.progress).toBeCloseTo(0.6, 5);
  });

  it('ignores updatedTask whose type is not "task"', () => {
    const project = makeProject();
    const wbs: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
      makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 100, progress: 25 }),
      makeWbsNode({
        id: 'a1',
        code: '1.1.1',
        level: 2,
        parentId: 'a',
        weight: 100,
        progress: 25,
        name: 'Phase 1',
      }),
    ];
    seedStores({ project, wbs, gantt: { data: [], links: [] } });

    const phaseTask = makeTask({
      id: 100,
      type: 'project',
      progress: 0.99,
      text: 'Phase 1',
    });

    syncProjectExecutionState(PROJECT_ID, { updatedTask: phaseTask });

    const leaf = globalThis.__nsmWbsStore!.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(25); // untouched
  });

  it('ignores updatedTask when text does not match any WBS leaf', () => {
    const project = makeProject();
    const wbs: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
      makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 100, progress: 30 }),
      makeWbsNode({
        id: 'a1',
        code: '1.1.1',
        level: 2,
        parentId: 'a',
        weight: 100,
        progress: 30,
        name: 'Existing leaf',
      }),
    ];
    seedStores({ project, wbs, gantt: { data: [], links: [] } });

    const updatedTask = makeTask({
      id: 200,
      type: 'task',
      progress: 0.9,
      text: 'Unrelated task name',
    });

    syncProjectExecutionState(PROJECT_ID, { updatedTask });

    const leaf = globalThis.__nsmWbsStore!.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(30); // untouched
  });
});

describe('syncProjectExecutionState — deletedTask option', () => {
  it('resets the matched WBS leaf progress to 0 and propagates to ancestors', () => {
    const project = makeProject();
    const wbs: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
      makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 100, progress: 80 }),
      makeWbsNode({
        id: 'a1',
        code: '1.1.1',
        level: 2,
        parentId: 'a',
        weight: 100,
        progress: 80,
        name: 'Pour concrete',
      }),
    ];
    seedStores({ project, wbs, gantt: { data: [], links: [] } });

    const deletedTask = makeTask({
      id: 100,
      type: 'task',
      progress: 0.8,
      text: 'Pour concrete',
    });

    syncProjectExecutionState(PROJECT_ID, { deletedTask });

    const leaf = globalThis.__nsmWbsStore!.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(0);
    expect(globalThis.__nsmProjectStore![0].progress).toBe(0);
  });

  it('ignores deletedTask of non-task type', () => {
    const project = makeProject();
    const wbs: WBSNode[] = [
      makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
      makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 100, progress: 60 }),
      makeWbsNode({
        id: 'a1',
        code: '1.1.1',
        level: 2,
        parentId: 'a',
        weight: 100,
        progress: 60,
        name: 'Phase 1',
      }),
    ];
    seedStores({ project, wbs, gantt: { data: [], links: [] } });

    const deletedPhase = makeTask({
      id: 100,
      type: 'project',
      progress: 0.6,
      text: 'Phase 1',
    });

    syncProjectExecutionState(PROJECT_ID, { deletedTask: deletedPhase });

    const leaf = globalThis.__nsmWbsStore!.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(60); // untouched
  });
});
