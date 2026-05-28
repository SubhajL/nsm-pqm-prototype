'use client';

import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { COLORS } from '@/theme/antd-theme';

export function CreateProjectFAB() {
  return (
    <Link href="/projects/new">
      <Button
        type="primary"
        icon={<PlusOutlined />}
        size="large"
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 100,
          backgroundColor: COLORS.accentTeal,
          borderColor: COLORS.accentTeal,
          borderRadius: 8,
          height: 48,
          paddingInline: 24,
          boxShadow: '0 4px 12px rgba(0,184,148,0.4)',
        }}
      >
        สร้างโครงการใหม่
      </Button>
    </Link>
  );
}
