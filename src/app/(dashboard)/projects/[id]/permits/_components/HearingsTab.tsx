'use client';

import { useState } from 'react';
import { THAI_DATE_FORMAT } from '@/lib/antd-thai-locale';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Table,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { useCreatePublicHearing, usePublicHearings } from '@/hooks/useCompliance';
import { formatThaiDateShort } from '@/lib/date-utils';
import type { PublicHearing } from '@/types/public-hearing';

interface HearingsTabProps {
  projectId: string;
  canManage: boolean;
}

interface HearingFormValues {
  heldAt: Dayjs;
  location: string;
  attendeeCount: number;
  summary?: string;
}

/** ประชาพิจารณ์ register — stakeholder consultation events. */
export function HearingsTab({ projectId, canManage }: HearingsTabProps) {
  const [form] = Form.useForm<HearingFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: hearings, isLoading } = usePublicHearings(projectId);
  const createHearing = useCreatePublicHearing(projectId);

  if (isLoading) return <Spin />;

  const list = hearings ?? [];

  const close = () => {
    form.resetFields();
    setCreateOpen(false);
  };

  const handleOk = async () => {
    let values: HearingFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createHearing.mutateAsync({
        heldAt: values.heldAt.format('YYYY-MM-DD'),
        location: values.location.trim(),
        attendeeCount: values.attendeeCount,
        summary: values.summary?.trim() ?? '',
      });
      message.success('บันทึกประชาพิจารณ์แล้ว');
      announce('บันทึกการประชาพิจารณ์เรียบร้อยแล้ว');
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  const columns: ColumnsType<PublicHearing> = [
    {
      title: 'วันที่จัด (Held At)',
      dataIndex: 'heldAt',
      key: 'heldAt',
      render: (heldAt: string) => formatThaiDateShort(heldAt),
    },
    { title: 'สถานที่ (Location)', dataIndex: 'location', key: 'location' },
    {
      title: 'ผู้เข้าร่วม (Attendees)',
      dataIndex: 'attendeeCount',
      key: 'attendeeCount',
      align: 'right',
    },
    {
      title: 'สรุปผล (Summary)',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (summary: string) => summary || '—',
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {canManage && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            บันทึกประชาพิจารณ์ (Record Hearing)
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          size="small"
          title="ยังไม่มีประชาพิจารณ์ (No public hearings yet)"
          description="บันทึกเวทีรับฟังความคิดเห็นของผู้มีส่วนได้ส่วนเสีย"
        />
      ) : (
        <Table rowKey="id" size="middle" columns={columns} dataSource={list} pagination={false} />
      )}

      <Modal
        title="บันทึกประชาพิจารณ์ (Record Public Hearing)"
        open={createOpen}
        onOk={handleOk}
        onCancel={close}
        confirmLoading={createHearing.isPending}
        okText="บันทึก (Save)"
        cancelText="ยกเลิก (Cancel)"
      >
        <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
          <Form.Item
            name="heldAt"
            label="วันที่จัด (Held At)"
            rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}
          >
            <DatePicker style={{ width: '100%' }} format={THAI_DATE_FORMAT} />
          </Form.Item>
          <Form.Item
            name="location"
            label="สถานที่ (Location)"
            rules={[{ required: true, message: 'กรุณาระบุสถานที่' }]}
          >
            <Input placeholder="เช่น หอประชุมเทศบาลตำบลลำชี" />
          </Form.Item>
          <Form.Item
            name="attendeeCount"
            label="จำนวนผู้เข้าร่วม (Attendees)"
            rules={[{ required: true, message: 'กรุณาระบุจำนวน' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="summary" label="สรุปผล (Summary)">
            <Input.TextArea rows={3} placeholder="ข้อสรุปและข้อกังวลหลักจากเวที" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
