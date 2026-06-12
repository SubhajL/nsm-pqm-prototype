'use client';

import { Card, Tabs, Typography } from 'antd';

import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useAuthStore } from '@/stores/useAuthStore';

import { EiaTab } from './EiaTab';
import { HearingsTab } from './HearingsTab';
import { LandTab } from './LandTab';
import { PermitsTab } from './PermitsTab';
import { canManageCompliance } from './permits-actions';

const { Title } = Typography;

/**
 * Four human-maintained readiness registers in one tabset. Each tab owns
 * its summary chips, table, and create modal; only one tab (and therefore
 * one primary CTA) is visible at a time.
 */
export function PermitsLandClient() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const currentUser = useAuthStore((s) => s.currentUser);
  const canManage = canManageCompliance(currentUser?.role);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Title level={3} style={{ margin: 0 }}>
        ใบอนุญาตและที่ดิน (Permits &amp; Land)
      </Title>

      <Card style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <Tabs
          items={[
            {
              key: 'permits',
              label: 'ใบอนุญาต (Permits)',
              children: <PermitsTab projectId={projectId} canManage={canManage} />,
            },
            {
              key: 'hearings',
              label: 'ประชาพิจารณ์ (Public Hearings)',
              children: <HearingsTab projectId={projectId} canManage={canManage} />,
            },
            {
              key: 'land',
              label: 'การจัดหาที่ดิน (Land Acquisition)',
              children: <LandTab projectId={projectId} canManage={canManage} />,
            },
            {
              key: 'eia',
              label: 'สิ่งแวดล้อม (EIA)',
              children: <EiaTab projectId={projectId} canManage={canManage} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
