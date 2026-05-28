'use client';

import { Card, Col, Row, Skeleton, Typography } from 'antd';

const { Title } = Typography;

export function WbsLoading() {
  return (
    <div>
      <Title level={3}>
        โครงสร้างการแบ่งงาน (WBS) & BOQ
      </Title>
      <Row gutter={16}>
        <Col span={10}>
          <Card>
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card>
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
