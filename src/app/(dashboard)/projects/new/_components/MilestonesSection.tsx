'use client';

import { Alert, Button, Divider, Input, InputNumber, Table, Typography } from 'antd';
import { BahtInput } from '@/components/common';
import { PlusOutlined } from '@ant-design/icons';

import { COLORS } from '@/theme/antd-theme';
import { formatBaht } from '@/lib/date-utils';

import { formatPercentage, type MilestoneRow } from './helpers';

const { Text } = Typography;

export function MilestonesSection({
  milestones,
  currentBudget,
  onMilestoneChange,
  onAddMilestone,
}: {
  milestones: MilestoneRow[];
  currentBudget: number;
  onMilestoneChange: (key: number, field: keyof MilestoneRow, value: string | number | null) => void;
  onAddMilestone: () => void;
}) {
  const totalAmount = milestones.reduce((s, r) => s + r.amount, 0);
  const totalPercentage = milestones.reduce((s, r) => s + r.percentage, 0);

  const milestoneColumns = [
    {
      title: 'งวด',
      dataIndex: 'milestone',
      key: 'milestone',
      width: 70,
      align: 'center' as const,
      render: (val: number) => <Text strong>#{val}</Text>,
    },
    {
      title: 'ค่าใช้จ่าย (บาท)',
      dataIndex: 'amount',
      key: 'amount',
      width: 200,
      render: (val: number, record: MilestoneRow) => (
        <BahtInput
          value={val}
          min={0}
          onChange={(v) => onMilestoneChange(record.key, 'amount', v)}
        />
      ),
    },
    {
      title: 'สัดส่วน %',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 120,
      render: (val: number, record: MilestoneRow) => (
        <InputNumber
          value={val}
          min={0}
          max={100}
          style={{ width: '100%' }}
          addonAfter="%"
          onChange={(v) => onMilestoneChange(record.key, 'percentage', v)}
        />
      ),
    },
    {
      title: 'สิ่งส่งมอบ (Deliverables)',
      dataIndex: 'deliverable',
      key: 'deliverable',
      render: (val: string, record: MilestoneRow) => (
        <Input
          value={val}
          onChange={(e) => onMilestoneChange(record.key, 'deliverable', e.target.value)}
        />
      ),
    },
  ];

  return (
    <>
      <Divider orientation="left" orientationMargin={0}>
        <Text strong style={{ fontSize: 16 }}>
          งวดงาน (Payment Milestones)
        </Text>
      </Divider>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="หลักการคำนวณงวดงาน"
        description="เมื่อแก้ไขเปอร์เซ็นต์ ระบบจะคำนวณจำนวนเงินจากงบประมาณโครงการให้ทันที เมื่อแก้ไขจำนวนเงิน ระบบจะคำนวณยอดรวมและสัดส่วนของทุกงวดใหม่อัตโนมัติ และเมื่อต้องการเพิ่มงวดงานใหม่ ระบบจะเพิ่มแถวว่างให้ โดยไม่ล้างสัดส่วนเดิม"
      />

      <Table
        dataSource={milestones}
        columns={milestoneColumns}
        pagination={false}
        size="middle"
        bordered
        rowKey="key"
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row
              style={{ background: COLORS.tableHeaderBg }}
            >
              <Table.Summary.Cell index={0} align="center">
                <Text strong>รวม</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong>{formatBaht(totalAmount)} บาท</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <Text
                  strong
                  style={{ color: totalPercentage === 100 ? COLORS.success : COLORS.error }}
                >
                  {formatPercentage(totalPercentage)}%
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <Text type="secondary">
                  {totalAmount === 0
                    ? 'กรุณากำหนดงวดงานใหม่'
                    : totalAmount === currentBudget
                      ? 'ยอดรวมตรงกับงบประมาณโครงการ'
                      : totalAmount < currentBudget
                        ? `ต่ำกว่างบประมาณ ${formatBaht(currentBudget - totalAmount)} บาท`
                        : `เกินงบประมาณ ${formatBaht(totalAmount - currentBudget)} บาท`}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={onAddMilestone}
        style={{ marginTop: 12, width: '100%' }}
      >
        + เพิ่มงวดงาน (Add Milestone)
      </Button>
    </>
  );
}
