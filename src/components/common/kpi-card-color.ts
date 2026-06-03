import { COLORS } from '@/theme/antd-theme';
import { resolveHealthVisual } from '@/theme/health-visual';

/**
 * Map a KPI `color` prop value (commonly a brand status color) to its
 * AA-safe `*Text` variant when used as `Statistic.valueStyle.color`.
 *
 * Closes audit gap G15 (UX_UI_AUDIT_2026-06-02): KPI value numbers
 * rendered in raw `COLORS.warning / error / success / accentTeal` fail
 * WCAG-AA contrast on white. The PR-A1 `*Text` variants exist precisely
 * for this case — this helper routes those four brand colors through
 * their AA-safe text twin while leaving every other color untouched.
 *
 * Non-status colors (`primary`, `info` post-PR-A1 darkening, arbitrary
 * hexes) pass through unchanged because they already meet AA when used
 * for text on white.
 *
 * Tier 2 PR 1 — three of the four entries are now sourced from the
 * canonical `resolveHealthVisual`. `accentTeal` remains a brand-identity
 * carve-out (it is not a health state) and keeps its direct mapping.
 */
const STATUS_TO_TEXT: Record<string, string> = {
  [COLORS.warning]: resolveHealthVisual('warning').text,
  [COLORS.error]: resolveHealthVisual('error').text,
  [COLORS.success]: resolveHealthVisual('success').text,
  [COLORS.accentTeal]: COLORS.accentTealText,
};

export function resolveStatisticValueColor(color: string): string {
  return STATUS_TO_TEXT[color] ?? color;
}
