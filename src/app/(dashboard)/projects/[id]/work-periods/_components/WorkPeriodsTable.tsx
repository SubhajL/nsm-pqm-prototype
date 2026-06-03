'use client';

import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { StatusBadge } from '@/components/common/StatusBadge';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import type { WorkPeriod } from '@/types/work-period';

interface WorkPeriodsTableProps {
  workPeriods: WorkPeriod[];
  onManage: (workPeriod: WorkPeriod) => void;
}

/**
 * งวดงาน register. Numbers are right-aligned for vertical comparison
 * (SLDS/Carbon table convention, gap G6); status uses the bilingual
 * `workPeriod` StatusBadge; dates render in Buddhist era.
 */
export function WorkPeriodsTable({ workPeriods, onManage }: WorkPeriodsTableProps) {
  const columns: ColumnsType<WorkPeriod> = [
    {
      title: 'งวดที่ (No.)',
      dataIndex: 'number',
      key: 'number',
      width: 96,
      align: 'right',
      defaultSortOrder: 'ascend',
      sorter: (a, b) => a.number - b.number,
    },
    { title: 'ชื่องวดงาน (Title)', dataIndex: 'title', key: 'title' },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'state',
      key: 'state',
      render: (state: WorkPeriod['state']) => (
        <StatusBadge status={state} type="workPeriod" />
      ),
    },
    {
      title: 'มูลค่า (Amount)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number) => formatBaht(amount),
    },
    {
      title: 'สัดส่วน (%)',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right',
      render: (percentage: number) => `${percentage}%`,
    },
    {
      title: 'กำหนดส่งมอบ (Due)',
      key: 'due',
      render: (_: unknown, record: WorkPeriod) =>
        `${formatThaiDateShort(record.plannedStartDate)} – ${formatThaiDateShort(record.plannedEndDate)}`,
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      width: 140,
      render: (_: unknown, record: WorkPeriod) => (
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
      dataSource={workPeriods}
      pagination={false}
    />
  );
}
