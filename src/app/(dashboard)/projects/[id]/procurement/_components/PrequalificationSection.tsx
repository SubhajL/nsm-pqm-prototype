'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Table,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import {
  useContractorPrequalifications,
  useCreateContractorPrequalification,
} from '@/hooks/useProcurement';
import { formatThaiDateShort } from '@/lib/date-utils';
import type { ContractorPrequalification } from '@/types/contractor-prequalification';

interface PrequalificationSectionProps {
  projectId: string;
  canManage: boolean;
}

interface PrequalificationFormValues {
  contractorName: string;
  contractorTaxId?: string;
  prequalifiedAt: Dayjs;
  validUntil?: Dayjs;
  ahpScore?: number;
}

/** PQ register — contractor prequalification records (AHP scoring post-MVP). */
export function PrequalificationSection({
  projectId,
  canManage,
}: PrequalificationSectionProps) {
  const [form] = Form.useForm<PrequalificationFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: prequalifications } = useContractorPrequalifications(projectId);
  const createPrequalification = useCreateContractorPrequalification(projectId);

  const list = prequalifications ?? [];

  const close = () => {
    form.resetFields();
    setCreateOpen(false);
  };

  const handleOk = async () => {
    let values: PrequalificationFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createPrequalification.mutateAsync({
        contractorName: values.contractorName.trim(),
        contractorTaxId: values.contractorTaxId?.trim() || null,
        prequalifiedAt: values.prequalifiedAt.format('YYYY-MM-DD'),
        validUntil: values.validUntil ? values.validUntil.format('YYYY-MM-DD') : null,
        ahpScore: values.ahpScore ?? null,
      });
      message.success('บันทึกผลคัดกรองผู้รับจ้างแล้ว');
      announce('บันทึกผลคัดกรองผู้รับจ้างเรียบร้อยแล้ว');
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  const columns: ColumnsType<ContractorPrequalification> = [
    { title: 'ผู้รับจ้าง (Contractor)', dataIndex: 'contractorName', key: 'contractorName' },
    {
      title: 'เลขผู้เสียภาษี (Tax ID)',
      dataIndex: 'contractorTaxId',
      key: 'contractorTaxId',
      render: (taxId: string | null) => taxId ?? '—',
    },
    {
      title: 'วันที่คัดกรอง (Prequalified)',
      dataIndex: 'prequalifiedAt',
      key: 'prequalifiedAt',
      render: (prequalifiedAt: string) => formatThaiDateShort(prequalifiedAt),
    },
    {
      title: 'ใช้ได้ถึง (Valid Until)',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: (validUntil: string | null) =>
        validUntil ? formatThaiDateShort(validUntil) : '—',
    },
    {
      title: 'คะแนน AHP (AHP Score)',
      dataIndex: 'ahpScore',
      key: 'ahpScore',
      align: 'right',
      render: (ahpScore: number | null) => (ahpScore === null ? '—' : ahpScore),
    },
  ];

  return (
    <Card
      title="คัดกรองผู้รับจ้าง (Contractor Prequalification)"
      style={{ borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
      extra={
        canManage ? (
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            บันทึกผลคัดกรอง (Record PQ)
          </Button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีผลคัดกรอง (No prequalifications yet)"
          description="บันทึกผลคัดกรองผู้รับจ้างสำหรับการจัดซื้อจัดจ้างที่กำลังจะมาถึง"
        />
      ) : (
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={list}
          pagination={false}
        />
      )}

      <Modal
        title="บันทึกผลคัดกรอง (Record Prequalification)"
        open={createOpen}
        onOk={handleOk}
        onCancel={close}
        confirmLoading={createPrequalification.isPending}
        okText="บันทึก (Save)"
        cancelText="ยกเลิก (Cancel)"
      >
        <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
          <Form.Item
            name="contractorName"
            label="ผู้รับจ้าง (Contractor)"
            rules={[{ required: true, message: 'กรุณาระบุชื่อผู้รับจ้าง' }]}
          >
            <Input placeholder="ชื่อบริษัทผู้รับจ้าง" />
          </Form.Item>
          <Form.Item name="contractorTaxId" label="เลขประจำตัวผู้เสียภาษี (Tax ID)">
            <Input maxLength={13} placeholder="13 หลัก" />
          </Form.Item>
          <Form.Item
            name="prequalifiedAt"
            label="วันที่คัดกรอง (Prequalified At)"
            rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="validUntil" label="ใช้ได้ถึง (Valid Until)">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="ahpScore" label="คะแนน AHP (AHP Score)">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
