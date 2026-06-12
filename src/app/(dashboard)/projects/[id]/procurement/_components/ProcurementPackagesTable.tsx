'use client';

import { Button, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { StatusBadge } from '@/components/common/StatusBadge';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import {
  PROCUREMENT_METHOD_LABELS,
  type ProcurementPackage,
} from '@/types/procurement-package';

interface ProcurementPackagesTableProps {
  packages: ProcurementPackage[];
  onManage: (pkg: ProcurementPackage) => void;
}

/**
 * ชุดจัดซื้อจัดจ้าง register. Numbers right-aligned for vertical
 * comparison; status uses the bilingual `procurement` StatusBadge; dates
 * render in Buddhist era.
 */
export function ProcurementPackagesTable({
  packages,
  onManage,
}: ProcurementPackagesTableProps) {
  const columns: ColumnsType<ProcurementPackage> = [
    { title: 'ชื่อชุดจัดซื้อ (Package)', dataIndex: 'name', key: 'name' },
    {
      title: 'วิธีจัดหา (Method)',
      dataIndex: 'procurementMethod',
      key: 'procurementMethod',
      render: (method: ProcurementPackage['procurementMethod']) => {
        const label = PROCUREMENT_METHOD_LABELS[method];
        return `${label.th} (${label.en})`;
      },
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'state',
      key: 'state',
      render: (state: ProcurementPackage['state']) => (
        <StatusBadge status={state} type="procurement" />
      ),
    },
    {
      title: 'วงเงิน (Budget Ceiling)',
      dataIndex: 'budgetCeiling',
      key: 'budgetCeiling',
      align: 'right',
      render: (budgetCeiling: number) => formatBaht(budgetCeiling),
    },
    {
      title: 'เปิดประมูล (Opened)',
      dataIndex: 'openedAt',
      key: 'openedAt',
      render: (openedAt: string | null) =>
        openedAt ? formatThaiDateShort(openedAt) : '—',
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      width: 140,
      render: (_: unknown, record: ProcurementPackage) => (
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
      dataSource={packages}
      pagination={false}
    />
  );
}
