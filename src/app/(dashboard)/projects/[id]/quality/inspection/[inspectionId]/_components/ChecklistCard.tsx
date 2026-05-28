'use client';

import { Button, Card, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import type { InspectionChecklistItem, WorkflowStatus } from '@/types/quality';

export function ChecklistCard({
  inspectionId,
  checklist,
  workflowStatus,
  canResolve,
  resolveItemPending,
  onResolve,
}: {
  inspectionId: string;
  checklist: InspectionChecklistItem[];
  workflowStatus: WorkflowStatus;
  canResolve: boolean;
  resolveItemPending: boolean;
  onResolve: (checklistItemId: string) => Promise<void>;
}) {
  const checklistColumns: ColumnsType<InspectionChecklistItem> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_: unknown, __: InspectionChecklistItem, index: number) =>
        index + 1,
    },
    {
      title: 'รายการ (Item)',
      dataIndex: 'item',
      key: 'item',
    },
    {
      title: 'เกณฑ์ (Criteria)',
      dataIndex: 'criteria',
      key: 'criteria',
    },
    {
      title: 'ผลตรวจ (Result)',
      dataIndex: 'result',
      key: 'result',
      width: 150,
      align: 'center',
      render: (result: string) => {
        if (result === 'pass') {
          return <Tag color="green">ผ่าน (PASS)</Tag>;
        }
        return <Tag color="red">ไม่ผ่าน (FAIL)</Tag>;
      },
    },
    {
      title: 'หมายเหตุ (Note)',
      dataIndex: 'note',
      key: 'note',
      width: 200,
    },
    ...(canResolve && workflowStatus !== 'signed'
      ? [
          {
            title: 'จัดการ',
            key: 'actions',
            width: 140,
            align: 'center' as const,
            render: (_: unknown, record: InspectionChecklistItem) => {
              if (record.result !== 'fail') return null;
              return (
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  style={{ backgroundColor: COLORS.success, borderColor: COLORS.success }}
                  loading={resolveItemPending}
                  onClick={async () => {
                    try {
                      await onResolve(record.id);
                      message.success(`แก้ไข "${record.item}" เป็นผ่านแล้ว — แจ้ง PM เรียบร้อย`);
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'ไม่สามารถแก้ไขได้');
                    }
                  }}
                >
                  แก้ไขเป็นผ่าน
                </Button>
              );
            },
          },
        ]
      : []),
  ];

  // Reference inspectionId to keep prop API stable
  void inspectionId;

  return (
    <Card
      title="รายการตรวจสอบ (Checklist)"
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Table<InspectionChecklistItem>
        columns={checklistColumns}
        dataSource={checklist}
        rowKey="id"
        pagination={false}
        size="middle"
        rowClassName={(record) =>
          record.result === 'fail' ? 'inspection-fail-row' : ''
        }
        onRow={(record) => ({
          style: {
            backgroundColor:
              record.result === 'fail'
                ? 'rgba(231, 76, 60, 0.08)'
                : undefined,
          },
        })}
      />
    </Card>
  );
}
