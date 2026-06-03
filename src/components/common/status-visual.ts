import { resolveHealthVisual } from '@/theme/health-visual';

/**
 * PR-A3 — pure status → visual resolver. Pulled out of `StatusIndicator.tsx`
 * so the AA-color invariant can be unit-tested in vitest's node env
 * (which can't parse JSX). The React component imports this module and
 * pipes the output into icons + spans.
 *
 * Tier 2 PR 1 — this module is now a thin adapter over the canonical
 * `resolveHealthVisual` in `@/theme/health-visual`. The public API
 * (the `Status` union, `STATUS_VALUES`, and the `StatusIndicatorVisual`
 * shape) is unchanged so existing call sites keep compiling.
 */

export const STATUS_VALUES = [
  'success',
  'warning',
  'error',
  'info',
  'neutral',
] as const;

export type Status = (typeof STATUS_VALUES)[number];

export interface StatusIndicatorVisual {
  /** Brand fill color — used for the icon when textColor is not. */
  color: string;
  /** Logical icon name; resolved to a real icon component inside `StatusIndicator.tsx`. */
  icon: 'check' | 'warn' | 'error' | 'info' | 'dot';
  /** AA-compliant foreground color for the chip label on a white surface. */
  textColor: string;
}

export function resolveStatusVisual(status: Status): StatusIndicatorVisual {
  // `Status` is a strict subset of `HealthState` (same five literals),
  // so the call type-checks without conversion. The renaming
  // (`fill → color`, `text → textColor`) preserves the pre-existing
  // public API.
  const v = resolveHealthVisual(status);
  return { color: v.fill, icon: v.icon, textColor: v.text };
}
