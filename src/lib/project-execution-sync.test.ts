import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WBSNode } from '@/hooks/useWBS';
import { syncProjectExecutionState } from '@/lib/project-execution-sync';
import {
  __resetRepositoriesForTesting,
  __setRepositoriesForTesting,
  type RepositoryRegistry,
} from '@/lib/repositories';
import type { GanttData, GanttTask } from '@/types/gantt';
import type { Milestone, Project } from '@/types/project';

// ---------------------------------------------------------------------------
// Characterization tests for syncProjectExecutionState (PR-21b rewrite).
//
// The implementation is now async + repo-backed. We inject a minimal fake
// registry that supports just the surface the sync helper needs.
// ---------------------------------------------------------------------------

const PROJECT_ID = 'P-SYNC';

interface FakeState {
  projects: Project[];
  wbs: WBSNode[];
  ganttByProject: Record<string, GanttData>;
  milestones: Milestone[];
}

function buildRegistry(state: FakeState): RepositoryRegistry {
  // Only the methods exercised by syncProjectExecutionState + the milestone
  // derivation helper need real bodies. The rest are stub-throwers so a
  // surprise call is caught loudly.
  const reject = (name: string) =>
    () => {
      throw new Error(`unexpected repo call: ${name}`);
    };

  return {
    projects: {
      list: async () => state.projects,
      findById: async (id: string) =>
        state.projects.find((p) => p.id === id) ?? null,
      create: reject('projects.create'),
      update: async (id: string, patch: Partial<Project>) => {
        const idx = state.projects.findIndex((p) => p.id === id);
        if (idx < 0) return null;
        state.projects[idx] = { ...state.projects[idx], ...patch };
        return state.projects[idx];
      },
      delete: reject('projects.delete'),
      all: async () => state.projects,
    },
    wbs: {
      list: async () => state.wbs,
      listByProject: async (pid: string) => state.wbs.filter((n) => n.projectId === pid),
      findById: async (id: string) => state.wbs.find((n) => n.id === id) ?? null,
      create: reject('wbs.create'),
      update: async (id: string, patch: Partial<WBSNode>) => {
        const idx = state.wbs.findIndex((n) => n.id === id);
        if (idx < 0) return null;
        state.wbs[idx] = { ...state.wbs[idx], ...patch };
        return state.wbs[idx];
      },
      delete: reject('wbs.delete'),
    },
    gantt: {
      getProjectData: async (pid: string) =>
        state.ganttByProject[pid] ?? { data: [], links: [] },
      nextTaskId: reject('gantt.nextTaskId'),
      replaceProjectData: async (pid, data) => {
        state.ganttByProject[pid] = data;
        return data;
      },
      allByProject: async () => state.ganttByProject,
    },
    milestones: {
      list: async () => state.milestones,
      listByProject: async (pid: string) =>
        state.milestones.filter((m) => m.projectId === pid),
      findById: async (id: string) => state.milestones.find((m) => m.id === id) ?? null,
      create: reject('milestones.create'),
      update: reject('milestones.update'),
      delete: reject('milestones.delete'),
    },
    // Domains the sync helper never touches.
    boq: {} as RepositoryRegistry['boq'],
    changeRequests: {} as RepositoryRegistry['changeRequests'],
    dailyReports: {} as RepositoryRegistry['dailyReports'],
    documents: {} as RepositoryRegistry['documents'],
    evm: {} as RepositoryRegistry['evm'],
    issues: {} as RepositoryRegistry['issues'],
    notifications: {} as RepositoryRegistry['notifications'],
    orgStructure: {} as RepositoryRegistry['orgStructure'],
    qualityGates: {} as RepositoryRegistry['qualityGates'],
    qualityInspections: {} as RepositoryRegistry['qualityInspections'],
    risks: {} as RepositoryRegistry['risks'],
    teamMemberships: {} as RepositoryRegistry['teamMemberships'],
    users: {} as RepositoryRegistry['users'],
    auditEvents: {} as RepositoryRegistry['auditEvents'],
    // PR-25 — compliance registers (sync helper never touches them).
    permits: {} as RepositoryRegistry['permits'],
    environmentalAssessments: {} as RepositoryRegistry['environmentalAssessments'],
    publicHearings: {} as RepositoryRegistry['publicHearings'],
    landAcquisitionRecords: {} as RepositoryRegistry['landAcquisitionRecords'],
    // PR-27 — project-approval workflow (sync helper never touches it).
    projectApprovalRequests:
      {} as RepositoryRegistry['projectApprovalRequests'],
    // PR-24 — procurement / contract domain (sync helper never touches them).
    procurementPackages: {} as RepositoryRegistry['procurementPackages'],
    torDocuments: {} as RepositoryRegistry['torDocuments'],
    engineeringEstimates: {} as RepositoryRegistry['engineeringEstimates'],
    awardedContracts: {} as RepositoryRegistry['awardedContracts'],
    contractAmendments: {} as RepositoryRegistry['contractAmendments'],
    contractorPrequalifications:
      {} as RepositoryRegistry['contractorPrequalifications'],
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: PROJECT_ID,
    code: 'PJ-TEST',
    name: 'Test Project',
    nameEn: 'Test Project',
    projectClass: 'construction',
    deliveryMethod: 'in_house',
    contractingModel: null,
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

function seed(args: {
  project?: Project;
  wbs?: WBSNode[];
  gantt?: GanttData;
  milestones?: Milestone[];
}): FakeState {
  return {
    projects: args.project ? [args.project] : [],
    wbs: args.wbs ?? [],
    ganttByProject: { [PROJECT_ID]: args.gantt ?? { data: [], links: [] } },
    milestones: args.milestones ?? [],
  };
}

let state: FakeState;

beforeEach(() => {
  state = seed({});
  __setRepositoriesForTesting(buildRegistry(state));
});

afterEach(() => {
  __resetRepositoriesForTesting();
});

describe('syncProjectExecutionState — no-op cases', () => {
  it('returns early without mutation when project is missing from the store', async () => {
    state = seed({ project: undefined, wbs: [], gantt: { data: [], links: [] } });
    __setRepositoriesForTesting(buildRegistry(state));
    await expect(syncProjectExecutionState(PROJECT_ID)).resolves.toBeUndefined();
    expect(state.projects).toEqual([]);
  });
});

describe('syncProjectExecutionState — empty WBS', () => {
  it('derives progress from average gantt task progress when no WBS nodes exist', async () => {
    state = seed({
      project: makeProject({ progress: 0.1, status: 'planning' }),
      gantt: {
        data: [
          makeTask({ id: 1, type: 'task', progress: 0.5 }),
          makeTask({ id: 2, type: 'task', progress: 0.25 }),
        ],
        links: [],
      },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    await syncProjectExecutionState(PROJECT_ID);

    const updated = state.projects[0];
    expect(updated.progress).toBeCloseTo(0.375, 5);
    expect(updated.status).toBe('in_progress');
    expect(updated.scheduleHealth).toBe('on_schedule');
    expect(updated.openIssues).toBe(0);
    expect(updated.highRisks).toBe(0);
    expect(updated.totalMilestones).toBe(0);
    expect(updated.currentMilestone).toBe(0);
  });

  it('preserves project.progress unchanged when WBS is empty AND no executable tasks', async () => {
    state = seed({ project: makeProject({ progress: 0.42 }), gantt: { data: [], links: [] } });
    __setRepositoriesForTesting(buildRegistry(state));

    await syncProjectExecutionState(PROJECT_ID);

    expect(state.projects[0].progress).toBe(0.42);
  });
});

describe('syncProjectExecutionState — populated WBS', () => {
  it('derives progress from weighted level-1 WBS nodes and updates root', async () => {
    state = seed({
      project: makeProject(),
      wbs: [
        makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
        makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 60, progress: 80 }),
        makeWbsNode({ id: 'b', code: '1.2', level: 1, parentId: 'r', weight: 40, progress: 50 }),
      ],
      gantt: { data: [], links: [] },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    await syncProjectExecutionState(PROJECT_ID);

    const updated = state.projects[0];
    expect(updated.progress).toBeCloseTo(0.68, 5);
    expect(updated.status).toBe('in_progress');
    const root = state.wbs.find((n) => n.id === 'r');
    expect(root?.progress).toBeCloseTo(68, 5);
  });

  it('sets status to completed when WBS weighted progress is 100%', async () => {
    state = seed({
      project: makeProject({ status: 'in_progress' }),
      wbs: [
        makeWbsNode({ id: 'r', code: '1', level: 0, parentId: null, weight: 100, progress: 0 }),
        makeWbsNode({ id: 'a', code: '1.1', level: 1, parentId: 'r', weight: 100, progress: 100 }),
      ],
      gantt: { data: [], links: [] },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    await syncProjectExecutionState(PROJECT_ID);

    expect(state.projects[0].progress).toBe(1);
    expect(state.projects[0].status).toBe('completed');
  });
});

describe('syncProjectExecutionState — updatedTask option', () => {
  it('applies a matched task progress to a WBS leaf and propagates to ancestors', async () => {
    state = seed({
      project: makeProject(),
      wbs: [
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
      ],
      gantt: { data: [], links: [] },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    const updatedTask = makeTask({
      id: 100,
      type: 'task',
      progress: 0.6,
      text: 'Pour concrete',
    });

    await syncProjectExecutionState(PROJECT_ID, { updatedTask });

    const leaf = state.wbs.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(60);
    const project1 = state.projects[0];
    expect(project1.progress).toBeCloseTo(0.6, 5);
  });

  it('ignores updatedTask whose type is not "task"', async () => {
    state = seed({
      project: makeProject(),
      wbs: [
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
      ],
      gantt: { data: [], links: [] },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    const phaseTask = makeTask({
      id: 100,
      type: 'project',
      progress: 0.99,
      text: 'Phase 1',
    });

    await syncProjectExecutionState(PROJECT_ID, { updatedTask: phaseTask });

    const leaf = state.wbs.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(25);
  });

  it('ignores updatedTask when text does not match any WBS leaf', async () => {
    state = seed({
      project: makeProject(),
      wbs: [
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
      ],
      gantt: { data: [], links: [] },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    const updatedTask = makeTask({
      id: 200,
      type: 'task',
      progress: 0.9,
      text: 'Unrelated task name',
    });

    await syncProjectExecutionState(PROJECT_ID, { updatedTask });

    const leaf = state.wbs.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(30);
  });
});

describe('syncProjectExecutionState — deletedTask option', () => {
  it('resets the matched WBS leaf progress to 0 and propagates to ancestors', async () => {
    state = seed({
      project: makeProject(),
      wbs: [
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
      ],
      gantt: { data: [], links: [] },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    const deletedTask = makeTask({
      id: 100,
      type: 'task',
      progress: 0.8,
      text: 'Pour concrete',
    });

    await syncProjectExecutionState(PROJECT_ID, { deletedTask });

    const leaf = state.wbs.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(0);
    expect(state.projects[0].progress).toBe(0);
  });

  it('ignores deletedTask of non-task type', async () => {
    state = seed({
      project: makeProject(),
      wbs: [
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
      ],
      gantt: { data: [], links: [] },
    });
    __setRepositoriesForTesting(buildRegistry(state));

    const deletedPhase = makeTask({
      id: 100,
      type: 'project',
      progress: 0.6,
      text: 'Phase 1',
    });

    await syncProjectExecutionState(PROJECT_ID, { deletedTask: deletedPhase });

    const leaf = state.wbs.find((n) => n.id === 'a1');
    expect(leaf?.progress).toBe(60);
  });
});
