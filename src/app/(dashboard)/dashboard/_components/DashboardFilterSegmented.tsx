'use client';

import { Segmented } from 'antd';

import type { DashboardStatusFilter } from './helpers';

/**
 * Tier 2 PR 2 — dedicated filter affordance above the KPI row.
 *
 * Replaces the prior "KPI card doubles as filter chip" pattern flagged
 * by the E2 audit. Per `src/components/common/CLAUDE.md` → Button
 * hierarchy / KPI rules, KPI cards are now purely informational and a
 * `<Segmented>` selector owns the filter contract. Labels carry a
 * live count so the user can read the partition without consulting
 * the KPI cards below.
 */
interface DashboardFilterSegmentedProps {
  value: DashboardStatusFilter;
  onChange: (next: DashboardStatusFilter) => void;
  counts: {
    all: number;
    in_progress: number;
    planning: number;
    completed: number;
  };
}

// Strict typed option shape — Segmented's AntD generic accepts
// `SegmentedValue = string | number`, so we narrow at the source
// instead of casting at `onChange`. Drift here is a compile error.
type FilterOption = { value: DashboardStatusFilter; label: string };

function isDashboardStatusFilter(v: unknown): v is DashboardStatusFilter {
  return (
    v === 'all' ||
    v === 'in_progress' ||
    v === 'planning' ||
    v === 'completed'
  );
}

export function DashboardFilterSegmented({
  value,
  onChange,
  counts,
}: DashboardFilterSegmentedProps) {
  const options: FilterOption[] = [
    { value: 'all', label: `ทั้งหมด (All) · ${counts.all}` },
    {
      value: 'in_progress',
      label: `กำลังดำเนินการ (In Progress) · ${counts.in_progress}`,
    },
    { value: 'planning', label: `วางแผน (Planning) · ${counts.planning}` },
    { value: 'completed', label: `เสร็จสิ้น (Completed) · ${counts.completed}` },
  ];

  return (
    <div
      role="region"
      aria-label="ตัวกรองสถานะโครงการ (Project status filter)"
      style={{ marginBottom: 24 }}
    >
      <Segmented
        size="large"
        value={value}
        onChange={(next) => {
          // Runtime narrow — protects against future drift between
          // `options` and the `DashboardStatusFilter` union (e.g. a
          // typo or an unintentional `archived` addition).
          if (isDashboardStatusFilter(next)) {
            onChange(next);
          }
        }}
        options={options}
      />
    </div>
  );
}
