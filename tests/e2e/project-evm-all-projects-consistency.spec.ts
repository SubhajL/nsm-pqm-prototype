import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

function formatBaht(value: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCompactBaht(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M฿`;
  }

  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K฿`;
  }

  return `${sign}${abs.toFixed(0)}฿`;
}

test.describe('project EVM consistency across all seeded projects', () => {
  test('each project EVM page matches its latest snapshot and derived formulas', async ({
    page,
  }) => {
    await loginAs(page, 'user-001');

    const projectsResponse = await page.evaluate(async () => {
      const response = await fetch('/api/projects');
      return response.json();
    });

    const projects = projectsResponse.data as Array<{
      id: string;
      budget: number;
      name: string;
      executionModel?: 'internal' | 'outsourced';
    }>;

    for (const project of projects) {
      const evmResponse = await page.evaluate(async (projectId) => {
        const response = await fetch(`/api/evm/${projectId}`);
        return response.json();
      }, project.id);

      const evmData = (evmResponse.data as Array<{
        monthThai: string;
        month: string;
        pv: number;
        ev: number;
        ac: number;
        paidToDate?: number;
      }>).sort((a, b) => a.month.localeCompare(b.month));

      if (evmData.length === 0) {
        continue;
      }

      const latest = evmData[evmData.length - 1];
      const spi = latest.pv > 0 ? latest.ev / latest.pv : 0;
      const sv = latest.ev - latest.pv;
      const executionModel = project.executionModel ?? 'internal';

      await page.goto(`/projects/${project.id}/s-curve`);
      await expect(page.getByText(`ข้อมูลล่าสุด ณ งวด ${latest.monthThai}`)).toBeVisible();
      await expect(page.getByText(spi.toFixed(2)).first()).toBeVisible();
      await expect(page.getByText(`${formatBaht(latest.pv)} ฿`).first()).toBeVisible();
      await expect(page.getByText(`${formatBaht(latest.ev)} ฿`).first()).toBeVisible();
      await expect(page.getByText(`${formatBaht(sv)} ฿`).first()).toBeVisible();
      await expect(page.getByRole('cell', { name: latest.monthThai, exact: true })).toBeVisible();

      if (executionModel === 'outsourced') {
        const paidToDate = latest.paidToDate ?? latest.ac;
        const paymentGap = latest.ev - paidToDate;
        const remainingPayable = project.budget - paidToDate;

        await expect(page.getByRole('columnheader', { name: 'Paid to Date' })).toBeVisible();
        await expect(page.getByText('CPI (Cost Performance Index)')).toHaveCount(0);
        await expect(page.getByText('EAC (Estimate at Completion)')).toHaveCount(0);
        await expect(page.getByText(`${formatBaht(paidToDate)} ฿`).first()).toBeVisible();
        await expect(page.getByText(formatSignedCompactBaht(remainingPayable)).first()).toBeVisible();
        await expect(page.getByText(`${formatBaht(paymentGap)} ฿`).first()).toBeVisible();
      } else {
        const cpi = latest.ac > 0 ? latest.ev / latest.ac : 0;
        const eac = cpi > 0 ? project.budget / cpi : project.budget;
        const vac = project.budget - eac;
        const cv = latest.ev - latest.ac;

        await expect(page.getByText(cpi.toFixed(2)).first()).toBeVisible();
        await expect(page.getByText(formatSignedCompactBaht(vac))).toBeVisible();
        await expect(page.getByText(`${formatBaht(latest.ac)} ฿`).first()).toBeVisible();
        await expect(page.getByText(`${formatBaht(Math.round(eac))} ฿`).first()).toBeVisible();
        await expect(page.getByText(`${formatBaht(Math.round(vac))} ฿`).first()).toBeVisible();
        await expect(page.getByText(`${formatBaht(cv)} ฿`).first()).toBeVisible();
      }
    }
  });
});
