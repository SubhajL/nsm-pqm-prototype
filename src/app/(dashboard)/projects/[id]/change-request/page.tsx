'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Col,
  Form,
  message,
  Row,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import {
  useChangeRequests,
  useCreateChangeRequest,
  useUpdateChangeRequestStatus,
} from '@/hooks/useChangeRequests';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { COLORS } from '@/theme/antd-theme';
import type { ChangeRequest } from '@/types/document';

import type { ChangeRequestFormValues } from './_components/types';
import { ChangeRequestDetailsCard } from './_components/ChangeRequestDetailsCard';
import { ChangeRequestHistoryTable } from './_components/ChangeRequestHistoryTable';
import { SummaryCard } from './_components/SummaryCard';
import { CreateChangeRequestModal } from './_components/CreateChangeRequestModal';

const { Title } = Typography;

export default function ChangeRequestPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const { data: changeRequests, isLoading } = useChangeRequests(projectId);
  const createChangeRequest = useCreateChangeRequest(projectId);
  const updateStatus = useUpdateChangeRequestStatus(projectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChangeRequestId, setSelectedChangeRequestId] = useState<string>('');
  const [form] = Form.useForm<ChangeRequestFormValues>();

  const allChangeRequests = useMemo(() => changeRequests ?? [], [changeRequests]);

  useEffect(() => {
    if (allChangeRequests.length === 0) {
      setSelectedChangeRequestId('');
      return;
    }

    setSelectedChangeRequestId((current) => {
      if (current && allChangeRequests.some((entry) => entry.id === current)) {
        return current;
      }

      const pending = allChangeRequests.find((entry) => entry.status === 'pending');
      return pending?.id ?? allChangeRequests[0]?.id ?? '';
    });
  }, [allChangeRequests]);

  const selectedChangeRequest = useMemo(
    () =>
      allChangeRequests.find((entry) => entry.id === selectedChangeRequestId) ??
      allChangeRequests.find((entry) => entry.status === 'pending') ??
      allChangeRequests[0] ??
      null,
    [allChangeRequests, selectedChangeRequestId],
  );

  const summary = useMemo(() => {
    const total = allChangeRequests.length;
    const approved = allChangeRequests.filter((cr) => cr.status === 'approved').length;
    const pending = allChangeRequests.filter((cr) => cr.status === 'pending').length;
    const rejected = allChangeRequests.filter((cr) => cr.status === 'rejected').length;
    const totalBudgetImpact = allChangeRequests.reduce((sum, cr) => sum + cr.budgetImpact, 0);
    return { total, approved, pending, rejected, totalBudgetImpact };
  }, [allChangeRequests]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const created = (await createChangeRequest.mutateAsync(values)) as ChangeRequest;
      setCreateOpen(false);
      form.resetFields();
      setSelectedChangeRequestId(created.id);
      message.success(`สร้าง Change Request ${created.id} แล้ว`);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleStatusAction = async (action: 'approve' | 'reject' | 'return') => {
    if (!selectedChangeRequest) return;

    try {
      await updateStatus.mutateAsync({ id: selectedChangeRequest.id, action });
      message.success(
        action === 'approve'
          ? `อนุมัติ Change Request ${selectedChangeRequest.id} เรียบร้อยแล้ว`
          : `อัปเดตสถานะ Change Request ${selectedChangeRequest.id} แล้ว`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          คำขอเปลี่ยนแปลง (Change Requests)
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
          style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
        >
          สร้าง Change Request
        </Button>
      </div>

      {selectedChangeRequest && (
        <ChangeRequestDetailsCard selectedChangeRequest={selectedChangeRequest} />
      )}

      <ChangeRequestHistoryTable
        allChangeRequests={allChangeRequests}
        isLoading={isLoading}
        onRowClick={setSelectedChangeRequestId}
      />

      <SummaryCard summary={summary} />

      {selectedChangeRequest && (
        <Row justify="end" gutter={[12, 12]}>
          <Col>
            <Button
              danger
              ghost
              size="large"
              onClick={() => void handleStatusAction('return')}
            >
              ส่งกลับแก้ไข (Return)
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              style={{ backgroundColor: COLORS.success, borderColor: COLORS.success }}
              onClick={() => void handleStatusAction('approve')}
            >
              อนุมัติ (Approve)
            </Button>
          </Col>
        </Row>
      )}

      <CreateChangeRequestModal
        open={createOpen}
        form={form}
        confirmLoading={createChangeRequest.isPending}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={() => void handleCreate()}
      />
    </div>
  );
}
