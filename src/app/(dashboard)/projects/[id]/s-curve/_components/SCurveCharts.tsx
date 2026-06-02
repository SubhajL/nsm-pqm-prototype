'use client';

import { Card, Col, Empty, Row } from 'antd';

import { COLORS } from '@/theme/antd-theme';
import { getPaidToDate } from '@/lib/evm-metrics';
import type { EVMDataPoint } from '@/types/evm';

import { CPISPITrendChart, SCurveChart } from './helpers';

export function SCurveCharts({
  evmData,
  hasSnapshots,
  isOutsourced,
  bac,
}: {
  evmData: EVMDataPoint[] | undefined;
  hasSnapshots: boolean;
  isOutsourced: boolean;
  bac: number;
}) {
  return (
    // PR-C3: stack the chart pair on viewports below xl (≥1200px). The
    // 14/10 split read as cramped on iPad-landscape; full-width stack
    // is more legible for analytical reading.
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={24} lg={24} xl={14}>
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
          {/* PR-C3: SV%, CV%, and Earned-vs-Paid Gap tags were removed —
              the same metrics are already presented as SPI / CPI / VAC
              KPI cards in the row above; the duplication was UX gap
              "redundant status tags". */}
        </Card>
      </Col>
      <Col xs={24} md={24} lg={24} xl={10}>
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
              markLatestPoint
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
