'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  PlusOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { QualityGatePipeline } from '@/components/quality/QualityGatePipeline';
import { canAccessAdmin } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCreateInspection, useDeleteInspection, useQualityGates, useITPItems } from '@/hooks/useQuality';
import { useRouteProjectId } from '@/hooks/useRouteProjectId';
import { formatThaiDateShort } from '@/lib/date-utils';
import { COLORS } from '@/theme/antd-theme';
import type { ITPItem, InspectionRecord } from '@/types/quality';

const { Title } = Typography;

const INSPECTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  H: { label: 'Hold Point (H)', color: 'red' },
  W: { label: 'Witness Point (W)', color: 'blue' },
  RS: { label: 'Review (R/S)', color: 'green' },
};

const ITP_STATUS_MAP: Record<string, { label: string; color: string }> = {
  passed: { label: 'ผ่าน (PASSED)', color: 'green' },
  conditional: { label: 'ไม่ผ่านเงื่อนไข (CONDITIONAL)', color: 'red' },
  pending: { label: 'รอตรวจ (PENDING)', color: 'gold' },
  awaiting: { label: 'รอผล (AWAITING)', color: 'blue' },
};

export default function QualityManagementPage() {
  const projectId = useRouteProjectId() ?? 'proj-001';
  const router = useRouter();
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

  const columns: ColumnsType<ITPItem> = [
    {
      title: 'ลำดับ (Sequence)',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 100,
      align: 'center',
    },
    {
      title: 'รายการตรวจสอบ (Inspection Item)',
      dataIndex: 'item',
      key: 'item',
      render: (text: string, record: ITPItem) => {
        const linkedInspection = inspectionByItpId.get(record.id);
        if (linkedInspection) {
          return (
            <Button
              type="link"
              style={{ paddingInline: 0, whiteSpace: 'normal', textAlign: 'left', height: 'auto' }}
              onClick={() => router.push(`/projects/${projectId}/quality/inspection/${linkedInspection.id}`)}
            >
              {text}
            </Button>
          );
        }
        return text;
      },
    },
    {
      title: 'มาตรฐานอ้างอิง (Standard)',
      dataIndex: 'standard',
      key: 'standard',
      width: 140,
    },
    {
      title: 'ประเภทจุดตรวจสอบ (Inspection Type)',
      dataIndex: 'inspectionType',
      key: 'inspectionType',
      width: 180,
      align: 'center',
      render: (type: string) => {
        const entry = INSPECTION_TYPE_MAP[type] ?? {
          label: type,
          color: 'default',
        };
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
    {
      title: 'ผู้ตรวจสอบ (Inspector)',
      dataIndex: 'inspector',
      key: 'inspector',
      width: 180,
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      align: 'center',
      render: (status: string) => {
        const entry = ITP_STATUS_MAP[status] ?? {
          label: status,
          color: 'default',
        };
        return <Tag color={entry.color}>{entry.label}</Tag>;
      },
    },
  ];

  const inspectionColumns: ColumnsType<InspectionRecord> = [
    {
      title: 'หัวข้อการตรวจ',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, record) => (
        <Button
          type="link"
          style={{ paddingInline: 0 }}
          onClick={() => router.push(`/projects/${projectId}/quality/inspection/${record.id}`)}
        >
          {value}
        </Button>
      ),
    },
    {
      title: 'วันที่',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (value: string) => formatThaiDateShort(value),
    },
    {
      title: 'ITP',
      dataIndex: 'itpId',
      key: 'itpId',
      width: 180,
      render: (value: string) => itpItems.find((item) => item.id === value)?.item ?? value,
    },
    {
      title: 'ผลรวม',
      dataIndex: 'overallResult',
      key: 'overallResult',
      width: 140,
      render: (value: string) =>
        value === 'pass' ? (
          <Tag color="green">ผ่าน (PASS)</Tag>
        ) : (
          <Tag color="red">ไม่ผ่านเงื่อนไข (CONDITIONAL)</Tag>
        ),
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_value, record) =>
        canManageQuality ? (
          <Popconfirm
            title="ลบผลตรวจนี้"
            description="ต้องการลบผลตรวจคุณภาพนี้ใช่หรือไม่"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={async () => {
              try {
                await deleteInspection.mutateAsync({ id: record.id });
                message.success('ลบผลตรวจคุณภาพแล้ว');
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'ไม่สามารถลบผลตรวจได้');
              }
            }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              aria-label={`ลบผลตรวจ ${record.title}`}
            />
          </Popconfirm>
        ) : null,
    },
  ];

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
        <QualityGatePipeline gates={gates ?? []} />
      </Card>

      {/* Quick Tip */}
      <Alert
        type="info"
        showIcon
        message="Hold Point (H) = งานต้องหยุดรอการตรวจ | Witness Point (W) = แจ้งให้ทราบล่วงหน้า | R/S = ตรวจเอกสาร"
      />

      {/* ITP Table */}
      <Card
        title="Inspection Test Plan (ITP)"
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Table<ITPItem>
          columns={columns}
          dataSource={itpItems}
          rowKey="id"
          pagination={false}
          size="middle"
          onRow={(record) => ({
            onClick: () => {
              const linkedInspection = inspectionByItpId.get(record.id);
              if (linkedInspection) {
                router.push(`/projects/${projectId}/quality/inspection/${linkedInspection.id}`);
              }
            },
            style: {
              cursor: inspectionByItpId.has(record.id) ? 'pointer' : 'default',
              backgroundColor:
                inspectionByItpId.has(record.id)
                  ? 'rgba(0,184,148,0.06)'
                  : undefined,
            },
          })}
        />
      </Card>

      <Card
        title="บันทึกผลตรวจคุณภาพ (Inspection Records)"
        extra={
          canManageQuality ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
              style={{ backgroundColor: COLORS.accentTeal, borderColor: COLORS.accentTeal }}
            >
              บันทึกผลตรวจใหม่
            </Button>
          ) : null
        }
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Table<InspectionRecord>
          columns={inspectionColumns}
          dataSource={inspectionRecords}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'ยังไม่มีบันทึกผลตรวจคุณภาพ' }}
        />
      </Card>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
            >
              <CheckCircleOutlined
                style={{
                  fontSize: 24,
                  color: COLORS.success,
                  marginTop: 4,
                }}
              />
              <Statistic
                title="QC First-Pass Rate"
                value={`${firstPassRate}%`}
                valueStyle={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.success,
                }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
            >
              <WarningOutlined
                style={{
                  fontSize: 24,
                  color: COLORS.warning,
                  marginTop: 4,
                }}
              />
              <Statistic
                title="NCR (Non-Conformance)"
                value={`${conditionalInspectionCount} รายการเปิด (Open)`}
                valueStyle={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.warning,
                }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
            >
              <ExperimentOutlined
                style={{
                  fontSize: 24,
                  color: COLORS.info,
                  marginTop: 4,
                }}
              />
              <div style={{ flex: 1 }}>
                <Statistic
                  title="ITP Coverage"
                  value={`${passedCount}/${itpItems.length} รายการตรวจแล้ว (${Math.round((passedCount / (itpItems.length || 1)) * 100)}%)`}
                  valueStyle={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: COLORS.info,
                  }}
                />
                <Progress
                  percent={Math.round(
                    (passedCount / (itpItems.length || 1)) * 100,
                  )}
                  size="small"
                  strokeColor={COLORS.info}
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="บันทึกผลตรวจคุณภาพใหม่"
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={handleCreateInspection}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={createInspection.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="หัวข้อการตรวจ" name="title" rules={[{ required: true, message: 'กรุณาระบุหัวข้อการตรวจ' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="รายการ ITP" name="itpId" rules={[{ required: true, message: 'กรุณาเลือกรายการ ITP' }]}>
            <Select
              options={itpItems.map((item) => ({ value: item.id, label: item.item }))}
            />
          </Form.Item>
          <Form.Item label="วันที่ตรวจ" name="date" rules={[{ required: true, message: 'กรุณาเลือกวันที่ตรวจ' }]}>
            <DatePicker format="DD/MM/YYYY" placeholder="เลือกวันที่ตรวจ" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="เวลา" name="time" rules={[{ required: true, message: 'กรุณาระบุเวลา' }]}>
            <Input placeholder="HH:mm" />
          </Form.Item>
          <Form.Item label="ผู้ตรวจสอบ" name="inspectors" rules={[{ required: true, message: 'กรุณาระบุผู้ตรวจสอบ' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="WBS อ้างอิง" name="wbsLink" rules={[{ required: true, message: 'กรุณาระบุ WBS อ้างอิง' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="มาตรฐานอ้างอิง" name="standards" rules={[{ required: true, message: 'กรุณาระบุมาตรฐานอ้างอิง' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="ผลรวม" name="overallResult" initialValue="pass" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'pass', label: 'ผ่าน (PASS)' },
                { value: 'conditional', label: 'Conditional' },
              ]}
            />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) =>
              getFieldValue('overallResult') === 'conditional' ? (
                <Form.Item label="เหตุผล/หมายเหตุ" name="failReason" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
                  <Input.TextArea rows={3} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
