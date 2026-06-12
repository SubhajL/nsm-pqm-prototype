'use client';

import { DatePicker, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { THAI_DATE_FORMAT } from '@/lib/antd-thai-locale';
import type { Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import { BahtInput } from '@/components/common';
import { useCreateWorkPeriod } from '@/hooks/useWorkPeriods';

interface CreateWorkPeriodModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

interface CreateWorkPeriodFormValues {
  number: number;
  title: string;
  deliverables?: string[];
  plannedRange: [Dayjs, Dayjs];
  amount: number;
  percentage: number;
}

export function CreateWorkPeriodModal({
  projectId,
  open,
  onClose,
}: CreateWorkPeriodModalProps) {
  const [form] = Form.useForm<CreateWorkPeriodFormValues>();
  const createWorkPeriod = useCreateWorkPeriod(projectId);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    let values: CreateWorkPeriodFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createWorkPeriod.mutateAsync({
        number: values.number,
        title: values.title.trim(),
        deliverables: values.deliverables ?? [],
        plannedStartDate: values.plannedRange[0].format('YYYY-MM-DD'),
        plannedEndDate: values.plannedRange[1].format('YYYY-MM-DD'),
        amount: values.amount,
        percentage: values.percentage,
      });
      message.success('สร้างงวดงานแล้ว');
      announce('สร้างงวดงานเรียบร้อยแล้ว');
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <Modal
      title="สร้างงวดงาน (Create Work Period)"
      open={open}
      onOk={handleOk}
      onCancel={close}
      confirmLoading={createWorkPeriod.isPending}
      okText="สร้าง (Create)"
      cancelText="ยกเลิก (Cancel)"
    >
      <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
        <Form.Item
          name="number"
          label="งวดที่ (Period No.)"
          rules={[{ required: true, message: 'กรุณาระบุงวดที่' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="title"
          label="ชื่องวดงาน (Title)"
          rules={[{ required: true, message: 'กรุณาระบุชื่องวดงาน' }]}
        >
          <Input placeholder="เช่น งานฐานราก งวดที่ 1" />
        </Form.Item>
        <Form.Item name="deliverables" label="รายการส่งมอบ (Deliverables)">
          <Select
            mode="tags"
            tokenSeparators={[',']}
            placeholder="พิมพ์แล้วกด Enter เพื่อเพิ่มรายการ"
          />
        </Form.Item>
        <Form.Item
          name="plannedRange"
          label="ช่วงเวลาตามแผน (Planned Period)"
          rules={[{ required: true, message: 'กรุณาระบุช่วงเวลา' }]}
        >
          <DatePicker.RangePicker style={{ width: '100%' }} format={THAI_DATE_FORMAT} />
        </Form.Item>
        <Form.Item
          name="amount"
          label="มูลค่างวดงาน (Amount, บาท)"
          rules={[{ required: true, message: 'กรุณาระบุมูลค่า' }]}
        >
          <BahtInput min={0} />
        </Form.Item>
        <Form.Item
          name="percentage"
          label="สัดส่วนของงบประมาณ (% of budget)"
          rules={[{ required: true, message: 'กรุณาระบุสัดส่วน' }]}
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
