'use client';

import { Form, Input, InputNumber, Modal, message } from 'antd';

import { announce } from '@/components/a11y';
import { useCreateVendorSow } from '@/hooks/useItClass';

interface CreateVendorSowModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

interface CreateSowFormValues {
  phase: string;
  scopeSummary: string;
  uatCriteria: string;
  warrantyMonths?: number;
}

export function CreateVendorSowModal({
  projectId,
  open,
  onClose,
}: CreateVendorSowModalProps) {
  const [form] = Form.useForm<CreateSowFormValues>();
  const createSow = useCreateVendorSow(projectId);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    let values: CreateSowFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createSow.mutateAsync({
        phase: values.phase.trim(),
        scopeSummary: values.scopeSummary.trim(),
        uatCriteria: values.uatCriteria.trim(),
        warrantyMonths: values.warrantyMonths ?? null,
      });
      message.success('สร้าง SOW แล้ว');
      announce('สร้างสัญญาผู้ขายเรียบร้อยแล้ว');
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
      title="สร้าง SOW (Create Vendor SOW)"
      open={open}
      onOk={handleOk}
      onCancel={close}
      confirmLoading={createSow.isPending}
      okText="สร้าง (Create)"
      cancelText="ยกเลิก (Cancel)"
    >
      <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
        <Form.Item
          name="phase"
          label="งวดงาน (Phase)"
          rules={[{ required: true, message: 'กรุณาระบุงวดงาน' }]}
        >
          <Input placeholder="เช่น Phase 1 — SRS" />
        </Form.Item>
        <Form.Item
          name="scopeSummary"
          label="ขอบเขต (Scope Summary)"
          rules={[{ required: true, message: 'กรุณาระบุขอบเขต' }]}
        >
          <Input.TextArea rows={2} placeholder="สรุปขอบเขตงานของงวดนี้" />
        </Form.Item>
        <Form.Item
          name="uatCriteria"
          label="เกณฑ์ UAT (UAT Criteria)"
          rules={[{ required: true, message: 'กรุณาระบุเกณฑ์ UAT' }]}
        >
          <Input.TextArea rows={3} placeholder="รายการเกณฑ์การตรวจรับ (หนึ่งบรรทัดต่อข้อ)" />
        </Form.Item>
        <Form.Item name="warrantyMonths" label="ระยะประกัน (Warranty, เดือน)">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
