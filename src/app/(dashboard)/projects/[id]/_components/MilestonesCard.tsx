'use client';

import { Card, Progress, Space, Steps, Tag, Typography } from 'antd';

import { StatusBadge } from '@/components/common/StatusBadge';
import { formatBahtCurrency, formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

type MilestoneView = {
  id?: string;
  name: string;
  status: string;
  amount: number;
  dueDate: string;
  displayStatus: string;
  progressPercent: number;
  icon: React.ReactNode;
};

export function MilestonesCard({
  currentStep,
  milestoneViews,
}: {
  currentStep: number;
  milestoneViews: MilestoneView[];
}) {
  return (
    <Card
      title="งวดงาน (Payment Milestones)"
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        height: '100%',
      }}
    >
      <Steps
        direction="vertical"
        current={currentStep}
        items={milestoneViews.map((ms) => {
          const isCompleted = ms.status === 'completed';
          const showProgress = !isCompleted && ms.progressPercent > 0;

          return {
            title: (
              <Space>
                <Text strong>{ms.name}</Text>
                <StatusBadge
                  status={ms.displayStatus}
                  type={ms.displayStatus === 'completed' ? 'milestone' : 'project'}
                />
              </Space>
            ),
            description: (
              <div style={{ paddingTop: 4 }}>
                <Text>
                  {formatBahtCurrency(ms.amount)} &middot; กำหนด{' '}
                  {formatThaiDateShort(ms.dueDate)}
                </Text>
                {isCompleted && (
                  <div style={{ marginTop: 4 }}>
                    <Tag color="success">ตรวจรับแล้ว</Tag>
                  </div>
                )}
                {showProgress && (
                  <div style={{ marginTop: 8, maxWidth: 240 }}>
                    <Progress
                      percent={ms.progressPercent}
                      size="small"
                      strokeColor={COLORS.info}
                    />
                  </div>
                )}
              </div>
            ),
            icon: ms.icon,
          };
        })}
      />
    </Card>
  );
}
