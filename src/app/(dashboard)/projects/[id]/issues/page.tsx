'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Segmented,
  Typography,
  message,
} from 'antd';

import { LoadingSkeleton } from '@/components/common';
import {
  AppstoreOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

import { useCreateIssue, useIssues, useUpdateIssueStatus } from '@/hooks/useIssues';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { COLORS } from '@/theme/antd-theme';
import type { Issue, IssueStatus } from '@/types/risk';

import { EMPTY_ISSUES, getIssueDestination, type IssueDestination } from './_components/helpers';
import { IssueBoardView } from './_components/IssueBoardView';
import { IssueListView } from './_components/IssueListView';
import { CreateIssueModal } from './_components/CreateIssueModal';

const { Title, Text } = Typography;

export default function IssueTrackingPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
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

  if (isLoading) {
    return (
      <div>
        <Title level={3}>ติดตามปัญหา (Issue Tracking)</Title>
        <LoadingSkeleton variant="table" rows={10} />
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

      {viewMode === 'board' && (
        <IssueBoardView
          projectId={projectId}
          grouped={grouped}
          issueDestinations={issueDestinations}
        />
      )}

      {viewMode === 'list' && (
        <IssueListView
          projectId={projectId}
          allIssues={allIssues}
          issueDestinations={issueDestinations}
        />
      )}

      <CreateIssueModal
        open={isCreateModalOpen}
        form={createForm}
        confirmLoading={createIssue.isPending}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreateIssue}
      />
    </div>
  );
}
