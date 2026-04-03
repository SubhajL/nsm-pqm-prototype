import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const projectDemoStateFile =
  process.env.PROJECT_DEMO_STATE_FILE ??
  path.join(process.cwd(), '.data', 'project-demo-state.json');

interface CreatedProjectResponse {
  status: 'success';
  data: {
    id: string;
    name: string;
    managerId: string;
  };
}

interface DemoStateSnapshot {
  projects: Array<{
    id: string;
    name: string;
  }>;
  projectMemberships: Array<{
    projectId: string;
    userId: string;
  }>;
  wbs: Array<{
    projectId: string;
  }>;
  ganttByProject: Record<string, { data: Array<{ id: number }> }>;
  documentsByProject: Record<string, { folders: Array<{ id: string }> }>;
}

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

async function readSnapshotFile() {
  const contents = await fs.readFile(projectDemoStateFile, 'utf8');
  return JSON.parse(contents) as DemoStateSnapshot;
}

test.describe('project demo state persistence', () => {
  test('writes created project state to durable storage', async ({ page }) => {
    await fs.rm(projectDemoStateFile, { force: true });

    await loginAs(page, 'user-002');

    const projectName = `Persistence Project ${Date.now()}`;
    const createResult = await page.evaluate(async (name) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          nameEn: name,
          type: 'it',
          startDate: '2026-06-01',
          endDate: '2026-12-31',
          budget: 750000,
          managerId: 'user-002',
          managerName: 'น.ส.วิภา ขจรศักดิ์',
          departmentId: 'dept-001',
          departmentName: 'กองแผนงาน',
          duration: 214,
          milestones: [
            {
              milestone: 1,
              amount: 750000,
              percentage: 100,
              deliverable: 'ส่งมอบระบบทั้งหมด',
            },
          ],
        }),
      });

      return {
        statusCode: response.status,
        body: (await response.json()) as CreatedProjectResponse,
      };
    }, projectName);

    expect(createResult.statusCode).toBe(201);

    await expect
      .poll(async () => {
        try {
          await fs.access(projectDemoStateFile);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    const snapshot = await readSnapshotFile();
    const projectId = createResult.body.data.id;

    expect(snapshot.projects.some((project) => project.id === projectId && project.name === projectName)).toBe(true);
    expect(
      snapshot.projectMemberships.some(
        (membership) =>
          membership.projectId === projectId && membership.userId === createResult.body.data.managerId,
      ),
    ).toBe(true);
    expect(snapshot.wbs.some((node) => node.projectId === projectId)).toBe(true);
    expect(snapshot.ganttByProject[projectId]?.data.length ?? 0).toBeGreaterThan(0);
    expect(snapshot.documentsByProject[projectId]?.folders.length ?? 0).toBeGreaterThan(0);
  });
});
