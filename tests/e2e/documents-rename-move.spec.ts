import { expect, test } from '@playwright/test';

/**
 * PR-Docs1 — Documents rename + move E2E coverage.
 *
 * Documents POST/DELETE shipped with PR-06, but the original Tracker still
 * scored the surface as "Weak" because rename + move (the remaining CRUD
 * operations) were missing. This spec proves all three rename/move flows
 * work end-to-end: rename a folder, rename a file, move a file across
 * folders. Each assertion reloads the page to confirm the rename/move
 * persisted to the repository, not just to local React state.
 */

async function loginAs(page: import('@playwright/test').Page, userId: string) {
  await page.goto('/login');
  await page.locator(`input[type="radio"][value="${userId}"]`).check();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('PR-Docs1 documents rename + move', () => {
  test('PM can rename a folder and the new name persists on reload', async ({ page }) => {
    const seedName = `โฟลเดอร์ทดสอบ ${Date.now()}`;
    const renamed = `${seedName} (renamed)`;

    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/documents');

    // Seed a folder so we know exactly what we're renaming.
    await page.getByRole('button', { name: 'สร้างโฟลเดอร์' }).click();
    const createDialog = page.getByRole('dialog', { name: 'สร้างโฟลเดอร์' });
    await createDialog.getByRole('textbox', { name: 'ชื่อโฟลเดอร์' }).fill(seedName);
    await createDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    // The newly-created folder is auto-selected; the Rename button appears in
    // the header once a non-root folder is active.
    await page.getByRole('button', { name: /เปลี่ยนชื่อโฟลเดอร์/ }).click();
    const renameDialog = page.getByRole('dialog', { name: /เปลี่ยนชื่อโฟลเดอร์/ });
    const nameInput = renameDialog.getByRole('textbox', { name: /ชื่อโฟลเดอร์/ });
    await nameInput.fill(renamed);
    await renameDialog.getByRole('button', { name: /บันทึก/ }).click();

    // The tree should reflect the new name immediately.
    await expect(page.getByRole('tree').getByText(renamed, { exact: false })).toBeVisible();

    // Reload — the rename must have hit the repository, not just local state.
    await page.reload();
    await expect(page.getByRole('tree').getByText(renamed, { exact: false })).toBeVisible();
  });

  test('PM can rename a file and move it to a different folder', async ({ page }) => {
    const folderA = `โฟลเดอร์ต้นทาง ${Date.now()}`;
    const folderB = `โฟลเดอร์ปลายทาง ${Date.now()}`;
    const fileName = `แบบฟอร์ม ${Date.now()}.pdf`;
    const fileRenamed = `${fileName.replace('.pdf', '')}-final.pdf`;

    await loginAs(page, 'user-002');
    await page.goto('/projects/proj-001/documents');

    // Seed both folders.
    for (const name of [folderA, folderB]) {
      await page.getByRole('button', { name: 'สร้างโฟลเดอร์' }).click();
      const createDialog = page.getByRole('dialog', { name: 'สร้างโฟลเดอร์' });
      await createDialog.getByRole('textbox', { name: 'ชื่อโฟลเดอร์' }).fill(name);
      await createDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    }

    // Navigate to folderA and upload a file there.
    await page.getByRole('tree').getByText(folderA, { exact: false }).click();
    await page.getByRole('button', { name: /อัปโหลดเอกสาร/i }).click();
    const uploadDialog = page.getByRole('dialog', { name: 'อัปโหลดเอกสาร' });
    await uploadDialog.getByRole('textbox', { name: 'ชื่อไฟล์' }).fill(fileName);
    await uploadDialog.getByRole('textbox', { name: 'ประเภทเอกสาร' }).fill('Shop Drawing');
    await uploadDialog.getByRole('textbox', { name: 'ขนาดไฟล์' }).fill('1.2 MB');
    await uploadDialog.getByRole('button', { name: 'บันทึก', exact: true }).click();

    // Rename the file via the row's "More actions" dropdown.
    const row = page.locator('tbody').filter({ hasText: fileName });
    await row.getByRole('button', { name: /เมนูการดำเนินการเพิ่มเติม/ }).click();
    await page.getByRole('menuitem', { name: /เปลี่ยนชื่อ/ }).click();
    const renameDialog = page.getByRole('dialog', { name: /เปลี่ยนชื่อไฟล์/ });
    await renameDialog.getByRole('textbox', { name: /ชื่อไฟล์/ }).fill(fileRenamed);
    await renameDialog.getByRole('button', { name: /บันทึก/ }).click();

    await expect(page.locator('tbody').getByText(fileRenamed, { exact: true })).toBeVisible();

    // Move the renamed file from folderA to folderB.
    const renamedRow = page.locator('tbody').filter({ hasText: fileRenamed });
    await renamedRow.getByRole('button', { name: /เมนูการดำเนินการเพิ่มเติม/ }).click();
    await page.getByRole('menuitem', { name: /ย้ายโฟลเดอร์/ }).click();
    const moveDialog = page.getByRole('dialog', { name: /ย้ายไฟล์/ });
    await moveDialog.locator('.ant-select-selector').click();
    await page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
      .getByText(folderB, { exact: false })
      .first()
      .click();
    await moveDialog.getByRole('button', { name: /ย้าย/ }).click();

    // The file should no longer be in folderA after the move.
    await expect(page.locator('tbody').getByText(fileRenamed, { exact: true })).toHaveCount(0);

    // Switch to folderB and confirm the moved + renamed file is there.
    await page.getByRole('tree').getByText(folderB, { exact: false }).click();
    await expect(page.locator('tbody').getByText(fileRenamed, { exact: true })).toBeVisible();

    // Persistence check.
    await page.reload();
    await page.getByRole('tree').getByText(folderB, { exact: false }).click();
    await expect(page.locator('tbody').getByText(fileRenamed, { exact: true })).toBeVisible();
  });
});
