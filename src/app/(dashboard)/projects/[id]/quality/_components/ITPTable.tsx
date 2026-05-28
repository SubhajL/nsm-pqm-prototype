'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { ITPItem, InspectionRecord } from '@/types/quality';
import { INSPECTION_TYPE_MAP, ITP_STATUS_MAP } from './constants';

export function ITPTable({
  projectId,
  itpItems,
  inspectionByItpId,
}: {
  projectId: string;
  itpItems: ITPItem[];
  inspectionByItpId: Map<string, InspectionRecord>;
}) {
  const router = useRouter();

  const columns: ColumnsType<ITPItem> = [
    {
      title: 'ลำดับ (Sequence)',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 100,
      align: 'center',
    },
    {
      title: 'รายการตรวจสอบ (Inspection Item)',
      dataIndex: 'item',
      key: 'item',
      render: (text: string, record: ITPItem) => {
        const linkedInspection = inspectionByItpId.get(record.id);
        if (linkedInspection) {
          return (
            <Button
              type="link"
              style={{ paddingInline: 0, whiteSpace: 'normal', textAlign: 'left', height: 'auto' }}
              onClick={() => router.push(`/projects/${projectId}/quality/inspection/${linkedInspection.id}`)}
            >
              {text}
            </Button>
          );
        }
        return text;
      },
    },
    {
      title: 'มาตรฐานอ้างอิง (Standard)',
      dataIndex: 'standard',
      key: 'standard',
      width: 140,
    },
    {
      title: 'ประเภทจุดตรวจสอบ (Inspection Type)',
      dataIndex: 'inspectionType',
      key: 'inspectionType',
      width: 180,
      align: 'center',
      render: (type: string) => {
        const entry = INSPECTION_TYPE_MAP[type] ?? {
          label: type,
          color: 'default',
        };
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
    {
      title: 'ผู้ตรวจสอบ (Inspector)',
      dataIndex: 'inspector',
      key: 'inspector',
      width: 180,
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      align: 'center',
      render: (status: string) => {
        const entry = ITP_STATUS_MAP[status] ?? {
          label: status,
          color: 'default',
        };
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
  ];

  return (
    <Card
      title="Inspection Test Plan (ITP)"
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Table<ITPItem>
        columns={columns}
        dataSource={itpItems}
        rowKey="id"
        pagination={false}
        size="middle"
        onRow={(record) => ({
          onClick: () => {
            const linkedInspection = inspectionByItpId.get(record.id);
            if (linkedInspection) {
              router.push(`/projects/${projectId}/quality/inspection/${linkedInspection.id}`);
            }
          },
          style: {
            cursor: inspectionByItpId.has(record.id) ? 'pointer' : 'default',
            backgroundColor:
              inspectionByItpId.has(record.id)
                ? 'rgba(0,184,148,0.06)'
                : undefined,
          },
        })}
      />
    </Card>
  );
}
