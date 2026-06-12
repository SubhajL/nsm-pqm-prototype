'use client';

import { useState } from 'react';
import { Button, Card, Skeleton, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { EmptyState } from '@/components/common';
import { useProcurementPackages } from '@/hooks/useProcurement';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useAuthStore } from '@/stores/useAuthStore';

import { ContractsSection } from './ContractsSection';
import { CreatePackageModal } from './CreatePackageModal';
import { PackageDetailDrawer } from './PackageDetailDrawer';
import { PrequalificationSection } from './PrequalificationSection';
import { ProcurementPackagesTable } from './ProcurementPackagesTable';
import { canManageProcurement } from './procurement-actions';

const { Title } = Typography;

export function ProcurementClient() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: packages, isLoading } = useProcurementPackages(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canManage = canManageProcurement(currentUser?.role);
  const selected = packages?.find((pkg) => pkg.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div>
        <Title level={3}>จัดซื้อจัดจ้าง (Procurement &amp; Contracts)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  const list = packages ?? [];

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
          จัดซื้อจัดจ้าง (Procurement &amp; Contracts)
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            สร้างชุดจัดซื้อ (Create Package)
          </Button>
        )}
      </div>

      <Card
        title="ชุดจัดซื้อจัดจ้าง (Procurement Packages)"
        style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      >
        {list.length === 0 ? (
          <EmptyState
            title="ยังไม่มีชุดจัดซื้อจัดจ้าง (No procurement packages yet)"
            description="สร้างชุดจัดซื้อเพื่อเริ่มติดตาม TOR ราคากลาง และการประมูล"
          />
        ) : (
          <ProcurementPackagesTable
            packages={list}
            onManage={(pkg) => setSelectedId(pkg.id)}
          />
        )}
      </Card>

      <ContractsSection projectId={projectId} packages={list} canManage={canManage} />

      <PrequalificationSection projectId={projectId} canManage={canManage} />

      <CreatePackageModal
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <PackageDetailDrawer
        projectId={projectId}
        procurementPackage={selected}
        canManage={canManage}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
