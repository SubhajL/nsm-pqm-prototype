'use client';

import { Button, Card, Input, Select, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';

import { EmptyState } from '@/components/common';
import { formatThaiDate } from '@/lib/date-utils';
import { bilingual } from '@/lib/format/bilingual';
import { COLORS } from '@/theme/antd-theme';
import type { DailyReport, DailyReportStatus } from '@/types/daily-report';
import { DAILY_REPORT_STATUS_LABELS } from '@/types/daily-report';

import { STATUS_FILTER_OPTIONS, STATUS_TAG_COLORS } from './helpers';

const { Text } = Typography;

interface ReportListCardProps {
  isMobile: boolean;
  filteredReports: DailyReport[];
  searchText: string;
  statusFilter: 'all' | DailyReportStatus;
  selectedReportId: string | null;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | DailyReportStatus) => void;
  onSelectReport: (id: string) => void;
  onRowClick: (id: string) => void;
}

export function ReportListCard({
  isMobile,
  filteredReports,
  searchText,
  statusFilter,
  selectedReportId,
  onSearchChange,
  onStatusFilterChange,
  onSelectReport,
  onRowClick,
}: ReportListCardProps) {
  const columns: ColumnsType<DailyReport> = [
    {
      title: '#',
      dataIndex: 'reportNumber',
      key: 'reportNumber',
      width: 70,
      align: 'center',
    },
    {
      title: 'วันที่ (Date)',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (date: string) => formatThaiDate(date),
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: DailyReportStatus) => {
        const label = DAILY_REPORT_STATUS_LABELS[status];
        return (
          <Tag color={STATUS_TAG_COLORS[status]}>
            {bilingual(label.th, label.en)}
          </Tag>
        );
      },
    },
    {
      title: 'บุคลากร (Personnel)',
      dataIndex: 'totalPersonnel',
      key: 'totalPersonnel',
      width: 120,
      align: 'center',
      render: (val: number) => `${val} คน`,
    },
    {
      title: 'ปัญหา (Issues)',
      dataIndex: 'issues',
      key: 'issues',
      ellipsis: true,
      render: (text: string) => (
        <Text
          style={{ maxWidth: 200 }}
          ellipsis={{ tooltip: text }}
        >
          {text}
        </Text>
      ),
    },
    {
      title: 'จัดการ (Action)',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_: unknown, record: DailyReport) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => onSelectReport(record.id)}
          style={{ color: COLORS.info }}
        >
          ดู
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="รายการรายงาน (Report List)"
      styles={{ body: { padding: isMobile ? 12 : '16px 24px' } }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Input
          placeholder="ค้นหาจากเลขที่รายงาน, ปัญหา, ผู้จัดทำ"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          style={{ width: isMobile ? '100%' : 320 }}
        />
        <Select
          aria-label="สถานะรายงาน"
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={(value) => onStatusFilterChange(value)}
          style={{ width: isMobile ? '100%' : 240 }}
        />
      </div>
      <Table<DailyReport>
        columns={columns}
        dataSource={filteredReports}
        rowKey="id"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="middle"
        scroll={{ x: 900 }}
        onRow={(record) => ({
          onClick: () => {
            onRowClick(record.id);
          },
          style: {
            cursor: 'pointer',
            backgroundColor:
              record.id === selectedReportId
                ? 'rgba(0,184,148,0.06)'
                : undefined,
          },
        })}
        locale={{
          emptyText: (
            <EmptyState
              size="small"
              title="ไม่พบรายงาน (No reports found)"
              description="ปรับตัวกรองหรือสร้างรายงานใหม่ (Adjust filters or create a new report)"
            />
          ),
        }}
      />
    </Card>
  );
}
