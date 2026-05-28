'use client';

import { Card, Empty, Timeline } from 'antd';

type ActivityItem = {
  color: string;
  children: React.ReactNode;
};

export function ActivityTimelineCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card
      title="กิจกรรมล่าสุด (Recent Activity)"
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        height: '100%',
      }}
    >
      {items.length > 0 ? (
        <Timeline items={items} />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="ยังไม่มีกิจกรรมล่าสุดสำหรับโครงการนี้"
        />
      )}
    </Card>
  );
}
