'use client';

import { Button, Empty } from 'antd';
import type { ReactNode } from 'react';

import { COLORS } from '@/theme/antd-theme';
import { SPACING, TYPE_SCALE } from '@/theme/scales';

/**
 * PR-A3 — `EmptyState`: the canonical empty-list / no-results panel.
 * Wraps AntD `<Empty>` with a bilingual title slot, an optional
 * description, and an optional primary-action button. Closes UX gap G3
 * (data screens currently render blank tables).
 *
 * Reach for this any time a list / table / panel would otherwise paint
 * nothing because there's no data — even on first load before fetch.
 */

export interface EmptyStateProps {
  /** Bilingual headline shown next to the AntD empty illustration. */
  title: string;
  /** Optional secondary line; supports plain text only (no rich nodes). */
  description?: string;
  /** Optional CTA rendered as a primary button under the description. */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** `small` for inline use inside panels; default = full-card empty. */
  size?: 'small' | 'default';
}

export function EmptyState({
  title,
  description,
  action,
  size = 'default',
}: EmptyStateProps) {
  const imageStyle =
    size === 'small'
      ? { height: 56 }
      : { height: 84 };

  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      imageStyle={imageStyle}
      description={
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.xs,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: TYPE_SCALE.base.size,
              fontWeight: 600,
              color: COLORS.textDark,
            }}
          >
            {title}
          </span>
          {description !== undefined && (
            <span
              style={{
                fontSize: TYPE_SCALE.sm.size,
                color: COLORS.textMuted,
                maxWidth: 360,
                textAlign: 'center',
              }}
            >
              {description}
            </span>
          )}
        </div>
      }
    >
      {action !== undefined && (
        <Button
          type="primary"
          icon={action.icon}
          onClick={action.onClick}
          style={{ marginTop: SPACING.sm }}
        >
          {action.label}
        </Button>
      )}
    </Empty>
  );
}
