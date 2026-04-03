import { getGanttDataForProject } from '@/lib/gantt-store';
import { getMilestoneStore } from '@/lib/milestone-store';
import type { GanttTask } from '@/types/gantt';
import type { Milestone } from '@/types/project';

function deriveMilestoneStatusFromTask(
  milestoneTask: GanttTask,
  allTasks: GanttTask[],
): Milestone['status'] {
  if (milestoneTask.progress >= 1) {
    return 'completed';
  }

  if (milestoneTask.type === 'project') {
    return milestoneTask.progress > 0 ? 'in_progress' : 'pending';
  }

  const parentTask = allTasks.find((task) => task.id === milestoneTask.parent);
  if ((parentTask?.progress ?? 0) >= 1) {
    return 'review';
  }
  if ((parentTask?.progress ?? 0) > 0) {
    return 'in_progress';
  }

  return 'pending';
}

function findMilestoneTask(
  milestone: Milestone,
  allTasks: GanttTask[],
  fallbackIndex: number,
) {
  const exactTask = allTasks.find((task) => task.text === milestone.name);
  if (exactTask) {
    return exactTask;
  }

  const topLevelPhase = allTasks
    .filter((task) => task.parent === 0 && task.type === 'project')
    .sort((left, right) => left.start_date.localeCompare(right.start_date))[fallbackIndex];

  return topLevelPhase ?? null;
}

export function getDerivedMilestonesForProject(projectId: string): Milestone[] {
  const baseMilestones = getMilestoneStore()
    .filter((milestone) => milestone.projectId === projectId)
    .sort((left, right) => left.number - right.number);
  const ganttTasks = getGanttDataForProject(projectId).data;

  return baseMilestones.map((milestone, index) => {
    const matchedTask = findMilestoneTask(milestone, ganttTasks, index);

    if (!matchedTask) {
      return milestone;
    }

    return {
      ...milestone,
      dueDate: matchedTask.end_date,
      status: deriveMilestoneStatusFromTask(matchedTask, ganttTasks),
    };
  });
}

export function deriveCurrentMilestoneNumber(milestones: Milestone[]) {
  if (milestones.length === 0) {
    return 0;
  }

  const reviewMilestone = milestones.find((milestone) => milestone.status === 'review');
  if (reviewMilestone) {
    return reviewMilestone.number;
  }

  const inProgressMilestone = milestones.find((milestone) => milestone.status === 'in_progress');
  if (inProgressMilestone) {
    return inProgressMilestone.number;
  }

  const completedCount = milestones.filter((milestone) => milestone.status === 'completed').length;
  if (completedCount === milestones.length) {
    return milestones[milestones.length - 1]?.number ?? milestones.length;
  }

  return completedCount === 0 ? 0 : completedCount + 1;
}
