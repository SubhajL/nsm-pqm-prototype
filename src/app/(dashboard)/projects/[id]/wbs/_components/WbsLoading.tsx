'use client';

import { Card, Col, Row, Skeleton, Typography } from 'antd';

const { Title } = Typography;

export function WbsLoading() {
  return (
    <div>
      <Title level={3}>
        โครงสร้างการแบ่งงาน (WBS) & BOQ
      </Title>
      <Row gutter={[16, 16]}>
        {/* PR-B1: matches the live WBS page's responsive layout. */}
        <Col xs={24} sm={24} md={24} lg={10}>
          <Card>
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={24} lg={14}>
          <Card>
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
