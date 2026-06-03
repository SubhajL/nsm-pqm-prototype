'use client';

import { useState } from 'react';
import { Button, Card, Skeleton, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { EmptyState } from '@/components/common';
import { useProject } from '@/hooks/useProjects';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useWorkPeriods } from '@/hooks/useWorkPeriods';
import { canAccessAdmin } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { getProjectDeliveryMethod } from '@/types/project';

import { CreateWorkPeriodModal } from './CreateWorkPeriodModal';
import { FeatureDisabledNotice } from './FeatureDisabledNotice';
import { WorkPeriodDetailDrawer } from './WorkPeriodDetailDrawer';
import { WorkPeriodsTable } from './WorkPeriodsTable';

const { Title } = Typography;

function isFeatureDisabledError(error: unknown): boolean {
  const candidate = error as { code?: string; status?: number } | null;
  return candidate?.code === 'FEATURE_DISABLED' || candidate?.status === 503;
}

export function WorkPeriodsClient() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: project } = useProject(projectId);
  const { data: workPeriods, isLoading, error } = useWorkPeriods(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canManage =
    canAccessAdmin(currentUser?.role) || currentUser?.role === 'Project Manager';
  const deliveryMethod = getProjectDeliveryMethod(project ?? undefined);
  const selected = workPeriods?.find((wp) => wp.id === selectedId) ?? null;

  if (error && isFeatureDisabledError(error)) {
    return <FeatureDisabledNotice />;
  }

  if (isLoading) {
    return (
      <div>
        <Title level={3}>งวดงาน (Work Periods)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  const list = workPeriods ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          งวดงาน (Work Periods)
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            สร้างงวดงาน (Create Work Period)
          </Button>
        )}
      </div>

      <Card style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        {list.length === 0 ? (
          <EmptyState
            title="ยังไม่มีงวดงาน (No work periods yet)"
            description="สร้างงวดงานเพื่อเริ่มติดตามการส่งมอบ การตรวจรับ และการเบิกจ่าย"
          />
        ) : (
          <WorkPeriodsTable
            workPeriods={list}
            onManage={(workPeriod) => setSelectedId(workPeriod.id)}
          />
        )}
      </Card>

      <CreateWorkPeriodModal
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <WorkPeriodDetailDrawer
        projectId={projectId}
        workPeriod={selected}
        deliveryMethod={deliveryMethod}
        canManage={canManage}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
