'use client';

import { useState } from 'react';
import { THAI_DATE_FORMAT } from '@/lib/antd-thai-locale';
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import {
  useCreateEnvironmentalAssessment,
  useEnvironmentalAssessments,
} from '@/hooks/useCompliance';
import { formatThaiDateShort } from '@/lib/date-utils';
import {
  EIA_STATUSES,
  EIA_STATUS_LABELS,
  type EiaStatus,
  type EnvironmentalAssessment,
  type EnvironmentalAssessmentKind,
} from '@/types/environmental-assessment';

import { statusCountEntries } from './permits-actions';

const EIA_KINDS: EnvironmentalAssessmentKind[] = [
  'EIA',
  'IEE',
  'environmental_checklist',
];

const EIA_KIND_LABELS: Record<EnvironmentalAssessmentKind, { th: string; en: string }> = {
  EIA: { th: 'รายงาน EIA', en: 'EIA' },
  IEE: { th: 'รายงาน IEE', en: 'IEE' },
  environmental_checklist: {
    th: 'แบบตรวจสอบสิ่งแวดล้อม',
    en: 'Environmental Checklist',
  },
};

interface EiaTabProps {
  projectId: string;
  canManage: boolean;
}

interface EiaFormValues {
  kind: EnvironmentalAssessmentKind;
  status: EiaStatus;
  approvedAt?: Dayjs;
  approvalReference?: string;
  notes?: string;
}

/** สิ่งแวดล้อม register — EIA / IEE clearances gating construction entry. */
export function EiaTab({ projectId, canManage }: EiaTabProps) {
  const [form] = Form.useForm<EiaFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: assessments, isLoading } = useEnvironmentalAssessments(projectId);
  const createAssessment = useCreateEnvironmentalAssessment(projectId);

  if (isLoading) return <Spin />;

  const list = assessments ?? [];
  const counts = statusCountEntries(list, (a) => a.status, EIA_STATUS_LABELS);

  const close = () => {
    form.resetFields();
    setCreateOpen(false);
  };

  const handleOk = async () => {
    let values: EiaFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createAssessment.mutateAsync({
        kind: values.kind,
        status: values.status,
        approvedAt: values.approvedAt ? values.approvedAt.format('YYYY-MM-DD') : null,
        approvalReference: values.approvalReference?.trim() || null,
        notes: values.notes?.trim() ?? '',
      });
      message.success('เพิ่มรายการสิ่งแวดล้อมแล้ว');
      announce('เพิ่มรายการประเมินสิ่งแวดล้อมเรียบร้อยแล้ว');
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  const columns: ColumnsType<EnvironmentalAssessment> = [
    {
      title: 'ประเภท (Kind)',
      dataIndex: 'kind',
      key: 'kind',
      render: (kind: EnvironmentalAssessmentKind) => {
        const label = EIA_KIND_LABELS[kind];
        return `${label.th} (${label.en})`;
      },
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      render: (status: EnvironmentalAssessment['status']) => {
        const label = EIA_STATUS_LABELS[status];
        return <Tag color={label.color}>{`${label.th} (${label.en})`}</Tag>;
      },
    },
    {
      title: 'อนุมัติเมื่อ (Approved)',
      dataIndex: 'approvedAt',
      key: 'approvedAt',
      render: (d: string | null) => (d ? formatThaiDateShort(d) : '—'),
    },
    {
      title: 'เลขที่อนุมัติ (Reference)',
      dataIndex: 'approvalReference',
      key: 'approvalReference',
      render: (ref: string | null) => ref ?? '—',
    },
    {
      title: 'หมายเหตุ (Notes)',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '—',
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Space wrap>
          {counts.map((entry) => (
            <Tag key={entry.key} color={entry.color}>
              {`${entry.count} ${entry.label}`}
            </Tag>
          ))}
        </Space>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            เพิ่มรายการ (Add Assessment)
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          size="small"
          title="ยังไม่มีรายการสิ่งแวดล้อม (No assessments yet)"
          description="บันทึกรายงาน EIA / IEE ที่ใช้ประกอบการเข้าสู่ระยะก่อสร้าง"
        />
      ) : (
        <Table rowKey="id" size="middle" columns={columns} dataSource={list} pagination={false} />
      )}

      <Modal
        title="เพิ่มรายการสิ่งแวดล้อม (Add Environmental Assessment)"
        open={createOpen}
        onOk={handleOk}
        onCancel={close}
        confirmLoading={createAssessment.isPending}
        okText="บันทึก (Save)"
        cancelText="ยกเลิก (Cancel)"
      >
        <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
          <Form.Item
            name="kind"
            label="ประเภท (Kind)"
            rules={[{ required: true, message: 'กรุณาเลือกประเภท' }]}
          >
            <Select
              placeholder="เลือกประเภทการประเมิน"
              options={EIA_KINDS.map((kind) => ({
                value: kind,
                label: `${EIA_KIND_LABELS[kind].th} (${EIA_KIND_LABELS[kind].en})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="สถานะ (Status)"
            initialValue="not_started"
            rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}
          >
            <Select
              options={EIA_STATUSES.map((status) => ({
                value: status,
                label: `${EIA_STATUS_LABELS[status].th} (${EIA_STATUS_LABELS[status].en})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="approvedAt" label="วันที่อนุมัติ (Approved At)">
            <DatePicker style={{ width: '100%' }} format={THAI_DATE_FORMAT} />
          </Form.Item>
          <Form.Item name="approvalReference" label="เลขที่อนุมัติ (Approval Reference)">
            <Input placeholder="เลขที่หนังสืออนุมัติ (ถ้ามี)" />
          </Form.Item>
          <Form.Item name="notes" label="หมายเหตุ (Notes)">
            <Input.TextArea rows={2} placeholder="รายละเอียดเพิ่มเติม" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
