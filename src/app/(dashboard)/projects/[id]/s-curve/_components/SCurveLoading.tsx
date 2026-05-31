'use client';

import { Card, Col, Row, Skeleton, Typography } from 'antd';

const { Title } = Typography;

export function SCurveLoading() {
  return (
    <div>
      <Title level={3}>EVM Dashboard</Title>
      {/* PR-C3: KPI row stacks 2-up on mobile, full 4-up from sm; chart
          pair stacks until xl — matches the live SCurveCharts layout. */}
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={12} sm={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={24} lg={24} xl={14}>
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
        <Col xs={24} md={24} lg={24} xl={10}>
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
