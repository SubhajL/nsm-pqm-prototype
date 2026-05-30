/**
 * Pure (client-safe) milestone derivation helpers. No repository access.
 */
import type { GanttTask } from '@/types/gantt';
import type { Milestone } from '@/types/project';

export function deriveMilestoneStatusFromTask(
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
