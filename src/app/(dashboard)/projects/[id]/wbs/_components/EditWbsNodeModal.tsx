'use client';

import { Form, Input, InputNumber, Modal } from 'antd';
import type { FormInstance } from 'antd';

export interface EditWbsNodeFormValues {
  name: string;
  weight: number;
  progress: number;
}

/** PR-C2 — edit a WBS node's name/weight/progress. */
export function EditWbsNodeModal({
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
  form: FormInstance<EditWbsNodeFormValues>;
}) {
  return (
    <Modal
      title="แก้ไข WBS Node (Edit WBS node)"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก (Save)"
      cancelText="ยกเลิก (Cancel)"
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form<EditWbsNodeFormValues> form={form} layout="vertical">
        <Form.Item<EditWbsNodeFormValues>
          label="ชื่องาน (Name)"
          name="name"
          rules={[{ required: true, message: 'กรุณาระบุชื่อ (Name is required)' }]}
        >
          <Input autoFocus />
        </Form.Item>
        <Form.Item<EditWbsNodeFormValues>
          label="น้ำหนัก (Weight %) — 0–100"
          name="weight"
          rules={[{ required: true, type: 'number', min: 0, max: 100 }]}
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item<EditWbsNodeFormValues>
          label="ความคืบหน้า (Progress %) — 0–100"
          name="progress"
          rules={[{ required: true, type: 'number', min: 0, max: 100 }]}
        >
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
