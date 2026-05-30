'use client';

import { Card, Skeleton } from 'antd';

import { SPACING } from '@/theme/scales';

/**
 * PR-A3 — `LoadingSkeleton`: AntD `<Skeleton>` wrapper that surfaces a
 * live-region announcement so screen-reader users hear the loading
 * state instead of silence. Closes UX gap G2.
 *
 * Variants:
 *   - `paragraph` (default) — text-shape placeholder
 *   - `card` — outer card frame + paragraph (matches KPI card density)
 *   - `table` — header bar + rows
 */

export interface LoadingSkeletonProps {
  variant?: 'paragraph' | 'card' | 'table';
  /** Bilingual ARIA label; defaults to "กำลังโหลด… (Loading…)". */
  ariaLabel?: string;
  /** Number of placeholder rows for `paragraph` / `table` variants. */
  rows?: number;
}

export function LoadingSkeleton({
  variant = 'paragraph',
  ariaLabel = 'กำลังโหลด… (Loading…)',
  rows = 3,
}: LoadingSkeletonProps) {
  const content = (() => {
    switch (variant) {
      case 'card':
        return (
          <Card>
            <Skeleton active title paragraph={{ rows }} />
          </Card>
        );
      case 'table':
        return (
          <div>
            <Skeleton.Input active block style={{ marginBottom: SPACING.md, height: 40 }} />
            <Skeleton active title={false} paragraph={{ rows }} />
          </div>
        );
      case 'paragraph':
      default:
        return <Skeleton active title paragraph={{ rows }} />;
    }
  })();

  return (
    // role="status" + aria-live="polite" makes the placeholder
    // announceable; aria-busy lets AT skip stale content while loading.
    <div role="status" aria-live="polite" aria-busy="true" aria-label={ariaLabel}>
      {content}
    </div>
  );
}
