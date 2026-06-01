/**
 * PR-D1b — pure helpers for `WizardActionFooter` + step-validation
 * logic. Kept in `.ts` (no JSX) so they unit-test under the project's
 * node-env vitest config.
 */

/**
 * Returns the bilingual label for the primary action button on a wizard
 * footer. "Next" before the final step, "Submit" on the final step.
 */
export function getNextButtonLabel(args: { current: number; total: number }): string {
  if (args.current >= args.total - 1) return 'บันทึก (Submit)';
  return 'ถัดไป (Next)';
}

/**
 * Clamps a wizard step index to `[0, total-1]`. Used after `current +/- 1`
 * so an over/underflow never paints an empty pane.
 */
export function clampStepIndex(next: number, total: number): number {
  if (total <= 0) return 0;
  if (Number.isNaN(next)) return 0;
  if (next < 0) return 0;
  if (next > total - 1) return total - 1; // Catches +Infinity too.
  return Math.floor(next);
}
