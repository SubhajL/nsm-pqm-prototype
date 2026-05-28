'use client';

import { Button, Card, Popconfirm, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';

import { formatBahtCurrency } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import { getPaidToDate } from '@/lib/evm-metrics';
import type { EVMDataPoint } from '@/types/evm';

export function EvmSnapshotsTable({
  evmData,
  isOutsourced,
  bac,
  canManageEvm,
  onOpenCreate,
  onDelete,
}: {
  evmData: EVMDataPoint[] | undefined;
  isOutsourced: boolean;
  bac: number;
  canManageEvm: boolean;
  onOpenCreate: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const evmColumns: ColumnsType<EVMDataPoint> = [
    {
      title: 'เดือน',
      dataIndex: 'monthThai',
      key: 'monthThai',
      width: 120,
    },
    {
      title: 'PV',
      dataIndex: 'pv',
      key: 'pv',
      render: (value: number) => formatBahtCurrency(value),
    },
    {
      title: 'EV',
      dataIndex: 'ev',
      key: 'ev',
      render: (value: number) => formatBahtCurrency(value),
    },
    {
      title: isOutsourced ? 'Paid to Date' : 'AC',
      key: 'actualAmount',
      render: (_value: unknown, record) => formatBahtCurrency(isOutsourced ? getPaidToDate(record) : record.ac),
    },
    ...(isOutsourced
      ? [
          {
            title: 'SPI',
            dataIndex: 'spi',
            key: 'spi',
            render: (value: number) => value.toFixed(2),
          },
          {
            title: 'จ่ายแล้ว/สัญญา',
            key: 'paidPercent',
            render: (_value: unknown, record: EVMDataPoint) => `${(((isOutsourced ? getPaidToDate(record) : record.ac) / Math.max(bac, 1)) * 100).toFixed(1)}%`,
          },
        ]
      : [
          {
            title: 'SPI',
            dataIndex: 'spi',
            key: 'spi',
            render: (value: number) => value.toFixed(2),
          },
          {
            title: 'CPI',
            dataIndex: 'cpi',
            key: 'cpi',
            render: (value: number) => value.toFixed(2),
          },
        ]),
    {
      title: 'จัดการ',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_value, record) =>
        canManageEvm ? (
          <Popconfirm
            title="ลบงวด EVM นี้"
            description="ต้องการลบข้อมูล EVM งวดนี้ใช่หรือไม่"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={async () => {
              try {
                await onDelete(record.id);
                message.success('ลบข้อมูลงวด EVM แล้ว');
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถลบข้อมูลงวด EVM ได้');
              }
            }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label={`ลบงวด EVM ${record.monthThai}`}
            />
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <Card
      title={isOutsourced ? 'งวดข้อมูลความก้าวหน้า/เบิกจ่าย (Contract Snapshots)' : 'งวดข้อมูล EVM (EVM Snapshots)'}
      extra={
        canManageEvm ? (
          <Button
            type="primary"
            onClick={onOpenCreate}
            style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
          >
            {isOutsourced ? 'บันทึกงวดเบิกจ่ายใหม่' : 'บันทึกงวด EVM ใหม่'}
          </Button>
        ) : null
      }
    >
      <Table<EVMDataPoint>
        columns={evmColumns}
        dataSource={evmData ?? []}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: isOutsourced ? 'ยังไม่มีข้อมูลงวดความก้าวหน้า/เบิกจ่าย' : 'ยังไม่มีข้อมูลงวด EVM' }}
      />
    </Card>
  );
}
