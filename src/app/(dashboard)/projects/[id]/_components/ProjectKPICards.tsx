'use client';

import { useRouter } from 'next/navigation';
import { Col, Progress, Row } from 'antd';
import {
  BugOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ScheduleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { KPICard } from '@/components/common/KPICard';
import { formatBahtShort } from '@/lib/date-utils';
import { computeRatioKpiDelta } from '@/lib/dashboard-kpi-context';
import { COLORS } from '@/theme/antd-theme';
import type { DeliveryMethod } from '@/types/rid/vocabulary';
import type { deriveEvmMetrics } from '@/lib/evm-metrics';

const RATIO_BASELINE_LABEL = '(vs baseline 1.00)';

export function ProjectKPICards({
  projectId,
  budget,
  budgetSpent,
  budgetSpentLabel,
  spi,
  deliveryMethod,
  evmMetrics,
  currentMilestone,
  totalMilestones,
  openIssues,
  highRisks,
  freshness,
}: {
  projectId: string;
  budget: number;
  budgetSpent: number;
  budgetSpentLabel: string;
  spi: number;
  deliveryMethod: DeliveryMethod;
  evmMetrics: ReturnType<typeof deriveEvmMetrics>;
  currentMilestone: number;
  totalMilestones: number;
  openIssues: number;
  highRisks: number;
  /**
   * Audit G19 — bilingual "Updated X ago" label rendered on the budget
   * card. Caller computes via `formatFreshnessLabel` so the timestamp
   * source stays SSR-safe (parent owns `new Date()`).
   */
  freshness?: string;
}) {
  const spiDelta = computeRatioKpiDelta(spi, 1.0, {
    comparisonLabel: RATIO_BASELINE_LABEL,
  });
  const cpiValue =
    evmMetrics?.mode === 'in_house' ? evmMetrics.cpi : null;
  const cpiDelta =
    cpiValue !== null
      ? computeRatioKpiDelta(cpiValue, 1.0, {
          comparisonLabel: RATIO_BASELINE_LABEL,
        })
      : undefined;
  const router = useRouter();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={8} xl={4}>
        <KPICard
          title="งบประมาณ"
          value={formatBahtShort(budget)}
          icon={<DollarOutlined />}
          color={COLORS.info}
          onClick={() => router.push(`/projects/${projectId}/s-curve`)}
          freshness={freshness}
          extraContent={
            <>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>
                {budgetSpentLabel}
              </div>
              <Progress
                percent={budget > 0 ? Number(((budgetSpent / budget) * 100).toFixed(1)) : 0}
                size="small"
                strokeColor={COLORS.info}
                format={() => formatBahtShort(budgetSpent)}
              />
            </>
          }
        />
      </Col>
      <Col xs={12} md={8} xl={4}>
        <KPICard
          title="SPI"
          value={spi.toFixed(2)}
          icon={<WarningOutlined />}
          color={COLORS.warning}
          subtitle="Schedule Performance Index"
          onClick={() => router.push(`/projects/${projectId}/s-curve`)}
          delta={spiDelta}
        />
      </Col>
      <Col xs={12} md={8} xl={4}>
        <KPICard
          title={deliveryMethod === 'outsourced' ? 'จ่ายแล้ว' : 'CPI'}
          value={
            deliveryMethod === 'outsourced'
              ? formatBahtShort(budgetSpent)
              : cpiValue !== null
                ? cpiValue.toFixed(2)
                : '0.00'
          }
          icon={<CheckCircleOutlined />}
          color={COLORS.success}
          subtitle={
            deliveryMethod === 'outsourced'
              ? 'Paid to Date'
              : 'Cost Performance Index'
          }
          onClick={() => router.push(`/projects/${projectId}/s-curve`)}
          delta={deliveryMethod === 'outsourced' ? undefined : cpiDelta}
        />
      </Col>
      <Col xs={12} md={8} xl={4}>
        <KPICard
          title="งวดปัจจุบัน"
          value={`${currentMilestone}/${totalMilestones}`}
          icon={<ScheduleOutlined />}
          color={COLORS.info}
        />
      </Col>
      <Col xs={12} md={8} xl={4}>
        <KPICard
          title="ปัญหาเปิด"
          value={openIssues}
          icon={<BugOutlined />}
          color={COLORS.error}
          onClick={() => router.push(`/projects/${projectId}/issues`)}
        />
      </Col>
      <Col xs={12} md={8} xl={4}>
        <KPICard
          title="ความเสี่ยงสูง"
          value={highRisks}
          icon={<WarningOutlined />}
          color={COLORS.warning}
          onClick={() => router.push(`/projects/${projectId}/risk`)}
        />
      </Col>
    </Row>
  );
}
