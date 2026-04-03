'use client';

import { useParams } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Skeleton,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CameraOutlined,
  CheckCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { useInspection, useResolveChecklistItem, useUpdateInspectionStatus } from '@/hooks/useQuality';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { canAccessAdmin } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatThaiDate } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { InspectionChecklistItem, WorkflowStatus } from '@/types/quality';

const { Title, Text } = Typography;

/* Photo placeholders for the inspection */
const PHOTO_PLACEHOLDERS = [
  {
    id: 'ph-1',
    filename: 'IMG_20690715_093012.jpg',
    label: 'ภาพก่อนเท (Before pour)',
    gpsLat: 13.7563,
    gpsLng: 100.5018,
  },
  {
    id: 'ph-2',
    filename: 'IMG_20690715_094530.jpg',
    label: 'ตรวจเหล็กเสริม (Rebar check)',
    gpsLat: 13.7563,
    gpsLng: 100.5019,
  },
  {
    id: 'ph-3',
    filename: 'IMG_20690715_100215.jpg',
    label: 'Slump Test',
    gpsLat: 13.7564,
    gpsLng: 100.5018,
  },
  {
    id: 'ph-4',
    filename: 'IMG_20690715_101045.jpg',
    label: 'วัดอุณหภูมิ (Temp check)',
    gpsLat: 13.7563,
    gpsLng: 100.5020,
  },
];

const WORKFLOW_LABELS: Record<WorkflowStatus, { label: string; color: string }> = {
  draft: { label: 'ร่าง (Draft)', color: 'default' },
  confirmed: { label: 'ยืนยันแล้ว (Confirmed)', color: 'processing' },
  signed: { label: 'ลงนามแล้ว (Signed)', color: 'success' },
};

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

  const checklistColumns: ColumnsType<InspectionChecklistItem> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_: unknown, __: InspectionChecklistItem, index: number) =>
        index + 1,
    },
    {
      title: 'รายการ (Item)',
      dataIndex: 'item',
      key: 'item',
    },
    {
      title: 'เกณฑ์ (Criteria)',
      dataIndex: 'criteria',
      key: 'criteria',
    },
    {
      title: 'ผลตรวจ (Result)',
      dataIndex: 'result',
      key: 'result',
      width: 150,
      align: 'center',
      render: (result: string) => {
        if (result === 'pass') {
          return <Tag color="green">ผ่าน (PASS)</Tag>;
        }
        return <Tag color="red">ไม่ผ่าน (FAIL)</Tag>;
      },
    },
    {
      title: 'หมายเหตุ (Note)',
      dataIndex: 'note',
      key: 'note',
      width: 200,
    },
    ...(canResolve && workflowStatus !== 'signed'
      ? [
          {
            title: 'จัดการ',
            key: 'actions',
            width: 140,
            align: 'center' as const,
            render: (_: unknown, record: InspectionChecklistItem) => {
              if (record.result !== 'fail') return null;
              return (
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  style={{ backgroundColor: COLORS.success, borderColor: COLORS.success }}
                  loading={resolveItem.isPending}
                  onClick={async () => {
                    try {
                      await resolveItem.mutateAsync({
                        id: inspection.id,
                        checklistItemId: record.id,
                      });
                      message.success(`แก้ไข "${record.item}" เป็นผ่านแล้ว — แจ้ง PM เรียบร้อย`);
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'ไม่สามารถแก้ไขได้');
                    }
                  }}
                >
                  แก้ไขเป็นผ่าน
                </Button>
              );
            },
          },
        ]
      : []),
  ];

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

      {/* 3. Inspection Info */}
      <Card
        title="ข้อมูลการตรวจ (Inspection Details)"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }} size="middle">
          <Descriptions.Item label="วันที่ (Date)">
            {formatThaiDate(inspection.date)}
          </Descriptions.Item>
          <Descriptions.Item label="เวลา (Time)">
            {inspection.time}
          </Descriptions.Item>
          <Descriptions.Item label="ผู้ตรวจสอบ (Inspectors)">
            {inspection.inspectors.join(', ')}
          </Descriptions.Item>
          <Descriptions.Item label="กิจกรรม (Activity)">
            {inspection.wbsLink}
          </Descriptions.Item>
          <Descriptions.Item label="มาตรฐาน (Standards)" span={2}>
            {inspection.standards.map((s) => (
              <Tag key={s} color="blue" style={{ marginBottom: 4 }}>
                {s}
              </Tag>
            ))}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 4. Quick Tip */}
      <Alert
        type="info"
        showIcon
        message="Hold Point (H): งานต้องหยุด — ห้ามดำเนินการต่อจนกว่าจะได้รับอนุมัติจากวิศวกร"
      />

      {/* 5. Checklist Table */}
      <Card
        title="รายการตรวจสอบ (Checklist)"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Table<InspectionChecklistItem>
          columns={checklistColumns}
          dataSource={inspection.checklist}
          rowKey="id"
          pagination={false}
          size="middle"
          rowClassName={(record) =>
            record.result === 'fail' ? 'inspection-fail-row' : ''
          }
          onRow={(record) => ({
            style: {
              backgroundColor:
                record.result === 'fail'
                  ? 'rgba(231, 76, 60, 0.08)'
                  : undefined,
            },
          })}
        />
      </Card>

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

      {/* 7. Photo Section */}
      <Card
        title="ภาพถ่ายประกอบ (Site Photos)"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Row gutter={16}>
          {PHOTO_PLACEHOLDERS.map((photo) => (
            <Col key={photo.id} xs={12} sm={8} md={6}>
              <div
                style={{
                  backgroundColor: '#f0f2f5',
                  borderRadius: 8,
                  height: 160,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed #d9d9d9',
                  marginBottom: 16,
                }}
              >
                <CameraOutlined
                  style={{
                    fontSize: 32,
                    color: '#bfbfbf',
                    marginBottom: 8,
                  }}
                />
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                    textAlign: 'center',
                    padding: '0 8px',
                  }}
                  ellipsis
                >
                  {photo.filename}
                </Text>
                <Tag
                  color="blue"
                  style={{ marginTop: 8, fontSize: 11 }}
                  icon={<EnvironmentOutlined />}
                >
                  GPS
                </Tag>
                <Text
                  type="secondary"
                  style={{ fontSize: 10, marginTop: 4 }}
                >
                  {photo.gpsLat.toFixed(4)}, {photo.gpsLng.toFixed(4)}
                </Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

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

      {/* 11. Bottom Buttons */}
      <Card
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Space size="middle" wrap align="center">
          {/* Workflow status badge */}
          <Tag
            color={WORKFLOW_LABELS[workflowStatus].color}
            style={{ fontSize: 14, padding: '4px 12px', lineHeight: '24px' }}
          >
            {WORKFLOW_LABELS[workflowStatus].label}
          </Tag>

          <Button
            icon={<SaveOutlined />}
            disabled={workflowStatus !== 'draft'}
            onClick={() => message.success('บันทึกร่างแล้ว')}
          >
            บันทึกร่าง
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            disabled={workflowStatus !== 'draft' || hasFailItems}
            loading={updateStatus.isPending}
            style={workflowStatus === 'draft' && !hasFailItems ? {
              backgroundColor: COLORS.accentTeal,
              borderColor: COLORS.accentTeal,
            } : undefined}
            onClick={async () => {
              try {
                await updateStatus.mutateAsync({ id: inspection.id, workflowStatus: 'confirmed' });
                message.success('ยืนยันผลตรวจเรียบร้อยแล้ว');
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถยืนยันผลตรวจได้');
              }
            }}
          >
            ยืนยันผลตรวจ
          </Button>
          <Button
            icon={<SafetyCertificateOutlined />}
            disabled={workflowStatus !== 'confirmed' || hasFailItems}
            loading={updateStatus.isPending}
            style={workflowStatus === 'confirmed' && !hasFailItems ? {
              color: COLORS.success,
              borderColor: COLORS.success,
            } : undefined}
            onClick={async () => {
              try {
                await updateStatus.mutateAsync({ id: inspection.id, workflowStatus: 'signed' });
                message.success('ลงนามดิจิทัลเรียบร้อยแล้ว');
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถลงนามได้');
              }
            }}
          >
            ลงนามดิจิทัล
          </Button>
        </Space>
      </Card>
    </div>
  );
}
