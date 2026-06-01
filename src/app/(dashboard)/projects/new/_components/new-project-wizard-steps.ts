/**
 * PR-D1b — pure step → field-name mapping for the New Project wizard.
 *
 * Step indices:
 *   0 — Basic info (name, projectClass, deliveryMethod, contractingModel, objectives, description)
 *   1 — Timeline + Budget + Milestones (dates, budget, progressMethod, budgetSource)
 *   2 — Team (assignees, owner)
 */

export const NEW_PROJECT_STEPS = [
  { key: 'basics', title: 'ข้อมูลพื้นฐาน (Basics)' },
  { key: 'schedule', title: 'แผนเวลา + งบประมาณ (Schedule + Budget)' },
  { key: 'team', title: 'ทีมงาน (Team)' },
] as const;

export type NewProjectStepKey = (typeof NEW_PROJECT_STEPS)[number]['key'];

export function getNewProjectWizardFieldNames(
  step: number,
): readonly string[] {
  switch (step) {
    case 0:
      return [
        'name',
        'projectClass',
        'deliveryMethod',
        'contractingModel',
        'objectives',
        'description',
      ];
    case 1:
      return ['startDate', 'endDate', 'budget', 'budgetSource', 'progressMethod'];
    case 2:
      // Team fields are optional in the current form (no required fields
      // on TeamSection at present), so this returns [] — the wizard's
      // submit step runs `validateFields()` over the whole form anyway.
      return [];
    default:
      return [];
  }
}
