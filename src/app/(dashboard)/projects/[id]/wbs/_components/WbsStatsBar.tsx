'use client';

import { Card, Typography } from 'antd';

import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

export function WbsStatsBar({
  stats,
}: {
  stats: { level1: number; level2: number; milestones: number };
}) {
  return (
    <Card
      size="small"
      style={{
        marginTop: 16,
        backgroundColor: COLORS.bgLayout,
        borderColor: COLORS.borderLight,
      }}
    >
      <Text type="secondary">
        ระดับ 1: {stats.level1} | ระดับ 2: {stats.level2} | Milestones: {stats.milestones}
      </Text>
    </Card>
  );
}
