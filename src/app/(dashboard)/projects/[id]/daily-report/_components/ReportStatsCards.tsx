'use client';

import { Card, Col, Row, Typography } from 'antd';

import { COLORS } from '@/theme/antd-theme';

const { Title, Text } = Typography;

interface ReportStatsCardsProps {
  reportStats: {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
}

export function ReportStatsCards({ reportStats }: ReportStatsCardsProps) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Text type="secondary">รายงานทั้งหมด</Text>
          <Title level={3} style={{ margin: '8px 0 0' }}>{reportStats.total}</Title>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Text type="secondary">ร่าง</Text>
          <Title level={3} style={{ margin: '8px 0 0', color: COLORS.warning }}>{reportStats.draft}</Title>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Text type="secondary">รออนุมัติ</Text>
          <Title level={3} style={{ margin: '8px 0 0', color: COLORS.info }}>{reportStats.submitted}</Title>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Text type="secondary">อนุมัติแล้ว</Text>
          <Title level={3} style={{ margin: '8px 0 0', color: COLORS.success }}>{reportStats.approved}</Title>
        </Card>
      </Col>
    </Row>
  );
}
