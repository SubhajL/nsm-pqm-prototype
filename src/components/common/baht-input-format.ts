/**
 * PR-31 cleanup — pure formatter/parser pair for `BahtInput`.
 *
 * Kept in a sibling `.ts` (no JSX) so the null-safety and NaN-guarding
 * behavior is unit-testable under vitest's node environment. These
 * replace the eight per-screen `formatter`/`parser` copies that
 * previously coerced cleared optional fields to 0 and let `Number('12a')`
 * produce NaN.
 */

/**
 * Comma-group a numeric input value for display. Null / undefined /
 * empty (a cleared field) render as the empty string — NOT '0'.
 */
export function formatBahtInputValue(
  value: number | string | undefined | null,
): string {
  if (value === undefined || value === null || value === '') return '';
  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parse the display text back to a number. Returns `null` (never 0,
 * never NaN) for cleared input, a lone minus sign mid-typing, or
 * non-numeric garbage — so optional fields stay genuinely empty.
 */
export function parseBahtInputValue(text: string | undefined): number | null {
  const cleaned = (text ?? '').replace(/[,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}
