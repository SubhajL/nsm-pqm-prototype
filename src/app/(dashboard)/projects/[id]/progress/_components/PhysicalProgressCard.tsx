'use client';

import { Card, Empty, Progress, Typography } from 'antd';

import type { PhysicalProgressRow } from '@/lib/project-progress-derivations';
import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

export function PhysicalProgressCard({
  rows,
  overall,
}: {
  rows: PhysicalProgressRow[];
  overall: number;
}) {
  return (
    <Card
      title="วิธีเชิงปริมาณ (Physical Progress)"
      styles={{ body: { padding: '16px' } }}
      style={{ height: '100%' }}
    >
      {rows.length === 0 ? (
        <Empty description="ยังไม่มีงานเชิงปริมาณที่ติดตามได้" />
      ) : (
        rows.map((item) => (
          <div key={item.key} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text strong style={{ fontSize: 13 }}>
                {item.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.actual.toLocaleString('th-TH')}/{item.planned.toLocaleString('th-TH')} {item.unit}
              </Text>
            </div>
            <Progress
              percent={Number(item.percent.toFixed(2))}
              strokeColor={COLORS.success}
              format={(pct) => `${pct}%`}
              size={['100%', 16]}
            />
          </div>
        ))
      )}

      <div
        style={{
          marginTop: 16,
          padding: '12px 16px',
          backgroundColor: COLORS.successBg,
          border: `1px solid ${COLORS.success}`,
          borderRadius: 8,
          textAlign: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          ความก้าวหน้าเชิงปริมาณเฉลี่ย (Average Physical Progress)
        </Text>
        <div>
          <Text strong style={{ fontSize: 24, color: COLORS.success }}>
            {overall.toFixed(1)}%
          </Text>
        </div>
      </div>
    </Card>
  );
}
