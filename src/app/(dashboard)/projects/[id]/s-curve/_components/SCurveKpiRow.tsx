'use client';

import { Col, Row } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

import { KPICard } from '@/components/common/KPICard';
import { formatBahtShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import { formatSignedCompactBaht } from '@/lib/evm-metrics';
import type {
  DerivedEvmMetrics,
  DerivedInternalEvmMetrics,
  DerivedOutsourcedContractMetrics,
} from '@/lib/evm-metrics';

type ToneColor = 'success' | 'warning' | 'error' | 'processing';
type Tone = { color: ToneColor; summaryTh: string; summaryEn: string };

export function SCurveKpiRow({
  metrics,
  internalMetrics,
  outsourcedMetrics,
  isOutsourced,
  spiTone,
  cpiTone,
  vacIsPositive,
}: {
  metrics: DerivedEvmMetrics | null;
  internalMetrics: DerivedInternalEvmMetrics | null;
  outsourcedMetrics: DerivedOutsourcedContractMetrics | null;
  isOutsourced: boolean;
  spiTone: Tone | null;
  cpiTone: Tone | null;
  vacIsPositive: boolean;
}) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <KPICard
          title="SPI (Schedule Performance Index)"
          value={metrics?.spi.toFixed(2) ?? '-'}
          icon={metrics ? ((metrics.spi ?? 0) >= 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />) : <InfoCircleOutlined />}
          color={
            spiTone?.color === 'success'
              ? COLORS.success
              : spiTone?.color === 'warning'
                ? COLORS.warning
                : metrics
                  ? COLORS.error
                  : COLORS.info
          }
          subtitle={spiTone ? `${spiTone.summaryTh} (${spiTone.summaryEn})` : 'ยังไม่มีข้อมูลงวด'}
        />
      </Col>
      {isOutsourced ? (
        <>
          <Col span={6}>
            <KPICard
              title="EV (Earned Value)"
              value={outsourcedMetrics ? formatBahtShort(outsourcedMetrics.ev) : '-'}
              icon={<InfoCircleOutlined />}
              color={COLORS.info}
              subtitle={outsourcedMetrics ? 'มูลค่างานที่ตรวจรับได้ตามความก้าวหน้า' : 'ยังไม่มีข้อมูลงวด'}
            />
          </Col>
          <Col span={6}>
            <KPICard
              title="Paid to Date"
              value={outsourcedMetrics ? formatBahtShort(outsourcedMetrics.paidToDate) : '-'}
              icon={<CheckCircleOutlined />}
              color={COLORS.success}
              subtitle={outsourcedMetrics ? 'จ่ายแล้วสะสม (Owner Disbursement)' : 'ยังไม่มีข้อมูลงวด'}
            />
          </Col>
          <Col span={6}>
            <KPICard
              title="Remaining Payable"
              value={outsourcedMetrics ? formatSignedCompactBaht(outsourcedMetrics.remainingPayable) : '-'}
              icon={<InfoCircleOutlined />}
              color={COLORS.warning}
              subtitle={outsourcedMetrics ? 'คงเหลือที่ต้องจ่ายตามวงเงินสัญญา' : 'ยังไม่มีข้อมูลงวด'}
            />
          </Col>
        </>
      ) : (
        <>
          <Col span={6}>
            <KPICard
              title="CPI (Cost Performance Index)"
              value={internalMetrics ? internalMetrics.cpi.toFixed(2) : '-'}
              icon={internalMetrics ? ((internalMetrics.cpi ?? 0) >= 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />) : <InfoCircleOutlined />}
              color={
                cpiTone?.color === 'success'
                  ? COLORS.success
                  : cpiTone?.color === 'warning'
                    ? COLORS.warning
                    : internalMetrics
                      ? COLORS.error
                      : COLORS.info
              }
              subtitle={cpiTone ? `${cpiTone.summaryTh} (${cpiTone.summaryEn})` : 'ยังไม่มีข้อมูลงวด'}
            />
          </Col>
          <Col span={6}>
            <KPICard
              title="EAC (Estimate at Completion)"
              value={internalMetrics ? formatBahtShort(internalMetrics.eac) : '-'}
              icon={<InfoCircleOutlined />}
              color={COLORS.info}
              subtitle="ประมาณการต้นทุนเมื่อแล้วเสร็จ (Estimate at Completion)"
            />
          </Col>
          <Col span={6}>
            <KPICard
              title="VAC (Variance at Completion)"
              value={internalMetrics ? formatSignedCompactBaht(internalMetrics.vac) : '-'}
              icon={<CheckCircleOutlined />}
              color={vacIsPositive ? COLORS.success : COLORS.error}
              subtitle={
                vacIsPositive
                  ? 'งบประมาณคงเหลือ (Budget Remaining)'
                  : 'แนวโน้มเกินงบ (Budget Overrun)'
              }
            />
          </Col>
        </>
      )}
    </Row>
  );
}
