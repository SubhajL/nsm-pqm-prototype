import { getGanttDataForProject } from '@/lib/gantt-store';
import { getProjectStore } from '@/lib/project-store';
import {
  buildWeightingRows,
  clampPercent,
  deriveAutoProjectStatus,
  deriveProjectScheduleHealth,
  getExecutableGanttTasks,
  getTotalWeightedProgress,
  normalizeMatchKey,
} from '@/lib/project-progress-derivations';
import {
  deriveCurrentMilestoneNumber,
  getDerivedMilestonesForProject,
} from '@/lib/project-milestone-derivations';
import { getWbsStore } from '@/lib/wbs-store';
import type { GanttTask } from '@/types/gantt';
import type { WBSNode } from '@/hooks/useWBS';

function propagateDeltaToAncestors(
  nodesById: Map<string, WBSNode>,
  startNode: WBSNode,
  leafDeltaPercent: number,
) {
  let currentNode = startNode;
  let currentDelta = leafDeltaPercent;

  while (currentNode.parentId) {
    const parent = nodesById.get(currentNode.parentId);
    if (!parent) break;

    const parentDelta = (currentDelta * currentNode.weight) / 100;
    parent.progress = clampPercent(parent.progress + parentDelta);

    currentNode = parent;
    currentDelta = parentDelta;
  }
}

function findLeafNodeByTaskText(
  projectNodes: WBSNode[],
  taskText: string,
) {
  const leafNodes = projectNodes.filter((node) => node.level >= 2);
  const matchKey = normalizeMatchKey(taskText);
  return leafNodes.find((node) => normalizeMatchKey(node.name) === matchKey);
}

function applyTaskProgressToWbsNode(
  projectNodes: WBSNode[],
  task: GanttTask,
) {
  if (task.type !== 'task') {
    return;
  }

  const matchedNode = findLeafNodeByTaskText(projectNodes, task.text);
  if (!matchedNode) {
    return;
  }

  const nextProgress = clampPercent(task.progress * 100);
  const delta = nextProgress - matchedNode.progress;

  if (Math.abs(delta) < 0.001) {
    return;
  }

  matchedNode.progress = nextProgress;
  const nodesById = new Map(projectNodes.map((node) => [node.id, node]));
  propagateDeltaToAncestors(
    nodesById,
    matchedNode,
    delta,
  );
}

export function syncProjectExecutionState(
  projectId: string,
  options?: { updatedTask?: GanttTask | null; deletedTask?: GanttTask | null },
) {
  const wbsStore = getWbsStore();
  const projectStore = getProjectStore();
  const ganttData = getGanttDataForProject(projectId);
  const projectNodes = wbsStore.filter((node) => node.projectId === projectId);
  const project = projectStore.find((entry) => entry.id === projectId);

  if (!project) {
    return;
  }

  if (options?.updatedTask && projectNodes.length > 0) {
    applyTaskProgressToWbsNode(projectNodes, options.updatedTask);
  }

  if (options?.deletedTask?.type === 'task' && projectNodes.length > 0) {
    const matchedNode = findLeafNodeByTaskText(projectNodes, options.deletedTask.text);
    if (matchedNode) {
      const delta = -matchedNode.progress;
      matchedNode.progress = 0;
      const nodesById = new Map(projectNodes.map((node) => [node.id, node]));
      propagateDeltaToAncestors(
        nodesById,
        matchedNode,
        delta,
      );
    }
  }

  const weightingRows = projectNodes.length > 0 ? buildWeightingRows(projectNodes) : [];
  const weightedProgress = projectNodes.length > 0 ? clampPercent(getTotalWeightedProgress(weightingRows)) : 0;
  const rootNode = projectNodes.find((node) => node.level === 0);
  const executableTasks = getExecutableGanttTasks(ganttData.data);
  let progressRatio = project.progress;

  if (rootNode) {
    rootNode.progress = weightedProgress;
  }

  if (projectNodes.length > 0) {
    progressRatio = weightedProgress / 100;
  } else if (executableTasks.length > 0) {
    progressRatio =
      executableTasks.reduce((sum, task) => sum + task.progress, 0) / executableTasks.length;
  }

  project.progress = progressRatio;
  project.status = deriveAutoProjectStatus(project.status, progressRatio, ganttData.data);
  project.scheduleHealth = deriveProjectScheduleHealth(ganttData.data);
  const derivedMilestones = getDerivedMilestonesForProject(projectId);
  project.totalMilestones = derivedMilestones.length;
  project.currentMilestone = deriveCurrentMilestoneNumber(derivedMilestones);
  project.openIssues = project.openIssues ?? 0;
  project.highRisks = project.highRisks ?? 0;
}
