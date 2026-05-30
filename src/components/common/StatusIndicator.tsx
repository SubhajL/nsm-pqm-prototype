'use client';

import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
  MinusCircleFilled,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import { SPACING, TYPE_SCALE } from '@/theme/scales';

import { resolveStatusVisual, type Status, type StatusIndicatorVisual } from './status-visual';

/**
 * PR-A3 — `StatusIndicator`: status chip that surfaces meaning on THREE
 * channels (color + icon + text) so it cannot fail WCAG SC 1.4.1
 * "Use of Color". Reach for `StatusBadge` instead when the underlying
 * datum is a domain status (project / milestone / risk / issue) — that
 * component owns the domain → label/color mapping. `StatusIndicator` is
 * the generic primitive used inside other PR-A3 primitives
 * (form-validation hints, empty-state callouts).
 *
 * The pure resolver + types live in `./status-visual.ts` so the
 * AA-color invariant can be unit-tested under vitest's node env.
 */

function renderIcon(icon: StatusIndicatorVisual['icon'], color: string): ReactNode {
  const style = { color };
  switch (icon) {
    case 'check':
      return <CheckCircleFilled style={style} />;
    case 'warn':
      return <ExclamationCircleFilled style={style} />;
    case 'error':
      return <CloseCircleFilled style={style} />;
    case 'info':
      return <InfoCircleFilled style={style} />;
    case 'dot':
      return <MinusCircleFilled style={style} />;
  }
}

export interface StatusIndicatorProps {
  status: Status;
  /** Visible bilingual label, e.g. "ผ่าน (Passed)". */
  label: string;
  /** `small` for inline use inside table cells. Default = comfortable density. */
  size?: 'small' | 'default';
}

export function StatusIndicator({
  status,
  label,
  size = 'default',
}: StatusIndicatorProps) {
  const visual = resolveStatusVisual(status);
  const fontSize = size === 'small' ? TYPE_SCALE.xs.size : TYPE_SCALE.sm.size;
  return (
    <span
      // Native `role="status"` is reserved for ARIA live regions, so use
      // `role="img"` with an aria-label to expose the compound icon+text
      // chip as a single semantic unit to AT.
      role="img"
      aria-label={`${status}: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: SPACING.xs,
        color: visual.textColor,
        fontSize,
        lineHeight: 1,
        fontWeight: 600,
      }}
    >
      {renderIcon(visual.icon, visual.color)}
      <span>{label}</span>
    </span>
  );
}
