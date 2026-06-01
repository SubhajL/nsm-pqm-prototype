'use client';

import { Col, Row, Typography } from 'antd';

import { LoadingSkeleton } from '@/components/common';

const { Title } = Typography;

export function DashboardLoading() {
  return (
    <div>
      <Title level={3}>แดชบอร์ดภาพรวมโครงการ (Portfolio Dashboard)</Title>
      <Row gutter={16}>
        {[1, 2, 3, 4].map((i) => (
          <Col span={6} key={i}>
            <LoadingSkeleton variant="card" rows={2} />
          </Col>
        ))}
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={14}>
          <LoadingSkeleton variant="card" rows={8} />
        </Col>
        <Col span={10}>
          <LoadingSkeleton variant="card" rows={8} />
        </Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <LoadingSkeleton variant="card" rows={6} />
      </div>
    </div>
  );
}
