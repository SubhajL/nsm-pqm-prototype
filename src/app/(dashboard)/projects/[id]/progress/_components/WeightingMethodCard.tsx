'use client';

import { Card, Progress, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { WeightingRow } from '@/lib/project-progress-derivations';
import { COLORS } from '@/theme/antd-theme';

const { Text } = Typography;

export function WeightingMethodCard({
  rows,
  totalWeighted,
}: {
  rows: WeightingRow[];
  totalWeighted: number;
}) {
  const columns: ColumnsType<WeightingRow> = [
    { title: 'WBS', dataIndex: 'wbs', key: 'wbs', width: 60 },
    { title: 'กิจกรรม (Activity)', dataIndex: 'activity', key: 'activity' },
    {
      title: 'น้ำหนัก (%)',
      dataIndex: 'weight',
      key: 'weight',
      width: 90,
      align: 'center',
      render: (v: number) => `${v}%`,
    },
    {
      title: '% เสร็จ',
      dataIndex: 'completion',
      key: 'completion',
      width: 80,
      align: 'center',
      render: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: 'Weighted',
      dataIndex: 'weighted',
      key: 'weighted',
      width: 90,
      align: 'center',
      render: (v: number) => (
        <Text strong style={{ color: COLORS.accentTeal }}>
          {v.toFixed(2)}%
        </Text>
      ),
    },
  ];

  return (
    <Card
      title="วิธีน้ำหนักงาน (Weighting Method)"
      styles={{ body: { padding: '16px' } }}
      style={{ height: '100%' }}
    >
      <Table<WeightingRow>
        columns={columns}
        dataSource={rows}
        rowKey="key"
        pagination={false}
        size="small"
        locale={{ emptyText: 'ยังไม่มีข้อมูล WBS สำหรับโครงการนี้' }}
        summary={() => (
          <Table.Summary.Row style={{ backgroundColor: COLORS.tableHeaderBg }}>
            <Table.Summary.Cell index={0} colSpan={2}>
              <Text strong>รวม (Total)</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="center">
              <Text strong>100%</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="center">
              <Text strong>—</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="center">
              <Text strong style={{ color: COLORS.accentTeal, fontSize: 15 }}>
                {totalWeighted.toFixed(2)}%
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
      <div style={{ marginTop: 20 }}>
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
          ความก้าวหน้าถ่วงน้ำหนัก (Weighted Progress)
        </Text>
        <Progress
          percent={Number(totalWeighted.toFixed(2))}
          strokeColor={COLORS.accentTeal}
          format={(pct) => `${pct?.toFixed(2)}%`}
          size={['100%', 20]}
        />
      </div>
    </Card>
  );
}
