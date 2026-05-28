'use client';

import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { COLORS } from '@/theme/antd-theme';
import { formatBahtCurrency, formatThaiDate } from '@/lib/date-utils';
import type { ChangeRequest } from '@/types/document';
import { CR_STATUS_LABELS } from '@/types/document';

export function ChangeRequestHistoryTable({
  allChangeRequests,
  isLoading,
  onRowClick,
}: {
  allChangeRequests: ChangeRequest[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}) {
  const columns: ColumnsType<ChangeRequest> = [
    {
      title: 'CR#',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: 'หัวข้อ (Title)',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      align: 'center',
      render: (status: ChangeRequest['status']) => {
        const entry = CR_STATUS_LABELS[status];
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
    {
      title: 'ผลกระทบงบ (Budget Impact)',
      dataIndex: 'budgetImpact',
      key: 'budgetImpact',
      width: 180,
      align: 'right',
      render: (value: number) => (
        <span
          style={{
            color: value > 0 ? COLORS.error : value < 0 ? COLORS.success : undefined,
            fontWeight: 500,
          }}
        >
          {value > 0 ? '+' : ''}
          {formatBahtCurrency(value)}
        </span>
      ),
    },
    {
      title: 'วันที่ (Date)',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      width: 140,
      render: (date: string) => formatThaiDate(date),
    },
  ];

  return (
    <Card
      title="ประวัติ Change Requests ทั้งหมด"
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Table<ChangeRequest>
        columns={columns}
        dataSource={allChangeRequests}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
        scroll={{ x: 800 }}
        onRow={(record) => ({
          onClick: () => onRowClick(record.id),
        })}
      />
    </Card>
  );
}
