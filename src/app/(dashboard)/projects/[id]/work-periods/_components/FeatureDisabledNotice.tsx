'use client';

import { Card, Typography } from 'antd';

import { EmptyState } from '@/components/common';

const { Title } = Typography;

/**
 * Shown when the work-period API answers `503 FEATURE_DISABLED` — i.e. the
 * server flag `FEATURE_RID_PAYMENT_FLOW` is off even though the client nav
 * flag let the user reach the route. Degrades cleanly instead of throwing.
 */
export function FeatureDisabledNotice() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Title level={3} style={{ margin: 0 }}>
        งวดงาน (Work Periods)
      </Title>
      <Card style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <EmptyState
          title="ฟีเจอร์งวดงานยังไม่เปิดใช้งาน (Work-period flow not enabled)"
          description="ระบบงวดงาน–การเบิกจ่ายถูกปิดไว้ในสภาพแวดล้อมนี้ — ต้องตั้งค่า FEATURE_RID_PAYMENT_FLOW เพื่อเปิดใช้งาน"
        />
      </Card>
    </div>
  );
}
