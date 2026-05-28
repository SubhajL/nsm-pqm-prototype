'use client';

import { useParams } from 'next/navigation';
import {
  Alert,
  Card,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { WarningOutlined } from '@ant-design/icons';

import { useInspection, useResolveChecklistItem, useUpdateInspectionStatus } from '@/hooks/useQuality';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { canAccessAdmin } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { COLORS } from '@/theme/antd-theme';
import type { WorkflowStatus } from '@/types/quality';

import { WORKFLOW_LABELS } from './_components/constants';
import { InspectionDetailsCard } from './_components/InspectionDetailsCard';
import { ChecklistCard } from './_components/ChecklistCard';
import { PhotoSection } from './_components/PhotoSection';
import { WorkflowButtonsCard } from './_components/WorkflowButtonsCard';

const { Title, Text } = Typography;

export default function QCInspectionPage() {
  const params = useParams<{ inspectionId: string }>();
  const inspectionId = params?.inspectionId;
  const projectId = useRouteProjectId();
  const { data: inspection, isLoading } = useInspection(inspectionId);
  const updateStatus = useUpdateInspectionStatus(projectId);
  const resolveItem = useResolveChecklistItem(projectId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const canResolve =
    canAccessAdmin(currentUser?.role) ||
    currentUser?.role === 'Project Manager' ||
    currentUser?.role === 'Engineer';

  if (isLoading) {
    return (
      <div>
        <Title level={3}>
          แบบฟอร์มตรวจสอบคุณภาพ (QC Inspection Form)
        </Title>
        <Card>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div>
        <Title level={3}>ไม่พบข้อมูล (Not Found)</Title>
      </div>
    );
  }

  const passCount = inspection.checklist.filter(
    (c) => c.result === 'pass',
  ).length;
  const failCount = inspection.checklist.filter(
    (c) => c.result === 'fail',
  ).length;
  const totalCount = inspection.checklist.length;
  const passPercent = Math.round((passCount / totalCount) * 100);

  const failItems = inspection.checklist
    .filter((c) => c.result === 'fail')
    .map((c) => c.item)
    .join(', ');
  const hasFailItems = failCount > 0;
  const workflowStatus: WorkflowStatus = inspection.workflowStatus ?? 'draft';
  const isConditional = inspection.overallResult === 'conditional';
  const resultTagColor = isConditional ? 'red' : 'green';
  const resultTagLabel = isConditional
    ? 'ไม่ผ่านเงื่อนไข — Conditional (FAIL)'
    : 'ผ่าน (PASS)';
  const resultPanelColor = isConditional ? COLORS.error : COLORS.success;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Hold Point Alert Banner */}
      <Alert
        type="error"
        showIcon
        icon={<WarningOutlined />}
        message={
          <Text strong style={{ color: COLORS.error }}>
            Hold Point — งานต้องหยุด รอวิศวกรอนุมัติ (Work must stop until
            engineer approval)
          </Text>
        }
        style={{ borderColor: COLORS.error }}
      />

      {/* 2. Title */}
      <div>
        <Space align="center" size="middle">
          <Title level={3} style={{ marginBottom: 0 }}>
            แบบฟอร์มตรวจสอบคุณภาพ (QC Inspection Form)
          </Title>
          <Tag
            color={WORKFLOW_LABELS[workflowStatus].color}
            style={{ fontSize: 13, padding: '2px 10px' }}
          >
            {WORKFLOW_LABELS[workflowStatus].label}
          </Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 16, display: 'block', marginTop: 4 }}>
          {inspection.title}
        </Text>
      </div>

      <InspectionDetailsCard inspection={inspection} />

      {/* 4. Quick Tip */}
      <Alert
        type="info"
        showIcon
        message="Hold Point (H): งานต้องหยุด — ห้ามดำเนินการต่อจนกว่าจะได้รับอนุมัติจากวิศวกร"
      />

      <ChecklistCard
        inspectionId={inspection.id}
        checklist={inspection.checklist}
        workflowStatus={workflowStatus}
        canResolve={canResolve}
        resolveItemPending={resolveItem.isPending}
        onResolve={async (checklistItemId) => {
          await resolveItem.mutateAsync({
            id: inspection.id,
            checklistItemId,
          });
        }}
      />

      {/* 6. Result Summary Strip */}
      <div
        style={{
          backgroundColor: isConditional ? 'rgba(231, 76, 60, 0.08)' : 'rgba(39, 174, 96, 0.08)',
          border: `1px solid ${resultPanelColor}`,
          borderRadius: 8,
          padding: '16px 24px',
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          ผลรวม: ผ่าน (PASS) {passCount}/{totalCount} รายการ ({passPercent}%)
          {isConditional
            ? ` — ไม่ผ่าน (FAIL) ${failCount} รายการ (${failItems})`
            : ' — ไม่พบรายการไม่ผ่าน'}
        </Text>
      </div>

      <PhotoSection />

      {/* 8. Overall Result */}
      <Card
        title="สรุปผลการตรวจ (Inspection Result)"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ marginRight: 12 }}>
            ผลรวม (Overall):
          </Text>
          <Tag
            color={resultTagColor}
            style={{ fontSize: 16, padding: '4px 16px', lineHeight: '28px' }}
          >
            {resultTagLabel}
          </Tag>
        </div>
        {inspection.failReason ? (
          <div
            style={{
              backgroundColor: isConditional ? 'rgba(231, 76, 60, 0.06)' : 'rgba(39, 174, 96, 0.06)',
              borderRadius: 8,
              padding: '12px 16px',
              border: `1px solid ${isConditional ? 'rgba(231, 76, 60, 0.2)' : 'rgba(39, 174, 96, 0.2)'}`,
            }}
          >
            <Text>
              <Text strong>เหตุผล (Reason):</Text> {inspection.failReason}
            </Text>
          </div>
        ) : null}
      </Card>

      {/* 9. Auto-NCR Warning */}
      {inspection.autoNCR ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined style={{ fontSize: 20 }} />}
          message={
            <Text strong>
              Auto NCR — ระบบสร้าง Issue (NCR) อัตโนมัติ
            </Text>
          }
          description="เมื่อ QC ไม่ผ่าน ระบบจะสร้าง Issue (NCR) อัตโนมัติ และไม่สามารถปิดโครงการได้จนกว่าจะแก้ไข (Auto NCR: Project cannot be closed until resolved)"
          style={{
            border: `1px solid ${COLORS.warning}`,
          }}
        />
      ) : null}

      {/* 10. Fail items blocking alert */}
      {hasFailItems && workflowStatus !== 'signed' ? (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message={
            <Text strong style={{ color: COLORS.error }}>
              ไม่สามารถยืนยันหรือลงนามได้ — ยังมี {failCount} รายการที่ไม่ผ่าน ({failItems})
            </Text>
          }
          description="วิศวกรต้องแก้ไขรายการที่ไม่ผ่านให้เป็นผ่านก่อน จึงจะดำเนินการยืนยันผลตรวจและลงนามได้"
          style={{ borderColor: COLORS.error }}
        />
      ) : null}

      <WorkflowButtonsCard
        inspectionId={inspection.id}
        workflowStatus={workflowStatus}
        hasFailItems={hasFailItems}
        updateStatusPending={updateStatus.isPending}
        onConfirm={async () => {
          await updateStatus.mutateAsync({ id: inspection.id, workflowStatus: 'confirmed' });
        }}
        onSign={async () => {
          await updateStatus.mutateAsync({ id: inspection.id, workflowStatus: 'signed' });
        }}
      />
    </div>
  );
}
