'use client';

import { useState } from 'react';
import { Alert, Button, Space, Spin, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useTransitionVendorSow, useVendorSows } from '@/hooks/useItClass';
import { formatThaiDateShort } from '@/lib/date-utils';
import {
  SOW_STATE_LABELS,
  type SowState,
  type VendorSow,
} from '@/types/vendor-sow';

import { CreateVendorSowModal } from './CreateVendorSowModal';
import {
  getLegalNextSowStates,
  isItOnlyFeatureError,
} from './it-class-actions';

interface VendorSowsTabProps {
  projectId: string;
  canManage: boolean;
}

/** สัญญาผู้ขาย register + per-row legal SOW transitions. */
export function VendorSowsTab({ projectId, canManage }: VendorSowsTabProps) {
  const { data, isLoading, error } = useVendorSows(projectId);
  const transition = useTransitionVendorSow(projectId);
  const [createOpen, setCreateOpen] = useState(false);

  const runTransition = async (sowId: string, targetState: SowState) => {
    try {
      await transition.mutateAsync({ sowId, targetState });
      message.success(`อัปเดต SOW เป็น "${SOW_STATE_LABELS[targetState].th}" แล้ว`);
      announce(`อัปเดตสถานะ SOW เป็น ${SOW_STATE_LABELS[targetState].th}`);
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
        announce(`เกิดข้อผิดพลาด: ${err.message}`, 'assertive');
      }
    }
  };

  if (isLoading) return <Spin />;
  if (error && isItOnlyFeatureError(error)) {
    return (
      <Alert
        type="info"
        showIcon
        message="เฉพาะโครงการ IT (IT-class projects only)"
        description="หน้านี้ใช้ได้เฉพาะโครงการประเภท IT ตามแนวทาง DT6"
      />
    );
  }

  const list = data ?? [];

  const columns: ColumnsType<VendorSow> = [
    { title: 'งวด (Phase)', dataIndex: 'phase', key: 'phase' },
    {
      title: 'ขอบเขต (Scope)',
      dataIndex: 'scopeSummary',
      key: 'scopeSummary',
      ellipsis: true,
    },
    {
      title: 'สถานะ (State)',
      dataIndex: 'state',
      key: 'state',
      render: (state: VendorSow['state']) => (
        <StatusBadge status={state} type="vendorSow" />
      ),
    },
    {
      title: 'ประกัน (Warranty)',
      dataIndex: 'warrantyMonths',
      key: 'warrantyMonths',
      render: (m: number | null) => (m === null ? '—' : `${m} เดือน`),
    },
    {
      title: 'ลงนาม (Signed)',
      dataIndex: 'signedAt',
      key: 'signedAt',
      render: (d: string | null) => (d ? formatThaiDateShort(d) : '—'),
    },
    ...(canManage
      ? [
          {
            title: 'ดำเนินการ (Actions)',
            key: 'actions',
            render: (_: unknown, sow: VendorSow) => (
              <Space wrap>
                {getLegalNextSowStates(sow.state).map((state) => (
                  <Button
                    key={state}
                    size="small"
                    danger={state === 'rejected'}
                    loading={transition.isPending}
                    onClick={() => runTransition(sow.id, state)}
                  >
                    {`${SOW_STATE_LABELS[state].th} (${SOW_STATE_LABELS[state].en})`}
                  </Button>
                ))}
              </Space>
            ),
          } satisfies ColumnsType<VendorSow>[number],
        ]
      : []),
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {canManage && (
        <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          สร้าง SOW (Create SOW)
        </Button>
      )}

      {list.length === 0 ? (
        <EmptyState
          size="small"
          title="ยังไม่มีสัญญาผู้ขาย (No vendor SOW recorded yet)"
        />
      ) : (
        <Table<VendorSow>
          rowKey="id"
          size="middle"
          dataSource={list}
          pagination={false}
          columns={columns}
        />
      )}

      <CreateVendorSowModal
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </Space>
  );
}
