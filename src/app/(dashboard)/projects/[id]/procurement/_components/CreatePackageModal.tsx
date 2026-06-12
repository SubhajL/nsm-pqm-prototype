'use client';

import { Form, Input, InputNumber, Modal, Select, message } from 'antd';

import { announce } from '@/components/a11y';
import { useCreateProcurementPackage } from '@/hooks/useProcurement';
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_METHOD_LABELS,
  type ProcurementMethod,
} from '@/types/procurement-package';

interface CreatePackageModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

interface CreatePackageFormValues {
  name: string;
  procurementMethod: ProcurementMethod;
  budgetCeiling: number;
  notes?: string;
}

export function CreatePackageModal({
  projectId,
  open,
  onClose,
}: CreatePackageModalProps) {
  const [form] = Form.useForm<CreatePackageFormValues>();
  const createPackage = useCreateProcurementPackage(projectId);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    let values: CreatePackageFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createPackage.mutateAsync({
        name: values.name.trim(),
        procurementMethod: values.procurementMethod,
        budgetCeiling: values.budgetCeiling,
        notes: values.notes?.trim() ?? '',
      });
      message.success('สร้างชุดจัดซื้อแล้ว');
      announce('สร้างชุดจัดซื้อจัดจ้างเรียบร้อยแล้ว');
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
      title="สร้างชุดจัดซื้อ (Create Procurement Package)"
      open={open}
      onOk={handleOk}
      onCancel={close}
      confirmLoading={createPackage.isPending}
      okText="สร้าง (Create)"
      cancelText="ยกเลิก (Cancel)"
    >
      <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="ชื่อชุดจัดซื้อ (Package Name)"
          rules={[{ required: true, message: 'กรุณาระบุชื่อชุดจัดซื้อ' }]}
        >
          <Input placeholder="เช่น งานก่อสร้างอาคารนิทรรศการ ระยะที่ 1" />
        </Form.Item>
        <Form.Item
          name="procurementMethod"
          label="วิธีจัดหา (Procurement Method)"
          rules={[{ required: true, message: 'กรุณาเลือกวิธีจัดหา' }]}
        >
          <Select
            placeholder="เลือกวิธีจัดหา"
            options={PROCUREMENT_METHODS.map((method) => ({
              value: method,
              label: `${PROCUREMENT_METHOD_LABELS[method].th} (${PROCUREMENT_METHOD_LABELS[method].en})`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="budgetCeiling"
          label="วงเงิน (Budget Ceiling, บาท)"
          rules={[{ required: true, message: 'กรุณาระบุวงเงิน' }]}
        >
          <InputNumber<number>
            min={0}
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => Number((value ?? '').replace(/,/g, ''))}
          />
        </Form.Item>
        <Form.Item name="notes" label="หมายเหตุ (Notes)">
          <Input.TextArea rows={2} placeholder="รายละเอียดเพิ่มเติม" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
