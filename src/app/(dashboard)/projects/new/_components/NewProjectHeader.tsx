'use client';

import { Button, Typography } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

const { Title, Text } = Typography;

export function NewProjectHeader({
  onDemoFill,
}: {
  onDemoFill: () => void;
}) {
  return (
    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          สร้างโครงการใหม่ (New Project)
        </Title>
        <Text type="secondary">
          หน้าแรก / โครงการทั้งหมด / สร้างโครงการใหม่
        </Text>
      </div>
      <Button
        icon={<ExperimentOutlined />}
        onClick={onDemoFill}
        style={{ borderColor: COLORS.accentTeal, color: COLORS.accentTeal }}
      >
        Demo: Scenario 1 ก่อสร้างครบวงจร
      </Button>
    </div>
  );
}
