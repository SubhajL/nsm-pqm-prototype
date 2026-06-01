'use client';

import { Col, Row } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';

import { KPICard } from '@/components/common/KPICard';
import { computeKpiDelta } from '@/lib/dashboard-kpi-context';
import { COLORS, PROJECT_STATUS_COLORS } from '@/theme/antd-theme';

import type { DashboardStatusFilter } from './helpers';

const COMPARISON_LABEL = '(vs baseline)';

export function DashboardKPIRow({
  totalProjects,
  inProgressCount,
  planningCount,
  completedCount,
  inProgressPct,
  planningPct,
  completedPct,
  statusFilter,
  onStatusFilterChange,
  freshness,
  baseline,
}: {
  totalProjects: number;
  inProgressCount: number;
  planningCount: number;
  completedCount: number;
  inProgressPct: string;
  planningPct: string;
  completedPct: string;
  statusFilter: DashboardStatusFilter;
  onStatusFilterChange: (next: DashboardStatusFilter) => void;
  /** P-C1 — bilingual "Updated X ago" label rendered on the first KPI card. */
  freshness?: string;
  /**
   * P-C1 — baseline counts to derive deltas. When omitted (eg the
   * comparison data is not available) the cards hide the delta row.
   */
  baseline?: {
    totalProjects?: number;
    inProgressCount?: number;
    planningCount?: number;
    completedCount?: number;
  };
}) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <KPICard
          title="โครงการทั้งหมด (Total Projects)"
          value={totalProjects}
          icon={<FolderOutlined />}
          color={COLORS.info}
          subtitle="งบประมาณปี 2569"
          active={statusFilter === 'all'}
          onClick={() => onStatusFilterChange('all')}
          delta={
            baseline?.totalProjects !== undefined
              ? computeKpiDelta(totalProjects, baseline.totalProjects, {
                  comparisonLabel: COMPARISON_LABEL,
                })
              : undefined
          }
          freshness={freshness}
        />
      </Col>
      <Col span={6}>
        <KPICard
          title="กำลังดำเนินการ (In Progress)"
          value={inProgressCount}
          icon={<ClockCircleOutlined />}
          color={COLORS.accentTeal}
          subtitle={`${inProgressPct}% ของทั้งหมด`}
          active={statusFilter === 'in_progress'}
          onClick={() => onStatusFilterChange('in_progress')}
          delta={
            baseline?.inProgressCount !== undefined
              ? computeKpiDelta(inProgressCount, baseline.inProgressCount, {
                  comparisonLabel: COMPARISON_LABEL,
                })
              : undefined
          }
        />
      </Col>
      <Col span={6}>
        <KPICard
          title="วางแผน (Planning)"
          value={planningCount}
          icon={<ScheduleOutlined />}
          color={PROJECT_STATUS_COLORS.planning}
          subtitle={`${planningPct}% ของทั้งหมด`}
          active={statusFilter === 'planning'}
          onClick={() => onStatusFilterChange('planning')}
          delta={
            baseline?.planningCount !== undefined
              ? computeKpiDelta(planningCount, baseline.planningCount, {
                  comparisonLabel: COMPARISON_LABEL,
                })
              : undefined
          }
        />
      </Col>
      <Col span={6}>
        <KPICard
          title="เสร็จสิ้น (Completed)"
          value={completedCount}
          icon={<CheckCircleOutlined />}
          color={COLORS.success}
          subtitle={`${completedPct}% ของทั้งหมด`}
          active={statusFilter === 'completed'}
          onClick={() => onStatusFilterChange('completed')}
          delta={
            baseline?.completedCount !== undefined
              ? computeKpiDelta(completedCount, baseline.completedCount, {
                  comparisonLabel: COMPARISON_LABEL,
                })
              : undefined
          }
        />
      </Col>
    </Row>
  );
}
