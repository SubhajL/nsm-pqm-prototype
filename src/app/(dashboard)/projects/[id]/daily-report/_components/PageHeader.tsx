'use client';

import { Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';

const { Title } = Typography;

interface PageHeaderProps {
  isMobile: boolean;
  onCreateClick: () => void;
}

export function PageHeader({ isMobile, onCreateClick }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 12,
        marginBottom: 24,
      }}
    >
      <Title level={3} style={{ margin: 0 }}>
        รายงานประจำวัน (Daily Reports)
      </Title>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={onCreateClick}
        style={{
          backgroundColor: COLORS.accentTeal,
          borderColor: COLORS.accentTeal,
          width: isMobile ? '100%' : undefined,
        }}
      >
        สร้างรายงานใหม่
      </Button>
    </div>
  );
}
