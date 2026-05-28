'use client';

import { Card, Col, Empty, Row, Space, Tag } from 'antd';

import { COLORS } from '@/theme/antd-theme';
import {
  formatSignedCompactBaht,
  formatSignedPercent,
  getPaidToDate,
} from '@/lib/evm-metrics';
import type {
  DerivedEvmMetrics,
  DerivedInternalEvmMetrics,
  DerivedOutsourcedContractMetrics,
} from '@/lib/evm-metrics';
import type { EVMDataPoint } from '@/types/evm';

import { CPISPITrendChart, SCurveChart } from './helpers';

type ToneColor = 'success' | 'warning' | 'error' | 'processing';
type Tone = { color: ToneColor; summaryTh: string; summaryEn: string };

export function SCurveCharts({
  evmData,
  hasSnapshots,
  isOutsourced,
  bac,
  metrics,
  internalMetrics,
  outsourcedMetrics,
  svIsPositive,
  cvIsPositive,
  paymentGapTone,
}: {
  evmData: EVMDataPoint[] | undefined;
  hasSnapshots: boolean;
  isOutsourced: boolean;
  bac: number;
  metrics: DerivedEvmMetrics | null;
  internalMetrics: DerivedInternalEvmMetrics | null;
  outsourcedMetrics: DerivedOutsourcedContractMetrics | null;
  svIsPositive: boolean;
  cvIsPositive: boolean;
  paymentGapTone: Tone | null;
}) {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={14}>
        <Card
          title={isOutsourced ? 'S-Curve / Contract Progress' : 'S-Curve'}
          styles={{ body: { padding: '16px 24px' } }}
        >
          {hasSnapshots ? (
            <SCurveChart
              data={(evmData ?? []).map((point) => ({
                monthThai: point.monthThai,
                pv: point.pv,
                ev: point.ev,
                actual: isOutsourced ? getPaidToDate(point) : point.ac,
              }))}
              height={350}
              actualSeriesLabel={isOutsourced ? 'Paid to Date — จ่ายแล้วสะสม' : 'AC — ค่าใช้จ่ายจริง (Actual)'}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={isOutsourced ? 'ยังไม่มีเส้นโค้งความก้าวหน้า/เบิกจ่าย เพราะยังไม่มีข้อมูลงวด' : 'ยังไม่มีเส้นโค้ง EVM เพราะยังไม่มีข้อมูลงวด'}
            />
          )}
          <div style={{ marginTop: 12 }}>
            <Space size={8}>
              <Tag color={svIsPositive ? 'green' : 'red'}>
                Schedule Variance: {metrics ? formatSignedPercent(metrics.svPercent) : '-'}
              </Tag>
              {internalMetrics ? (
                <Tag color={cvIsPositive ? 'green' : 'red'}>
                  Cost Variance: {formatSignedPercent(internalMetrics.cvPercent)}
                </Tag>
              ) : (
                <Tag color={paymentGapTone?.color === 'warning' ? 'gold' : paymentGapTone?.color === 'success' ? 'green' : 'blue'}>
                  Earned vs Paid Gap: {outsourcedMetrics ? formatSignedCompactBaht(outsourcedMetrics.paymentGap) : '-'}
                </Tag>
              )}
            </Space>
          </div>
        </Card>
      </Col>
      <Col span={10}>
        <Card
          title={isOutsourced ? 'Earned / Paid Trend' : 'CPI/SPI Trend'}
          styles={{ body: { padding: '16px 24px' } }}
        >
          {hasSnapshots ? (
            <CPISPITrendChart
              data={(evmData ?? []).map((point) => ({
                monthThai: point.monthThai,
                primary: isOutsourced ? getPaidToDate(point) / Math.max(bac, 1) : point.cpi,
                secondary: isOutsourced ? point.ev / Math.max(bac, 1) : point.spi,
              }))}
              height={350}
              primaryLabel={isOutsourced ? 'Paid/BAC' : 'CPI'}
              secondaryLabel={isOutsourced ? 'EV/BAC' : 'SPI'}
              primaryColor={isOutsourced ? COLORS.success : COLORS.chartGreenAlt}
              secondaryColor={COLORS.info}
              referenceLine={isOutsourced ? null : 1}
              yMin={0}
              yMax={isOutsourced ? 1.1 : 1.2}
              valueFormatter={isOutsourced ? ((value) => `${(value * 100).toFixed(0)}%`) : ((value) => value.toFixed(2))}
              primaryLabelPosition="top"
              secondaryLabelPosition="bottom"
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={isOutsourced ? 'ยังไม่มีแนวโน้มการเบิกจ่าย เพราะยังไม่มีข้อมูลงวด' : 'ยังไม่มีแนวโน้ม CPI/SPI เพราะยังไม่มีข้อมูลงวด'}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}
