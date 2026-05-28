'use client';

import { Card, Col, Row, Skeleton, Typography } from 'antd';

const { Title } = Typography;

export function DashboardLoading() {
  return (
    <div>
      <Title level={3}>แดชบอร์ดภาพรวมโครงการ (Portfolio Dashboard)</Title>
      <Row gutter={16}>
        {[1, 2, 3, 4].map((i) => (
          <Col span={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}
