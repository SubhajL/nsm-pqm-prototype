'use client';

import { Card, Progress, Tag, Typography } from 'antd';

import { COLORS } from '@/theme/antd-theme';
import { getProjectDeliveryMethod } from '@/types/project';

const { Text } = Typography;

export interface EVMMetric {
  key: string;
  label: string;
  value: string;
  color: string;
  tag?: { color: string; icon: React.ReactNode; text: string };
}

export function EVMCard({
  metrics,
  evmPercent,
  deliveryMethod,
}: {
  metrics: EVMMetric[];
  evmPercent: number;
  deliveryMethod: ReturnType<typeof getProjectDeliveryMethod>;
}) {
  return (
    <Card
      title={deliveryMethod === 'outsourced' ? 'Contract Progress & Payment' : 'Earned Value Management (EVM)'}
      styles={{ body: { padding: '16px' } }}
      style={{ height: '100%' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.key}
            style={{
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 8,
              padding: '12px 16px',
              textAlign: 'center',
            }}
          >
            <Text type="secondary" style={{ fontSize: 11 }}>
              {metric.label}
            </Text>
            <div>
              <Text strong style={{ fontSize: 22, color: metric.color }}>
                {metric.value}
              </Text>
            </div>
            {metric.tag && (
              <Tag
                color={metric.tag.color}
                icon={metric.tag.icon}
                style={{ marginTop: 4, fontSize: 11 }}
              >
                {metric.tag.text}
              </Tag>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
          {deliveryMethod === 'outsourced' ? 'EV/BAC Progress' : 'EV/BAC Progress'}
        </Text>
        <Progress
          percent={Number(evmPercent.toFixed(1))}
          strokeColor={COLORS.info}
          format={(pct) => `${pct}%`}
          size={['100%', 20]}
        />
      </div>
    </Card>
  );
}
