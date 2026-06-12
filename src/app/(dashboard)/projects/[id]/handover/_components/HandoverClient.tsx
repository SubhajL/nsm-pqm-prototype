'use client';

import { useState } from 'react';
import { Button, Card, Skeleton, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { EmptyState } from '@/components/common';
import { useHandoverPackets } from '@/hooks/useHandover';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { useAuthStore } from '@/stores/useAuthStore';

import { CreateHandoverPacketModal } from './CreateHandoverPacketModal';
import { HandoverPacketsTable } from './HandoverPacketsTable';
import { PacketDetailDrawer } from './PacketDetailDrawer';
import { canManageHandover } from './handover-actions';

const { Title } = Typography;

export function HandoverClient() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: packets, isLoading } = useHandoverPackets(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canManage = canManageHandover(currentUser?.role);
  const selected = packets?.find((packet) => packet.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div>
        <Title level={3}>การส่งมอบงาน (Handover &amp; O&amp;M)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  const list = packets ?? [];

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
          การส่งมอบงาน (Handover &amp; O&amp;M)
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            สร้างชุดส่งมอบ (Create Handover Packet)
          </Button>
        )}
      </div>

      <Card style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        {list.length === 0 ? (
          <EmptyState
            title="ยังไม่มีชุดส่งมอบ (No handover packets yet)"
            description="สร้างชุดส่งมอบเพื่อรวบรวมแบบก่อสร้างจริง คู่มือ O&M และทะเบียนทรัพย์สิน ตาม SOP 8.1"
          />
        ) : (
          <HandoverPacketsTable
            packets={list}
            onManage={(packet) => setSelectedId(packet.id)}
          />
        )}
      </Card>

      <CreateHandoverPacketModal
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <PacketDetailDrawer
        projectId={projectId}
        packet={selected}
        canManage={canManage}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
