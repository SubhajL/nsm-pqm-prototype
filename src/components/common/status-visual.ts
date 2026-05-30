import { COLORS } from '@/theme/antd-theme';

/**
 * PR-A3 — pure status → visual resolver. Pulled out of `StatusIndicator.tsx`
 * so the AA-color invariant can be unit-tested in vitest's node env
 * (which can't parse JSX). The React component imports this module and
 * pipes the output into icons + spans.
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
  switch (status) {
    case 'success':
      return { color: COLORS.success, icon: 'check', textColor: COLORS.successText };
    case 'warning':
      return { color: COLORS.warning, icon: 'warn', textColor: COLORS.warningText };
    case 'error':
      return { color: COLORS.error, icon: 'error', textColor: COLORS.errorText };
    case 'info':
      return { color: COLORS.info, icon: 'info', textColor: COLORS.info };
    case 'neutral':
      return { color: COLORS.textMuted, icon: 'dot', textColor: COLORS.textMuted };
  }
}
