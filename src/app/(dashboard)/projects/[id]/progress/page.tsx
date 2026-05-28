'use client';

import { useMemo, useState } from 'react';
import { Card, Col, Row, Segmented, Skeleton, Typography } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { useEVM } from '@/hooks/useEVM';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useWBS } from '@/hooks/useWBS';
import {
  buildPhysicalRows,
  buildWeightingRows,
  getAveragePhysicalProgress,
  getTotalWeightedProgress,
} from '@/lib/project-progress-derivations';
import { COLORS } from '@/theme/antd-theme';
import { formatBahtShort } from '@/lib/date-utils';
import { deriveEvmMetrics, getPaymentGapTone, getSpiTone } from '@/lib/evm-metrics';
import { getProjectDeliveryMethod } from '@/types/project';

import { WeightingMethodCard } from './_components/WeightingMethodCard';
import { PhysicalProgressCard } from './_components/PhysicalProgressCard';
import { EVMCard, type EVMMetric } from './_components/EVMCard';
import { SummaryCard } from './_components/SummaryCard';

const { Title, Text } = Typography;

type MethodTab = 'all' | 'weighting' | 'physical' | 'evm';

export default function ProgressUpdatePage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: wbsNodes, isLoading: loadingWbs } = useWBS(projectId);
  const { data: evmData, isLoading: loadingEvm } = useEVM(projectId);
  const [activeTab, setActiveTab] = useState<MethodTab>('all');

  const weightingRows = useMemo(() => buildWeightingRows(wbsNodes ?? []), [wbsNodes]);
  const totalWeighted = useMemo(
    () => getTotalWeightedProgress(weightingRows),
    [weightingRows],
  );
  const physicalRows = useMemo(
    () => buildPhysicalRows(wbsNodes ?? []),
    [wbsNodes],
  );
  const physicalOverall = useMemo(
    () => getAveragePhysicalProgress(physicalRows),
    [physicalRows],
  );
  const deliveryMethod = getProjectDeliveryMethod(project);
  const evmSummary = useMemo(() => deriveEvmMetrics(project, evmData), [evmData, project]);
  const spiTone = getSpiTone(evmSummary?.spi ?? 0);
  const paymentGapTone = evmSummary?.mode === 'outsourced' ? getPaymentGapTone(evmSummary.paymentGap) : null;

  const evmMetrics = useMemo<EVMMetric[]>(
    () => {
      const bac = project?.budget ?? 0;

      if (!evmSummary) {
        return deliveryMethod === 'outsourced'
          ? [
              { key: 'bac', label: 'BAC', value: formatBahtShort(bac), color: COLORS.info },
              { key: 'pv', label: 'PV', value: '-', color: COLORS.info },
              { key: 'ev', label: 'EV', value: '-', color: COLORS.success },
              { key: 'paid', label: 'Paid', value: '-', color: COLORS.success },
              { key: 'spi', label: 'SPI', value: '-', color: COLORS.warning },
              { key: 'remaining', label: 'Remaining', value: '-', color: COLORS.warning },
            ]
          : [
              { key: 'bac', label: 'BAC', value: formatBahtShort(bac), color: COLORS.info },
              { key: 'pv', label: 'PV', value: '-', color: COLORS.info },
              { key: 'ev', label: 'EV', value: '-', color: COLORS.success },
              { key: 'ac', label: 'AC', value: '-', color: COLORS.warning },
              { key: 'spi', label: 'SPI', value: '-', color: COLORS.warning },
              { key: 'cpi', label: 'CPI', value: '-', color: COLORS.warning },
            ];
      }

      if (evmSummary.mode === 'outsourced') {
        return [
          { key: 'bac', label: 'BAC', value: formatBahtShort(evmSummary.bac), color: COLORS.info },
          { key: 'pv', label: 'PV', value: formatBahtShort(evmSummary.pv), color: COLORS.info },
          { key: 'ev', label: 'EV', value: formatBahtShort(evmSummary.ev), color: COLORS.success },
          { key: 'paid', label: 'Paid', value: formatBahtShort(evmSummary.paidToDate), color: COLORS.success },
          {
            key: 'spi',
            label: 'SPI',
            value: evmSummary.spi.toFixed(2),
            color: spiTone.color === 'success' ? COLORS.success : COLORS.warning,
            tag:
              evmSummary.spi >= 1
                ? { color: 'green', icon: <CheckCircleOutlined />, text: 'ตามแผน (On Schedule)' }
                : { color: 'gold', icon: <WarningOutlined />, text: 'ช้ากว่าแผน (Behind Schedule)' },
          },
          {
            key: 'remaining',
            label: 'Remaining',
            value: formatBahtShort(evmSummary.remainingPayable),
            color: COLORS.warning,
            tag: {
              color: paymentGapTone?.color === 'warning' ? 'gold' : paymentGapTone?.color === 'success' ? 'green' : 'blue',
              icon: paymentGapTone?.color === 'warning' ? <WarningOutlined /> : <CheckCircleOutlined />,
              text: paymentGapTone?.summaryTh ?? 'สถานะการจ่ายเงิน',
            },
          },
        ];
      }

      return [
        { key: 'bac', label: 'BAC', value: formatBahtShort(evmSummary.bac), color: COLORS.info },
        { key: 'pv', label: 'PV', value: formatBahtShort(evmSummary.pv), color: COLORS.info },
        { key: 'ev', label: 'EV', value: formatBahtShort(evmSummary.ev), color: COLORS.success },
        { key: 'ac', label: 'AC', value: formatBahtShort(evmSummary.ac), color: COLORS.warning },
        {
          key: 'spi',
          label: 'SPI',
          value: evmSummary.spi.toFixed(2),
          color: evmSummary.spi >= 1 ? COLORS.success : COLORS.warning,
          tag:
            evmSummary.spi >= 1
              ? { color: 'green', icon: <CheckCircleOutlined />, text: 'ตามแผน (On Schedule)' }
              : { color: 'gold', icon: <WarningOutlined />, text: 'ล่าช้าเล็กน้อย (Slightly Behind)' },
        },
        {
          key: 'cpi',
          label: 'CPI',
          value: evmSummary.cpi.toFixed(2),
          color: evmSummary.cpi >= 1 ? COLORS.success : COLORS.warning,
          tag:
            evmSummary.cpi >= 1
              ? { color: 'green', icon: <CheckCircleOutlined />, text: 'ใช้งบได้ดี (Under Budget)' }
              : { color: 'gold', icon: <WarningOutlined />, text: 'ใช้จ่ายสูงกว่าแผน (Over Budget)' },
        },
        { key: 'eac', label: 'EAC', value: formatBahtShort(evmSummary.eac), color: COLORS.info },
        { key: 'tcpi', label: 'TCPI', value: evmSummary.tcpi.toFixed(2), color: COLORS.success },
      ];
    },
    [evmSummary, deliveryMethod, paymentGapTone?.color, paymentGapTone?.summaryTh, project?.budget, spiTone.color],
  );

  if (loadingProject || loadingWbs || loadingEvm) {
    return (
      <div>
        <Title level={3}>อัปเดตความคืบหน้าโครงการ (Progress Update)</Title>
        <Row gutter={16}>
          {[1, 2, 3].map((i) => (
            <Col span={8} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 8 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  const showWeighting = activeTab === 'all' || activeTab === 'weighting';
  const showPhysical = activeTab === 'all' || activeTab === 'physical';
  const showEVM = activeTab === 'all' || activeTab === 'evm';
  const colSpan = activeTab === 'all' ? 8 : 24;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          อัปเดตความคืบหน้าโครงการ (Progress Update)
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          ข้อมูลอ้างอิงจาก WBS, แผนงาน และ EVM ล่าสุด
        </Text>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Segmented
          value={activeTab}
          onChange={(val) => setActiveTab(val as MethodTab)}
          options={[
            { label: 'ดูทั้ง 3 วิธี (All)', value: 'all' },
            { label: 'วิธีน้ำหนักงาน (Weighting)', value: 'weighting' },
            { label: 'วิธีเชิงปริมาณ (Physical)', value: 'physical' },
            { label: 'EVM', value: 'evm' },
          ]}
          size="large"
        />
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {showWeighting && (
          <Col span={colSpan}>
            <WeightingMethodCard rows={weightingRows} totalWeighted={totalWeighted} />
          </Col>
        )}

        {showPhysical && (
          <Col span={colSpan}>
            <PhysicalProgressCard rows={physicalRows} overall={physicalOverall} />
          </Col>
        )}

        {showEVM && (
          <Col span={colSpan}>
            <EVMCard
              metrics={evmMetrics}
              evmPercent={evmSummary?.evPercent ?? 0}
              deliveryMethod={deliveryMethod}
            />
          </Col>
        )}
      </Row>

      <SummaryCard
        totalWeighted={totalWeighted}
        physicalOverall={physicalOverall}
        evmPercent={evmSummary?.evPercent ?? 0}
      />
    </div>
  );
}
