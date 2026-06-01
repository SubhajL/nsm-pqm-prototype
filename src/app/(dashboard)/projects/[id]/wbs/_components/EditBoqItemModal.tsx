'use client';

import { Form, Input, InputNumber, Modal } from 'antd';
import type { FormInstance } from 'antd';

export interface EditBoqItemFormValues {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

/**
 * PR-C2 — edit a BOQ line item. `total` is server-derived from
 * quantity × unitPrice, so this form intentionally hides total.
 */
export function EditBoqItemModal({
  open,
  onCancel,
  onOk,
  confirmLoading,
  form,
}: {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  form: FormInstance<EditBoqItemFormValues>;
}) {
  return (
    <Modal
      title="แก้ไขรายการ BOQ (Edit BOQ item)"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก (Save)"
      cancelText="ยกเลิก (Cancel)"
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form<EditBoqItemFormValues> form={form} layout="vertical">
        <Form.Item<EditBoqItemFormValues>
          label="รายการ (Description)"
          name="description"
          rules={[{ required: true, message: 'กรุณาระบุรายการ (Description required)' }]}
        >
          <Input autoFocus />
        </Form.Item>
        <Form.Item<EditBoqItemFormValues>
          label="ปริมาณ (Quantity)"
          name="quantity"
          rules={[{ required: true, type: 'number', min: 0 }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item<EditBoqItemFormValues>
          label="หน่วย (Unit)"
          name="unit"
          rules={[{ required: true, message: 'กรุณาระบุหน่วย (Unit required)' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item<EditBoqItemFormValues>
          label="ราคา/หน่วย (Unit price)"
          name="unitPrice"
          rules={[{ required: true, type: 'number', min: 0 }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
