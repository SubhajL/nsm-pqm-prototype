'use client';

import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { StatusBadge } from '@/components/common/StatusBadge';
import { formatThaiDateShort } from '@/lib/date-utils';
import type { HandoverPacket } from '@/types/handover-packet';

interface HandoverPacketsTableProps {
  packets: HandoverPacket[];
  onManage: (packet: HandoverPacket) => void;
}

/** ชุดส่งมอบ register — status bilingual, dates in Buddhist era. */
export function HandoverPacketsTable({ packets, onManage }: HandoverPacketsTableProps) {
  const columns: ColumnsType<HandoverPacket> = [
    {
      title: 'สถานะ (Status)',
      dataIndex: 'state',
      key: 'state',
      render: (state: HandoverPacket['state']) => (
        <StatusBadge status={state} type="handover" />
      ),
    },
    {
      title: 'ส่งมอบเมื่อ (Submitted)',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (submittedAt: string | null) =>
        submittedAt ? formatThaiDateShort(submittedAt) : '—',
    },
    {
      title: 'รับมอบเมื่อ (Accepted)',
      dataIndex: 'acceptedAt',
      key: 'acceptedAt',
      render: (acceptedAt: string | null) =>
        acceptedAt ? formatThaiDateShort(acceptedAt) : '—',
    },
    {
      title: 'ประกัน (Warranty)',
      key: 'warranty',
      render: (_: unknown, record: HandoverPacket) =>
        record.warrantyStartDate && record.warrantyEndDate
          ? `${formatThaiDateShort(record.warrantyStartDate)} – ${formatThaiDateShort(record.warrantyEndDate)}`
          : '—',
    },
    {
      title: 'หมายเหตุ (Notes)',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '—',
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      width: 140,
      render: (_: unknown, record: HandoverPacket) => (
        <Button type="link" onClick={() => onManage(record)}>
          จัดการ (Manage)
        </Button>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      size="middle"
      columns={columns}
      dataSource={packets}
      pagination={false}
    />
  );
}
