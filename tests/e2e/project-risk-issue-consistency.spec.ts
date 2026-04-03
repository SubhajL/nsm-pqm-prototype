import { expect, test } from '@playwright/test';

type Project = {
  id: string;
  name: string;
};

type Risk = {
  id: string;
  title: string;
  status: 'open' | 'mitigating' | 'closed' | 'accepted';
};

type Issue = {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'review' | 'closed';
  sourceRiskId?: string;
};

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

async function getApiData<T>(
  page: import('@playwright/test').Page,
  path: string,
): Promise<T> {
  const response = await page.request.get(`/api${path}`);
  expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
  const payload = (await response.json()) as { data: T };
  return payload.data;
}

test.describe('risk and issue consistency across projects', () => {
  test('every mitigating risk has a corresponding issue visible on the issues page', async ({ page }) => {
    await loginAs(page, 'user-001');

    const projects = await getApiData<Project[]>(page, '/projects');

    for (const project of projects) {
      const risks = await getApiData<Risk[]>(page, `/risks/${project.id}`);
      const mitigatingRisks = risks.filter((risk) => risk.status === 'mitigating');

      if (mitigatingRisks.length === 0) {
        continue;
      }

      const issues = await getApiData<Issue[]>(page, `/issues/${project.id}`);

      await page.goto(`/projects/${project.id}/issues`);

      for (const risk of mitigatingRisks) {
        const linkedIssue = issues.find((issue) => issue.sourceRiskId === risk.id);
        expect(linkedIssue, `${project.id} ${risk.id} should have a linked mitigation issue`).toBeTruthy();
        expect(linkedIssue?.status).toBe('in_progress');
        await expect(page.getByText(linkedIssue!.title, { exact: true })).toBeVisible();
      }
    }
  });
});
