import seedGanttData from '@/data/gantt-tasks.json';
import { generatedGanttDataByProject } from '@/lib/generated-project-data';
import { getWbsStore } from '@/lib/wbs-store';
import type { GanttData, GanttLink, GanttLinkType, GanttTask } from '@/types/gantt';

declare global {
  // eslint-disable-next-line no-var
  var __nsmGanttStore: Record<string, GanttData> | undefined;
}

function cloneTask(task: GanttTask): GanttTask {
  return { ...task };
}

function cloneLink(link: GanttLink): GanttLink {
  return {
    ...link,
    type: normalizeLinkType(link.type),
    lagDays: Number(link.lagDays ?? 0) || 0,
  };
}

function normalizeLinkType(type: string | undefined): GanttLinkType {
  switch (type) {
    case '1':
    case 'SS':
      return 'SS';
    case '2':
    case 'FF':
      return 'FF';
    case '3':
    case 'SF':
      return 'SF';
    case '0':
    case 'FS':
    default:
      return 'FS';
  }
}

function cloneProjectData(data: GanttData): GanttData {
  return {
    data: data.data.map(cloneTask),
    links: data.links.map(cloneLink),
  };
}

function normalizeParentTaskProgress(data: GanttData) {
  const projectId = Object.entries(getGanttStore()).find(
    ([, projectData]) => projectData === data,
  )?.[0];

  if (!projectId) {
    return;
  }

  const wbsLevel1Nodes = getWbsStore()
    .filter((node) => node.projectId === projectId && node.level === 1)
    .sort((left, right) => left.code.localeCompare(right.code, 'th'));
  const topLevelPhaseTasks = data.data
    .filter((task) => task.parent === 0 && task.type === 'project')
    .sort((left, right) => left.start_date.localeCompare(right.start_date));

  if (wbsLevel1Nodes.length !== topLevelPhaseTasks.length) {
    return;
  }

  topLevelPhaseTasks.forEach((task, index) => {
    task.progress = Math.min(1, Math.max(0, wbsLevel1Nodes[index].progress / 100));
  });
}

function createSeedStore(): Record<string, GanttData> {
  return {
    'proj-001': cloneProjectData(seedGanttData as GanttData),
    ...Object.fromEntries(
      Object.entries(generatedGanttDataByProject).map(([projectId, data]) => [
        projectId,
        cloneProjectData(data),
      ]),
    ),
  };
}

export function getGanttStore() {
  if (!globalThis.__nsmGanttStore) {
    globalThis.__nsmGanttStore = createSeedStore();
  }

  return globalThis.__nsmGanttStore;
}

export function getGanttDataForProject(projectId: string) {
  const store = getGanttStore();

  if (!store[projectId]) {
    store[projectId] = { data: [], links: [] };
  }

  normalizeParentTaskProgress(store[projectId]);

  return store[projectId];
}

export function getNextGanttTaskId(projectId: string) {
  const projectData = getGanttDataForProject(projectId);
  const maxTaskId = projectData.data.reduce(
    (max, task) => Math.max(max, Number(task.id) || 0),
    0,
  );
  const maxLinkId = projectData.links.reduce(
    (max, link) => Math.max(max, Number(link.id) || 0),
    0,
  );

  return Math.max(maxTaskId, maxLinkId) + 1;
}
