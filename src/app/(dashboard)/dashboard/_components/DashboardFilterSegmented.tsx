'use client';

import { KpiSegmentedFilter } from '@/components/common';
import { bilingual } from '@/lib/format/bilingual';

import type { DashboardStatusFilter } from './helpers';

/**
 * Tier 2 follow-up — thin domain wrapper around the shared
 * `KpiSegmentedFilter` primitive. Owns the dashboard-specific
 * bilingual copy + the `DashboardStatusFilter` parameterisation.
 * The Segmented machinery, runtime narrow, region landmark, and
 * count-suffix template all live in `common/KpiSegmentedFilter.tsx`.
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

export function DashboardFilterSegmented({
  value,
  onChange,
  counts,
}: DashboardFilterSegmentedProps) {
  return (
    <KpiSegmentedFilter<DashboardStatusFilter>
      value={value}
      onChange={onChange}
      ariaLabel={bilingual('ตัวกรองสถานะโครงการ', 'Project status filter')}
      options={[
        { value: 'all', label: bilingual('ทั้งหมด', 'All'), count: counts.all },
        {
          value: 'in_progress',
          label: bilingual('กำลังดำเนินการ', 'In Progress'),
          count: counts.in_progress,
        },
        {
          value: 'planning',
          label: bilingual('วางแผน', 'Planning'),
          count: counts.planning,
        },
        {
          value: 'completed',
          label: bilingual('เสร็จสิ้น', 'Completed'),
          count: counts.completed,
        },
      ]}
    />
  );
}
