'use client';

import { Alert, Button, Card, Popconfirm, Space, Table, Typography } from 'antd';

import { EmptyState, LoadingSkeleton } from '@/components/common';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

import type { BOQItem } from '@/hooks/useBOQ';
import { formatBaht, formatBahtCurrency } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

export function BoqTablePanel({
  selectedWbsId,
  selectedNodeName,
  isOutsourced,
  boqLoading,
  boqItems,
  boqTotalSum,
  canCreateBoq,
  onOpenCreateBoq,
  onEditBoq,
  onDeleteBoq,
  deletePending,
}: {
  selectedWbsId: string | undefined;
  selectedNodeName: string;
  isOutsourced: boolean;
  boqLoading: boolean;
  boqItems: BOQItem[] | undefined;
  boqTotalSum: number;
  canCreateBoq: boolean;
  onOpenCreateBoq: () => void;
  /** PR-C2 — per-row Edit/Delete actions appear when these are set. */
  onEditBoq?: (item: BOQItem) => void;
  onDeleteBoq?: (item: BOQItem) => void | Promise<void>;
  deletePending?: boolean;
}) {
  const showActions = Boolean(onEditBoq || onDeleteBoq);
  // BOQ table columns
  const boqColumns: ColumnsType<BOQItem> = [
    {
      title: 'ลำดับ',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_val, _rec, index) => index + 1,
    },
    {
      title: 'รายการ (Description)',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'ปริมาณ (Qty)',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => formatBaht(qty),
    },
    {
      title: 'หน่วย (Unit)',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      align: 'center',
    },
    {
      title: 'ราคา/หน่วย (Unit Price)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 140,
      align: 'right',
      render: (price: number) => formatBaht(price),
    },
    {
      title: 'รวม (Total)',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (total: number) => (
        <span style={{ fontWeight: 600 }}>{formatBaht(total)}</span>
      ),
    },
    ...(showActions
      ? ([
          {
            title: 'จัดการ (Actions)',
            key: 'actions',
            width: 160,
            render: (_: unknown, item: BOQItem) => (
              <Space size={4}>
                {onEditBoq ? (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEditBoq(item)}
                    aria-label={`แก้ไข ${item.description} (Edit)`}
                  />
                ) : null}
                {onDeleteBoq ? (
                  <Popconfirm
                    title="ลบรายการ BOQ นี้?"
                    okText="ลบ"
                    cancelText="ยกเลิก"
                    okButtonProps={{ danger: true, loading: deletePending }}
                    onConfirm={() => void onDeleteBoq(item)}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      aria-label={`ลบ ${item.description} (Delete)`}
                    />
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ] as ColumnsType<BOQItem>)
      : []),
  ];

  return (
    <Card
      title={
        selectedWbsId
          ? `BOQ — ${selectedNodeName}`
          : 'BOQ'
      }
      styles={{ body: { padding: '12px 16px' } }}
    >
      {isOutsourced ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="BOQ สำหรับโครงการจ้างภายนอกเป็นแบบอ่านอย่างเดียว"
          description="การเปลี่ยนแปลง BOQ ต้องผ่านกระบวนการแก้ไขสัญญา ไม่ใช่แก้จากหน้า WBS"
        />
      ) : null}
      {!selectedWbsId ? (
        <EmptyState
          size="default"
          title="เลือก WBS node เพื่อดู BOQ (Select a WBS node to view BOQ)"
        />
      ) : boqLoading ? (
        <LoadingSkeleton variant="paragraph" rows={6} />
      ) : boqItems && boqItems.length > 0 ? (
        <>
          <Table<BOQItem>
            columns={boqColumns}
            dataSource={boqItems}
            rowKey="id"
            pagination={false}
            size="middle"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5} align="right">
                    <Text strong>รวมหมวด:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text
                      strong
                      style={{ color: COLORS.primary, fontSize: 15 }}
                    >
                      {formatBahtCurrency(boqTotalSum)}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
          {canCreateBoq ? (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={onOpenCreateBoq}
              style={{ marginTop: 12, width: '100%' }}
            >
              + เพิ่มรายการ BOQ
            </Button>
          ) : null}
        </>
      ) : (
        <EmptyState
          size="small"
          title="ไม่มีรายการ BOQ สำหรับ WBS node นี้ (No BOQ items for this WBS node)"
          action={
            canCreateBoq
              ? {
                  label: 'เพิ่มรายการ BOQ (Add BOQ item)',
                  icon: <PlusOutlined />,
                  onClick: onOpenCreateBoq,
                }
              : undefined
          }
        />
      )}
    </Card>
  );
}
