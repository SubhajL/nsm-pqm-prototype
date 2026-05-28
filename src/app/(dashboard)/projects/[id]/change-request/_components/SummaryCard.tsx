'use client';

import { Card, Col, Row, Typography } from 'antd';

import { COLORS } from '@/theme/antd-theme';
import { formatBaht } from '@/lib/date-utils';

const { Text } = Typography;

export function SummaryCard({
  summary,
}: {
  summary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    totalBudgetImpact: number;
  };
}) {
  return (
    <Card
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        background: COLORS.surfaceCoolAlt,
      }}
      styles={{ body: { padding: '12px 24px' } }}
    >
      <Row gutter={[16, 8]} align="middle">
        <Col>
          <Text strong>CR ทั้งหมด: {summary.total}</Text>
        </Col>
        <Col>
          <Text>|</Text>
        </Col>
        <Col>
          <Text>
            อนุมัติ: <span style={{ color: COLORS.success, fontWeight: 600 }}>{summary.approved}</span>
          </Text>
        </Col>
        <Col>
          <Text>|</Text>
        </Col>
        <Col>
          <Text>
            รออนุมัติ: <span style={{ color: COLORS.warning, fontWeight: 600 }}>{summary.pending}</span>
          </Text>
        </Col>
        <Col>
          <Text>|</Text>
        </Col>
        <Col>
          <Text>
            ไม่อนุมัติ: <span style={{ color: COLORS.error, fontWeight: 600 }}>{summary.rejected}</span>
          </Text>
        </Col>
        <Col>
          <Text>|</Text>
        </Col>
        <Col>
          <Text>
            ผลกระทบงบรวม:{' '}
            <span style={{ color: summary.totalBudgetImpact > 0 ? COLORS.error : COLORS.success, fontWeight: 600 }}>
              {summary.totalBudgetImpact > 0 ? '+' : ''}
              {formatBaht(summary.totalBudgetImpact)} บาท
            </span>
          </Text>
        </Col>
      </Row>
    </Card>
  );
}
