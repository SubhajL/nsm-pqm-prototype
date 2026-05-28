'use client';

import { Alert, Button, Typography } from 'antd';

const { Title } = Typography;

export function DashboardError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div>
      <Title level={3}>แดชบอร์ดภาพรวมโครงการ (Portfolio Dashboard)</Title>
      <Alert
        type="error"
        showIcon
        message="ไม่สามารถโหลดข้อมูลโครงการได้"
        description={error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง'}
        action={
          <Button size="small" onClick={onRetry}>
            ลองใหม่
          </Button>
        }
      />
    </div>
  );
}
