/**
 * Tier 2 follow-up — canonical bilingual-label helper.
 *
 * Renders the project's `Thai (English)` label convention with an
 * optional space-separated suffix (used by the KPI Segmented filter
 * for live counts: `"ทั้งหมด (All) · 12"`).
 *
 * Why centralise:
 *   - One place to evolve the format (eg full-width parens, ARIA
 *     locale tagging, a `<bdi>` wrapper for mixed-script RTL safety).
 *   - One place to grep when auditing for inverted ordering or
 *     punctuation drift across the codebase.
 *
 * The helper deliberately does NOT trim whitespace or pluralise —
 * callers compose their own fragments. Order is Thai-then-English to
 * match the shell convention; callers needing English-first can pass
 * the English string as the first argument.
 */
export function bilingual(
  thai: string,
  english: string,
  suffix?: string,
): string {
  const base = `${thai} (${english})`;
  return suffix !== undefined && suffix !== '' ? `${base} ${suffix}` : base;
}
