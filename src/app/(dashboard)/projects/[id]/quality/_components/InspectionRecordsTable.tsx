'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Popconfirm, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

import { formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { ITPItem, InspectionRecord } from '@/types/quality';

export function InspectionRecordsTable({
  projectId,
  inspectionRecords,
  itpItems,
  canManageQuality,
  onOpenCreate,
  onDelete,
}: {
  projectId: string;
  inspectionRecords: InspectionRecord[];
  itpItems: ITPItem[];
  canManageQuality: boolean;
  onOpenCreate: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const router = useRouter();

  const inspectionColumns: ColumnsType<InspectionRecord> = [
    {
      title: 'หัวข้อการตรวจ',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, record) => (
        <Button
          type="link"
          style={{ paddingInline: 0 }}
          onClick={() => router.push(`/projects/${projectId}/quality/inspection/${record.id}`)}
        >
          {value}
        </Button>
      ),
    },
    {
      title: 'วันที่',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (value: string) => formatThaiDateShort(value),
    },
    {
      title: 'ITP',
      dataIndex: 'itpId',
      key: 'itpId',
      width: 180,
      render: (value: string) => itpItems.find((item) => item.id === value)?.item ?? value,
    },
    {
      title: 'ผลรวม',
      dataIndex: 'overallResult',
      key: 'overallResult',
      width: 140,
      render: (value: string) =>
        value === 'pass' ? (
          <Tag color="green">ผ่าน (PASS)</Tag>
        ) : (
          <Tag color="red">ไม่ผ่านเงื่อนไข (CONDITIONAL)</Tag>
        ),
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_value, record) =>
        canManageQuality ? (
          <Popconfirm
            title="ลบผลตรวจนี้"
            description="ต้องการลบผลตรวจคุณภาพนี้ใช่หรือไม่"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={async () => {
              try {
                await onDelete(record.id);
                message.success('ลบผลตรวจคุณภาพแล้ว');
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถลบผลตรวจได้');
              }
            }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label={`ลบผลตรวจ ${record.title}`}
            />
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <Card
      title="บันทึกผลตรวจคุณภาพ (Inspection Records)"
      extra={
        canManageQuality ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreate}
            style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
          >
            บันทึกผลตรวจใหม่
          </Button>
        ) : null
      }
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <Table<InspectionRecord>
        columns={inspectionColumns}
        dataSource={inspectionRecords}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'ยังไม่มีบันทึกผลตรวจคุณภาพ' }}
      />
    </Card>
  );
}
