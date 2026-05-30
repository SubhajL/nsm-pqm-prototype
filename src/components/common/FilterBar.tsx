'use client';

import { Button, Space } from 'antd';
import type { ReactNode } from 'react';

import { SPACING } from '@/theme/scales';

/**
 * PR-A3 — generic filter row. Hosts AntD `<Select>` / `<Tag>` /
 * `<Segmented>` chips supplied by the consumer; standardises the
 * spacing, the optional Reset affordance, and (most importantly) the
 * landmark wrapping so AT users hear "Filter region" instead of an
 * anonymous flexbox. Closes UX gap G7 (inconsistent filter bars).
 *
 * Pure helpers (`hasAnyActiveFilter`, `resetFilters`) and the
 * `FilterValue` / `FilterState` types live in `./filter-utils.ts` so
 * they can be unit-tested under vitest's node env.
 */

export interface FilterBarProps {
  children: ReactNode;
  /** Required bilingual label, e.g. "ตัวกรอง (Filters)". */
  ariaLabel: string;
  /** Optional reset handler; shows "ล้าง (Reset)" link button when set. */
  onReset?: () => void;
  /** When provided, the reset button is disabled if false. Useful so the
   * Reset chip greys out when no filter is active. */
  resetDisabled?: boolean;
}

export function FilterBar({
  children,
  ariaLabel,
  onReset,
  resetDisabled,
}: FilterBarProps) {
  return (
    <section
      role="region"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
      }}
    >
      <Space size={SPACING.sm} wrap>
        {children}
      </Space>
      {onReset !== undefined && (
        <Button
          type="link"
          size="small"
          onClick={onReset}
          disabled={resetDisabled}
          style={{ marginInlineStart: 'auto' }}
        >
          ล้าง (Reset)
        </Button>
      )}
    </section>
  );
}
