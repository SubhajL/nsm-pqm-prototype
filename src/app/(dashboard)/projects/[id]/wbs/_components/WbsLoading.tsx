'use client';

import { Col, Row, Typography } from 'antd';

import { LoadingSkeleton } from '@/components/common';

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
          <LoadingSkeleton variant="table" rows={12} />
        </Col>
        <Col xs={24} sm={24} md={24} lg={14}>
          <LoadingSkeleton variant="table" rows={12} />
        </Col>
      </Row>
    </div>
  );
}
