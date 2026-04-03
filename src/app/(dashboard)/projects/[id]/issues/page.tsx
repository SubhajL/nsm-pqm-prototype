'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Segmented,
  Skeleton,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { useCreateIssue, useIssues, useUpdateIssueStatus } from '@/hooks/useIssues';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { COLORS } from '@/theme/antd-theme';
import { formatThaiDate } from '@/lib/date-utils';
import type { Issue, IssueStatus } from '@/types/risk';
import { ISSUE_SEVERITY_LABELS, ISSUE_STATUS_LABELS } from '@/types/risk';

const { Title, Text } = Typography;
const EMPTY_ISSUES: Issue[] = [];

const KANBAN_COLUMNS: { key: IssueStatus; label: string; headerColor: string }[] = [
  { key: 'open', label: 'เปิด (Open)', headerColor: COLORS.warning },
  { key: 'in_progress', label: 'กำลังแก้ไข (In Progress)', headerColor: COLORS.info },
  { key: 'review', label: 'รอตรวจสอบ (Review)', headerColor: COLORS.accentTeal },
  { key: 'closed', label: 'ปิดแล้ว (Closed)', headerColor: COLORS.success },
];

const SEVERITY_BORDER_COLOR: Record<string, string> = {
  high: COLORS.error,
  medium: COLORS.warning,
  low: COLORS.success,
};

type IssueDestination = {
  href: string;
  label: string;
};

function hasIssueTag(issue: Issue, targetTag: string) {
  return (issue.tags ?? []).some((tag) => tag.toLocaleLowerCase() === targetTag.toLocaleLowerCase());
}

function getIssueDestination(issue: Issue, projectId: string): IssueDestination {
  if (
    issue.sourceInspectionId ||
    issue.sourceType === 'quality_auto_ncr' ||
    hasIssueTag(issue, 'NCR') ||
    hasIssueTag(issue, 'QC')
  ) {
    return {
      href: issue.sourceInspectionId
        ? `/projects/${projectId}/quality/inspection/${issue.sourceInspectionId}`
        : `/projects/${projectId}/quality`,
      label: issue.sourceInspectionId
        ? 'ผลตรวจคุณภาพ (Inspection Detail)'
        : 'คุณภาพ (Quality)',
    };
  }

  if (
    issue.sourceRiskId ||
    issue.sourceType === 'risk_mitigation' ||
    hasIssueTag(issue, 'RISK') ||
    hasIssueTag(issue, 'MITIGATION')
  ) {
    return {
      href: `/projects/${projectId}/risk`,
      label: 'ความเสี่ยง (Risk)',
    };
  }

  if (issue.linkedWbs.trim() && issue.linkedWbs !== '-') {
    return {
      href: `/projects/${projectId}/wbs`,
      label: 'WBS/BOQ',
    };
  }

  return {
    href: `/projects/${projectId}`,
    label: 'ภาพรวมโครงการ (Overview)',
  };
}

function computeSlaStatus(issue: Issue): { text: string; overdue: boolean } {
  if (issue.closedAt) {
    return { text: 'แก้ไขแล้ว', overdue: false };
  }
  const created = new Date(issue.createdAt).getTime();
  const deadline = created + issue.slaHours * 60 * 60 * 1000;
  const now = new Date('2026-07-15T12:00:00').getTime(); // current demo date
  const remainMs = deadline - now;

  if (remainMs < 0) {
    const overdueHrs = Math.abs(Math.round(remainMs / (1000 * 60 * 60)));
    return { text: `เกิน SLA ${overdueHrs} ชม.`, overdue: true };
  }

  const remainHrs = Math.round(remainMs / (1000 * 60 * 60));
  if (remainHrs > 24) {
    const days = Math.floor(remainHrs / 24);
    return { text: `เหลือ ${days} วัน`, overdue: false };
  }
  return { text: `เหลือ ${remainHrs} ชม.`, overdue: remainHrs < 8 };
}

function IssueCard({
  issue,
  destination,
  onOpen,
}: {
  issue: Issue;
  destination: IssueDestination;
  onOpen: () => void;
}) {
  const sevEntry = ISSUE_SEVERITY_LABELS[issue.severity];
  const sla = computeSlaStatus(issue);

  return (
    <Card
      size="small"
      hoverable
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`${issue.title} - ${destination.label}`}
      style={{
        marginBottom: 8,
        borderTop: `3px solid ${SEVERITY_BORDER_COLOR[issue.severity]}`,
        borderRadius: 8,
        cursor: 'pointer',
      }}
      styles={{ body: { padding: 12 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text strong style={{ fontSize: 13 }}>{issue.title}</Text>
      </div>
      <Text type="secondary" style={{ fontSize: 11 }}>{issue.id}</Text>

      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <Tag color={sevEntry.color} style={{ fontSize: 11 }}>
          {sevEntry.th} ({sevEntry.en})
        </Tag>
        {issue.tags?.map((tag) => (
          <Tag key={tag} style={{ fontSize: 11 }}>{tag}</Tag>
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: sla.overdue ? COLORS.error : '#8c8c8c' }}>
        <ClockCircleOutlined style={{ marginRight: 4 }} />
        SLA: {sla.text}
      </div>

      <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
        {issue.linkedWbs}
      </div>

      {issue.status === 'in_progress' && issue.progress !== undefined && (
        <Progress
          percent={issue.progress}
          size="small"
          strokeColor={COLORS.info}
          style={{ marginTop: 8 }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: COLORS.primary }} />
        <Text style={{ fontSize: 12 }}>{issue.assignee}</Text>
      </div>
    </Card>
  );
}

export default function IssueTrackingPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const router = useRouter();
  const { data: issues, isLoading } = useIssues(projectId);
  const createIssue = useCreateIssue(projectId);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateMutation = useUpdateIssueStatus(projectId); // Available for drag-drop
  const [viewMode, setViewMode] = useState<string>('board');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  const allIssues = useMemo(() => issues ?? EMPTY_ISSUES, [issues]);
  const issueDestinations = useMemo(
    () =>
      allIssues.reduce<Record<string, IssueDestination>>((destinations, issue) => {
        destinations[issue.id] = getIssueDestination(issue, projectId);
        return destinations;
      }, {}),
    [allIssues, projectId],
  );

  const grouped = useMemo(() => {
    const groups: Record<IssueStatus, Issue[]> = {
      open: [],
      in_progress: [],
      review: [],
      closed: [],
    };
    allIssues.forEach((iss) => {
      if (groups[iss.status]) {
        groups[iss.status].push(iss);
      }
    });
    return groups;
  }, [allIssues]);

  const summaryText = useMemo(() => {
    return `เปิด: ${grouped.open.length} | กำลังแก้ไข: ${grouped.in_progress.length} | รอตรวจสอบ: ${grouped.review.length} | ปิดแล้ว: ${grouped.closed.length} | รวม: ${allIssues.length}`;
  }, [grouped, allIssues.length]);

  const handleCreateIssue = async () => {
    try {
      const values = await createForm.validateFields();
      await createIssue.mutateAsync(values);
      setIsCreateModalOpen(false);
      createForm.resetFields();
      message.success('เปิดเคสใหม่แล้ว');
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    }
  };

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

  if (isLoading) {
    return (
      <div>
        <Title level={3}>ติดตามปัญหา (Issue Tracking)</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          ติดตามปัญหา (Issue Tracking)
        </Title>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as string)}
            options={[
              { label: 'Board View', value: 'board', icon: <AppstoreOutlined /> },
              { label: 'List View', value: 'list', icon: <UnorderedListOutlined /> },
            ]}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createForm.setFieldsValue({
                title: '',
                severity: 'medium',
                assignee: '',
                linkedWbs: '',
                slaHours: 48,
              });
              setIsCreateModalOpen(true);
            }}
            style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
          >
            เปิดเคสใหม่
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <Card
        size="small"
        style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
        styles={{ body: { padding: '8px 16px' } }}
      >
        <Text strong>{summaryText}</Text>
      </Card>

      {/* Board View */}
      {viewMode === 'board' && (
        <Row gutter={[12, 12]}>
          {KANBAN_COLUMNS.map((col) => (
            <Col xs={24} sm={12} lg={6} key={col.key}>
              <Card
                size="small"
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{col.label}</span>
                    <Tag>{grouped[col.key].length}</Tag>
                  </div>
                }
                styles={{
                  header: {
                    backgroundColor: col.headerColor,
                    color: '#fff',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    minHeight: 40,
                  },
                  body: {
                    padding: 8,
                    minHeight: 200,
                    backgroundColor: '#fafafa',
                  },
                }}
                style={{ borderRadius: 8, overflow: 'hidden' }}
              >
                {col.key === 'closed' ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#8c8c8c' }}>
                    <Text type="secondary" style={{ fontSize: 16, fontWeight: 600 }}>
                      {grouped.closed.length} รายการ
                    </Text>
                    <div style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {grouped.closed.map((iss) => (
                        <div key={iss.id} style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                          <Link
                            href={issueDestinations[iss.id]?.href ?? `/projects/${projectId}`}
                            style={{ color: '#8c8c8c' }}
                          >
                            {iss.id}: {iss.title}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  grouped[col.key].map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      destination={issueDestinations[issue.id] ?? getIssueDestination(issue, projectId)}
                      onOpen={() => router.push(issueDestinations[issue.id]?.href ?? `/projects/${projectId}`)}
                    />
                  ))
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* List View */}
      {viewMode === 'list' && (
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
          />
        </Card>
      )}

      <Modal
        title="เปิดเคสใหม่"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreateIssue}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={createIssue.isPending}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="หัวข้อปัญหา" name="title" rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}>
            <Input placeholder="เช่น แบบก่อสร้างไม่ตรงกับหน้างาน" />
          </Form.Item>
          <Form.Item label="ความรุนแรง" name="severity" rules={[{ required: true, message: 'กรุณาระบุความรุนแรง' }]}>
            <Segmented
              options={[
                { label: 'สูง', value: 'high' },
                { label: 'ปานกลาง', value: 'medium' },
                { label: 'ต่ำ', value: 'low' },
              ]}
            />
          </Form.Item>
          <Form.Item label="ผู้รับผิดชอบ" name="assignee" rules={[{ required: true, message: 'กรุณาระบุผู้รับผิดชอบ' }]}>
            <Input placeholder="เช่น น.ส.วิภา ขจรศักดิ์" />
          </Form.Item>
          <Form.Item label="อ้างอิง WBS" name="linkedWbs">
            <Input placeholder="เช่น WBS 1.0" />
          </Form.Item>
          <Form.Item label="SLA (ชั่วโมง)" name="slaHours" rules={[{ required: true, message: 'กรุณาระบุ SLA' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
