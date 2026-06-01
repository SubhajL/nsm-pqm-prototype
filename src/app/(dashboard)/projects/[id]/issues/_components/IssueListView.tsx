'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { EmptyState } from '@/components/common';
import { COLORS } from '@/theme/antd-theme';
import { formatThaiDate } from '@/lib/date-utils';
import type { Issue } from '@/types/risk';
import { ISSUE_SEVERITY_LABELS, ISSUE_STATUS_LABELS } from '@/types/risk';

import type { IssueDestination } from './helpers';

export function IssueListView({
  projectId,
  allIssues,
  issueDestinations,
}: {
  projectId: string;
  allIssues: Issue[];
  issueDestinations: Record<string, IssueDestination>;
}) {
  const router = useRouter();

  const tableColumns: ColumnsType<Issue> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'หัวข้อ (Title)',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (_title: string, record: Issue) => (
        <Link href={issueDestinations[record.id]?.href ?? `/projects/${projectId}`} style={{ color: COLORS.info }}>
          {record.title}
        </Link>
      ),
    },
    {
      title: 'ความรุนแรง (Severity)',
      dataIndex: 'severity',
      key: 'severity',
      width: 160,
      align: 'center',
      render: (sev: Issue['severity']) => {
        const entry = ISSUE_SEVERITY_LABELS[sev];
        return <Tag color={entry.color}>{entry.th} ({entry.en})</Tag>;
      },
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      align: 'center',
      render: (status: Issue['status']) => {
        const entry = ISSUE_STATUS_LABELS[status];
        return <Tag color={entry.color}>{entry.th} ({entry.en})</Tag>;
      },
    },
    {
      title: 'ผู้รับผิดชอบ (Assignee)',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 140,
    },
    {
      title: 'WBS',
      dataIndex: 'linkedWbs',
      key: 'linkedWbs',
      width: 100,
    },
    {
      title: 'SLA (ชม.)',
      dataIndex: 'slaHours',
      key: 'slaHours',
      width: 90,
      align: 'center',
    },
    {
      title: 'วันที่สร้าง (Created)',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
      render: (date: string) => formatThaiDate(date),
    },
  ];

  return (
    <Card
      title="รายการปัญหาทั้งหมด (All Issues)"
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Table<Issue>
        columns={tableColumns}
        dataSource={allIssues}
        rowKey="id"
        pagination={{ pageSize: 12 }}
        size="middle"
        scroll={{ x: 1000 }}
        onRow={(record) => ({
          onClick: () => router.push(issueDestinations[record.id]?.href ?? `/projects/${projectId}`),
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: (
            <EmptyState
              size="small"
              title="ยังไม่มีปัญหาในโครงการนี้ (No issues yet)"
            />
          ),
        }}
      />
    </Card>
  );
}
