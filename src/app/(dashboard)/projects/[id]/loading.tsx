'use client';

import { Skeleton, Card, Space } from 'antd';

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton.Input active size="large" style={{ width: 300, marginBottom: 16 }} />
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} style={{ flex: 1 }}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          ))}
        </div>
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </Space>
    </div>
  );
}
