'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Card,
  Form,
  Skeleton,
  Typography,
  message,
} from 'antd';

import { QualityGatePipeline } from '@/components/quality/QualityGatePipeline';
import { canAccessAdmin } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCreateInspection, useDeleteInspection, useQualityGates, useITPItems } from '@/hooks/useQuality';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';

import { ITPTable } from './_components/ITPTable';
import { InspectionRecordsTable } from './_components/InspectionRecordsTable';
import { QualityKPICards } from './_components/QualityKPICards';
import { CreateInspectionModal } from './_components/CreateInspectionModal';

const { Title } = Typography;

export default function QualityManagementPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const { data: gates, isLoading: loadingGates } = useQualityGates(projectId);
  const { data: inspectionData, isLoading: loadingITP } =
    useITPItems(projectId);
  const createInspection = useCreateInspection(projectId);
  const deleteInspection = useDeleteInspection(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);

  const itpItems = inspectionData?.itpItems ?? [];
  const inspectionRecords = inspectionData?.inspectionRecords ?? [];
  const inspectionByItpId = new Map(
    inspectionRecords.map((record) => [record.itpId, record]),
  );
  const canManageQuality =
    canAccessAdmin(currentUser?.role) ||
    currentUser?.role === 'Project Manager' ||
    currentUser?.role === 'Engineer';

  const handleCreateInspection = async () => {
    try {
      const values = await form.validateFields() as {
        title: string;
        itpId: string;
        date: dayjs.Dayjs;
        time: string;
        inspectors: string;
        wbsLink: string;
        standards: string;
        overallResult: 'pass' | 'conditional';
        failReason?: string;
      };

      await createInspection.mutateAsync({
        projectId,
        title: values.title.trim(),
        itpId: values.itpId,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time,
        inspectors: values.inspectors.split(',').map((entry) => entry.trim()).filter(Boolean),
        wbsLink: values.wbsLink.trim(),
        standards: values.standards.split(',').map((entry) => entry.trim()).filter(Boolean),
        overallResult: values.overallResult,
        failReason: values.failReason?.trim(),
      });
      message.success('บันทึกผลตรวจคุณภาพแล้ว');
      setOpen(false);
      form.resetFields();
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        message.error(error.message);
      }
    }
  };

  if (loadingGates || loadingITP) {
    return (
      <div>
        <Title level={3}>
          การควบคุมคุณภาพ (Quality Management)
        </Title>
        <Card>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </div>
    );
  }

  const passedCount = itpItems.filter((i) => i.status === 'passed').length;
  const inspectionCount = inspectionRecords.length;
  const passInspectionCount = inspectionRecords.filter(
    (record) => record.overallResult === 'pass',
  ).length;
  const conditionalInspectionCount = inspectionRecords.filter(
    (record) => record.overallResult === 'conditional',
  ).length;
  const firstPassRate = inspectionCount > 0
    ? Math.round((passInspectionCount / inspectionCount) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <Title level={3} style={{ margin: 0 }}>
        การควบคุมคุณภาพ (Quality Management)
      </Title>

      {/* Quality Gate Pipeline */}
      <Card
        title="Quality Gate Pipeline"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <QualityGatePipeline
          gates={gates ?? []}
          projectId={projectId}
          canManage={canManageQuality}
        />
      </Card>

      {/* Quick Tip */}
      <Alert
        type="info"
        showIcon
        message="Hold Point (H) = งานต้องหยุดรอการตรวจ | Witness Point (W) = แจ้งให้ทราบล่วงหน้า | R/S = ตรวจเอกสาร"
      />

      {/* ITP Table */}
      <ITPTable
        projectId={projectId}
        itpItems={itpItems}
        inspectionByItpId={inspectionByItpId}
      />

      <InspectionRecordsTable
        projectId={projectId}
        inspectionRecords={inspectionRecords}
        itpItems={itpItems}
        canManageQuality={canManageQuality}
        onOpenCreate={() => setOpen(true)}
        onDelete={async (id) => {
          await deleteInspection.mutateAsync({ id });
        }}
      />

      {/* KPI Cards */}
      <QualityKPICards
        firstPassRate={firstPassRate}
        conditionalInspectionCount={conditionalInspectionCount}
        passedCount={passedCount}
        itpItemsLength={itpItems.length}
      />

      <CreateInspectionModal
        open={open}
        form={form}
        itpItems={itpItems}
        confirmLoading={createInspection.isPending}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={handleCreateInspection}
      />
    </div>
  );
}
