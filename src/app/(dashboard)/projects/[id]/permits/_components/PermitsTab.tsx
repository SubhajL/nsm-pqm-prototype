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
import { useCreatePermit, usePermits } from '@/hooks/useCompliance';
import { formatThaiDateShort } from '@/lib/date-utils';
import {
  PERMIT_STATUSES,
  PERMIT_STATUS_LABELS,
  type Permit,
  type PermitStatus,
} from '@/types/permit';

import { statusCountEntries } from './permits-actions';

interface PermitsTabProps {
  projectId: string;
  canManage: boolean;
}

interface PermitFormValues {
  permitType: string;
  title: string;
  issuingAuthority: string;
  status: PermitStatus;
  issuedAt?: Dayjs;
  expiresAt?: Dayjs;
}

/** ใบอนุญาต register — human-maintained, no state machine. */
export function PermitsTab({ projectId, canManage }: PermitsTabProps) {
  const [form] = Form.useForm<PermitFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: permits, isLoading } = usePermits(projectId);
  const createPermit = useCreatePermit(projectId);

  if (isLoading) return <Spin />;

  const list = permits ?? [];
  const counts = statusCountEntries(list, (p) => p.status, PERMIT_STATUS_LABELS);

  const close = () => {
    form.resetFields();
    setCreateOpen(false);
  };

  const handleOk = async () => {
    let values: PermitFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createPermit.mutateAsync({
        permitType: values.permitType.trim(),
        title: values.title.trim(),
        issuingAuthority: values.issuingAuthority.trim(),
        status: values.status,
        issuedAt: values.issuedAt ? values.issuedAt.format('YYYY-MM-DD') : null,
        expiresAt: values.expiresAt ? values.expiresAt.format('YYYY-MM-DD') : null,
      });
      message.success('เพิ่มใบอนุญาตแล้ว');
      announce('เพิ่มใบอนุญาตเรียบร้อยแล้ว');
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  const columns: ColumnsType<Permit> = [
    { title: 'ใบอนุญาต (Permit)', dataIndex: 'title', key: 'title' },
    { title: 'ประเภท (Type)', dataIndex: 'permitType', key: 'permitType' },
    {
      title: 'หน่วยงานผู้ออก (Authority)',
      dataIndex: 'issuingAuthority',
      key: 'issuingAuthority',
    },
    {
      title: 'สถานะ (Status)',
      dataIndex: 'status',
      key: 'status',
      render: (status: Permit['status']) => {
        const label = PERMIT_STATUS_LABELS[status];
        return <Tag color={label.color}>{`${label.th} (${label.en})`}</Tag>;
      },
    },
    {
      title: 'ออกให้ (Issued)',
      dataIndex: 'issuedAt',
      key: 'issuedAt',
      render: (d: string | null) => (d ? formatThaiDateShort(d) : '—'),
    },
    {
      title: 'หมดอายุ (Expires)',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (d: string | null) => (d ? formatThaiDateShort(d) : '—'),
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
            เพิ่มใบอนุญาต (Add Permit)
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          size="small"
          title="ยังไม่มีใบอนุญาต (No permits yet)"
          description="บันทึกใบอนุญาตที่โครงการต้องได้รับก่อนเริ่มก่อสร้าง"
        />
      ) : (
        <Table rowKey="id" size="middle" columns={columns} dataSource={list} pagination={false} />
      )}

      <Modal
        title="เพิ่มใบอนุญาต (Add Permit)"
        open={createOpen}
        onOk={handleOk}
        onCancel={close}
        confirmLoading={createPermit.isPending}
        okText="บันทึก (Save)"
        cancelText="ยกเลิก (Cancel)"
      >
        <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
          <Form.Item
            name="title"
            label="ชื่อใบอนุญาต (Title)"
            rules={[{ required: true, message: 'กรุณาระบุชื่อใบอนุญาต' }]}
          >
            <Input placeholder="เช่น ใบอนุญาตก่อสร้างอาคาร (Building Permit)" />
          </Form.Item>
          <Form.Item
            name="permitType"
            label="ประเภท (Type)"
            rules={[{ required: true, message: 'กรุณาระบุประเภท' }]}
          >
            <Input placeholder="เช่น building, environmental, water_use" />
          </Form.Item>
          <Form.Item
            name="issuingAuthority"
            label="หน่วยงานผู้ออก (Issuing Authority)"
            rules={[{ required: true, message: 'กรุณาระบุหน่วยงาน' }]}
          >
            <Input placeholder="เช่น กรมโยธาธิการและผังเมือง" />
          </Form.Item>
          <Form.Item
            name="status"
            label="สถานะ (Status)"
            initialValue="draft"
            rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}
          >
            <Select
              options={PERMIT_STATUSES.map((status) => ({
                value: status,
                label: `${PERMIT_STATUS_LABELS[status].th} (${PERMIT_STATUS_LABELS[status].en})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="issuedAt" label="วันที่ออก (Issued At)">
            <DatePicker style={{ width: '100%' }} format={THAI_DATE_FORMAT} />
          </Form.Item>
          <Form.Item name="expiresAt" label="วันหมดอายุ (Expires At)">
            <DatePicker style={{ width: '100%' }} format={THAI_DATE_FORMAT} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
