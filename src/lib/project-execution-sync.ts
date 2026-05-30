import { getRepositories } from '@/lib/repositories';
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
import type { GanttTask } from '@/types/gantt';
import type { WBSNode } from '@/hooks/useWBS';

interface WbsProgressDelta {
  id: string;
  progress: number;
}

function propagateDeltaToAncestors(
  nodesById: Map<string, WBSNode>,
  startNode: WBSNode,
  leafDeltaPercent: number,
  delta: Map<string, number>,
) {
  let currentNode = startNode;
  let currentDelta = leafDeltaPercent;

  while (currentNode.parentId) {
    const parent = nodesById.get(currentNode.parentId);
    if (!parent) break;

    const parentDelta = (currentDelta * currentNode.weight) / 100;
    const nextProgress = clampPercent(parent.progress + parentDelta);
    delta.set(parent.id, nextProgress);
    parent.progress = nextProgress;

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
  delta: Map<string, number>,
) {
  if (task.type !== 'task') return;

  const matchedNode = findLeafNodeByTaskText(projectNodes, task.text);
  if (!matchedNode) return;

  const nextProgress = clampPercent(task.progress * 100);
  const change = nextProgress - matchedNode.progress;

  if (Math.abs(change) < 0.001) return;

  delta.set(matchedNode.id, nextProgress);
  matchedNode.progress = nextProgress;

  const nodesById = new Map(projectNodes.map((node) => [node.id, node]));
  propagateDeltaToAncestors(nodesById, matchedNode, change, delta);
}

/**
 * Recompute derived project state (progress, schedule health, milestone
 * counts, ancestor WBS progress) given the latest gantt + wbs data.
 *
 * PR-21b: now async + repo-aware. Reads gantt + wbs + project rows from
 * the repositories, applies in-memory deltas, then persists the changes
 * through `.update()` calls. The previous implementation mutated store
 * entries in place — that silently no-op'd under Database.
 */
export async function syncProjectExecutionState(
  projectId: string,
  options?: { updatedTask?: GanttTask | null; deletedTask?: GanttTask | null },
): Promise<void> {
  const repos = getRepositories();
  const project = await repos.projects.findById(projectId);
  if (!project) return;

  const projectNodes = (await repos.wbs.list()).filter(
    (node) => node.projectId === projectId,
  );
  // Work against a clone so mutations don't escape unless we persist them.
  const workingNodes = projectNodes.map((node) => ({ ...node }));
  const ganttData = await repos.gantt.getProjectData(projectId);

  const wbsDelta = new Map<string, number>();

  if (options?.updatedTask && workingNodes.length > 0) {
    applyTaskProgressToWbsNode(workingNodes, options.updatedTask, wbsDelta);
  }

  if (options?.deletedTask?.type === 'task' && workingNodes.length > 0) {
    const matchedNode = findLeafNodeByTaskText(workingNodes, options.deletedTask.text);
    if (matchedNode) {
      const change = -matchedNode.progress;
      wbsDelta.set(matchedNode.id, 0);
      matchedNode.progress = 0;
      const nodesById = new Map(workingNodes.map((node) => [node.id, node]));
      propagateDeltaToAncestors(nodesById, matchedNode, change, wbsDelta);
    }
  }

  const weightingRows =
    workingNodes.length > 0 ? buildWeightingRows(workingNodes) : [];
  const weightedProgress =
    workingNodes.length > 0 ? clampPercent(getTotalWeightedProgress(weightingRows)) : 0;
  const rootNode = workingNodes.find((node) => node.level === 0);
  const executableTasks = getExecutableGanttTasks(ganttData.data);
  let progressRatio = project.progress;

  if (rootNode) {
    wbsDelta.set(rootNode.id, weightedProgress);
    rootNode.progress = weightedProgress;
  }

  if (workingNodes.length > 0) {
    progressRatio = weightedProgress / 100;
  } else if (executableTasks.length > 0) {
    progressRatio =
      executableTasks.reduce((sum, task) => sum + task.progress, 0) / executableTasks.length;
  }

  // Persist WBS deltas.
  const wbsWrites: Array<Promise<unknown>> = [];
  const wbsUpdates: WbsProgressDelta[] = [];
  wbsDelta.forEach((progress, id) => {
    wbsUpdates.push({ id, progress });
    wbsWrites.push(repos.wbs.update(id, { progress }));
  });
  await Promise.all(wbsWrites);

  // Compute derived project state.
  const derivedMilestones = await getDerivedMilestonesForProject(projectId);
  const projectPatch = {
    progress: progressRatio,
    status: deriveAutoProjectStatus(project.status, progressRatio, ganttData.data),
    scheduleHealth: deriveProjectScheduleHealth(ganttData.data),
    totalMilestones: derivedMilestones.length,
    currentMilestone: deriveCurrentMilestoneNumber(derivedMilestones),
    openIssues: project.openIssues ?? 0,
    highRisks: project.highRisks ?? 0,
  };

  // Only persist if at least one field changed (cheap, avoids audit noise).
  const changed =
    projectPatch.progress !== project.progress ||
    projectPatch.status !== project.status ||
    projectPatch.scheduleHealth !== project.scheduleHealth ||
    projectPatch.totalMilestones !== project.totalMilestones ||
    projectPatch.currentMilestone !== project.currentMilestone ||
    wbsUpdates.length > 0;
  if (changed) {
    await repos.projects.update(projectId, projectPatch);
  }
}
