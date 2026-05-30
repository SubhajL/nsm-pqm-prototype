import { getRepositories } from '@/lib/repositories';
import type { GanttTask } from '@/types/gantt';
import type { Milestone } from '@/types/project';

import { deriveMilestoneStatusFromTask } from './project-milestone-derivations-pure';

export { deriveCurrentMilestoneNumber } from './project-milestone-derivations-pure';

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

export async function getDerivedMilestonesForProject(projectId: string): Promise<Milestone[]> {
  const repos = getRepositories();
  const allMilestones = await repos.milestones.list();
  const baseMilestones = allMilestones
    .filter((milestone) => milestone.projectId === projectId)
    .sort((left, right) => left.number - right.number);
  const ganttTasks = (await repos.gantt.getProjectData(projectId)).data;

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
