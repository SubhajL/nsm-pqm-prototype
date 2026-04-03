import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

type GanttTaskPayload = {
  id: number;
  text: string;
  end_date: string;
  progress: number;
  type: string;
  parent: number;
};

type MilestonePayload = {
  name: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  number: number;
};

type ProjectDetailPayload = {
  startDate: string;
  endDate: string;
  duration: number;
  currentMilestone: number;
};

type WbsNodePayload = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  weight: number;
  progress: number;
  level: number;
};

test.describe('project milestone consistency', () => {
  test('overview milestone API stays consistent with Gantt execution for all projects', async ({
    page,
  }) => {
    await loginAs(page, 'user-001');

    const projects = await page.evaluate(async () => {
      const response = await fetch('/api/projects');
      const payload = await response.json();
      return payload.data.map((project: { id: string }) => project.id);
    });

    for (const projectId of projects as string[]) {
      const ganttPayload = await page.evaluate(async (currentProjectId) => {
        const response = await fetch(`/api/gantt/${currentProjectId}`);
        const payload = await response.json();
        return payload.data.data as GanttTaskPayload[];
      }, projectId);

      const milestonePayload = await page.evaluate(async (currentProjectId) => {
        const response = await fetch(`/api/milestones/${currentProjectId}`);
        const payload = await response.json();
        return payload.data as MilestonePayload[];
      }, projectId);
      const projectDetail = await page.evaluate(async (currentProjectId) => {
        const response = await fetch(`/api/projects/${currentProjectId}`);
        const payload = await response.json();
        return payload.data as ProjectDetailPayload;
      }, projectId);
      const wbsPayload = await page.evaluate(async (currentProjectId) => {
        const response = await fetch(`/api/wbs/${currentProjectId}`);
        const payload = await response.json();
        return payload.data as WbsNodePayload[];
      }, projectId);

      for (const milestone of milestonePayload) {
        const matchedTask = ganttPayload.find((task) => task.text === milestone.name);
        expect(matchedTask, `${projectId} missing Gantt task for ${milestone.name}`).toBeTruthy();

        expect(milestone.dueDate).toBe(matchedTask!.end_date);

        let expectedStatus: MilestonePayload['status'] = 'pending';
        if (matchedTask!.progress >= 1) {
          expectedStatus = 'completed';
        } else if (matchedTask!.type === 'project') {
          expectedStatus = matchedTask!.progress > 0 ? 'in_progress' : 'pending';
        } else {
          const parentTask = ganttPayload.find((task) => task.id === matchedTask!.parent);
          if ((parentTask?.progress ?? 0) >= 1) {
            expectedStatus = 'review';
          } else if ((parentTask?.progress ?? 0) > 0) {
            expectedStatus = 'in_progress';
          }
        }

        expect(milestone.status).toBe(expectedStatus);
      }

      const topLevelPhaseTasks = ganttPayload.filter(
        (task) => task.parent === 0 && task.type === 'project',
      );

      const reviewMilestone = milestonePayload.find((milestone) => milestone.status === 'review');
      const inProgressMilestone = milestonePayload.find(
        (milestone) => milestone.status === 'in_progress',
      );
      const completedMilestones = milestonePayload.filter(
        (milestone) => milestone.status === 'completed',
      );

      let expectedCurrentMilestone = 0;
      if (reviewMilestone) {
        expectedCurrentMilestone = reviewMilestone.number;
      } else if (inProgressMilestone) {
        expectedCurrentMilestone = inProgressMilestone.number;
      } else if (completedMilestones.length === milestonePayload.length) {
        expectedCurrentMilestone =
          milestonePayload[milestonePayload.length - 1]?.number ?? milestonePayload.length;
      } else if (completedMilestones.length > 0) {
        expectedCurrentMilestone = completedMilestones.length + 1;
      }

      expect(projectDetail.currentMilestone).toBe(expectedCurrentMilestone);

      const sortedTopLevelPhases = topLevelPhaseTasks.sort((left, right) =>
        left.end_date.localeCompare(right.end_date),
      );
      const level1WbsNodes = wbsPayload
        .filter((node) => node.level === 1)
        .sort((left, right) => left.code.localeCompare(right.code));
      const level2WbsNodes = wbsPayload
        .filter((node) => node.level === 2)
        .sort((left, right) => left.code.localeCompare(right.code));

      expect(level1WbsNodes.length).toBe(sortedTopLevelPhases.length);

      for (let index = 0; index < sortedTopLevelPhases.length; index += 1) {
        const phaseTask = sortedTopLevelPhases[index];
        const wbsNode = level1WbsNodes[index];
        expect(wbsNode, `${projectId} missing level-1 WBS node for phase index ${index}`).toBeTruthy();
        expect(wbsNode.progress).toBeCloseTo(phaseTask.progress * 100, 2);
      }

      for (const wbsLeafNode of level2WbsNodes) {
        const matchedTask = ganttPayload.find(
          (task) => task.type === 'task' && task.text === wbsLeafNode.name,
        );
        expect(
          matchedTask,
          `${projectId} missing Gantt task for WBS leaf ${wbsLeafNode.code} ${wbsLeafNode.name}`,
        ).toBeTruthy();
        expect(wbsLeafNode.progress).toBeCloseTo((matchedTask?.progress ?? 0) * 100, 2);
      }

      const rootWbsNode = wbsPayload.find((node) => node.level === 0);
      expect(rootWbsNode, `${projectId} missing WBS root`).toBeTruthy();
      const expectedRootProgress =
        level1WbsNodes.reduce((sum, node) => sum + node.progress * node.weight, 0) / 100;
      expect(rootWbsNode!.progress).toBeCloseTo(expectedRootProgress, 2);

      const lastPhaseEndDate =
        sortedTopLevelPhases[sortedTopLevelPhases.length - 1]?.end_date;

      expect(lastPhaseEndDate, `${projectId} should have at least one top-level Gantt phase`).toBeTruthy();
      expect(projectDetail.endDate).toBe(lastPhaseEndDate!);

      const start = new Date(projectDetail.startDate);
      const end = new Date(projectDetail.endDate);
      const inclusiveDuration =
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      expect(projectDetail.duration).toBe(inclusiveDuration);
    }
  });
});
