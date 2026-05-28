'use client';

import { Button, Card, Space } from 'antd';
import {
  ArrowUpOutlined,
  FileTextOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

export function QuickActionsCard({ projectId }: { projectId: string }) {
  return (
    <Card
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <Space size="middle" wrap>
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          href={`/projects/${projectId}/daily-report`}
          style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
        >
          สร้างรายงานประจำวัน
        </Button>
        <Button
          icon={<ArrowUpOutlined />}
          href={`/projects/${projectId}/progress`}
        >
          อัปเดต Progress
        </Button>
        <Button
          icon={<PlusOutlined />}
          href={`/projects/${projectId}/issues`}
        >
          เพิ่มปัญหา
        </Button>
      </Space>
    </Card>
  );
}
