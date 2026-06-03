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

const COMPARISON_LABEL = '(vs baseline)';

/**
 * Tier 2 PR 2 — KPI cards are read-only.
 *
 * The previous "KPI = also a filter chip" behaviour was retired in
 * favour of a dedicated `<DashboardFilterSegmented>` selector above
 * the row (see `src/components/common/CLAUDE.md` → Button hierarchy
 * / KPI rules). The cards now exclusively display counts + deltas +
 * freshness; the filter contract is owned by the Segmented above.
 */
export function DashboardKPIRow({
  totalProjects,
  inProgressCount,
  planningCount,
  completedCount,
  inProgressPct,
  planningPct,
  completedPct,
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
