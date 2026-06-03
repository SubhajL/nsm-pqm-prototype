'use client';

import { Card, Empty, Typography } from 'antd';
import dynamic from 'next/dynamic';

import type { EVMDataPoint } from '@/types/evm';

const { Text } = Typography;

// SSR-unsafe (ECharts touches window/document on init) — must be
// dynamically imported per the charts/CLAUDE.md rule.
const ProgressComparisonChart = dynamic(
  () =>
    import('@/components/charts/ProgressComparisonChart').then((m) => ({
      default: m.ProgressComparisonChart,
    })),
  { ssr: false },
);

interface ProgressComparisonCardProps {
  evmData: EVMDataPoint[] | undefined;
  bac: number;
}

export function ProgressComparisonCard({
  evmData,
  bac,
}: ProgressComparisonCardProps) {
  const hasRenderableData = bac > 0 && (evmData?.length ?? 0) > 0;

  return (
    <Card
      title="เปรียบเทียบแผน vs จริง (Planned vs Actual Progress)"
      styles={{ body: { padding: '16px 24px' } }}
      style={{ marginBottom: 24 }}
    >
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        ความก้าวหน้าทางการเงิน (Financial progress: PV/BAC vs EV/BAC)
      </Text>
      {hasRenderableData && evmData ? (
        <ProgressComparisonChart data={evmData} bac={bac} height={320} />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="ยังไม่มีข้อมูลงวด — เพิ่ม snapshot EVM เพื่อแสดงเส้นเปรียบเทียบ"
        />
      )}
    </Card>
  );
}
