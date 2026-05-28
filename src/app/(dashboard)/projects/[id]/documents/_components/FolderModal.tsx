'use client';

import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';

import type { FolderFormValues } from './helpers';

export function FolderModal({
  open,
  form,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  form: FormInstance<FolderFormValues>;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      open={open}
      title="สร้างโฟลเดอร์"
      okText="บันทึก"
      cancelText="ยกเลิก"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="ชื่อโฟลเดอร์"
          name="name"
          rules={[{ required: true, message: 'กรุณาระบุชื่อโฟลเดอร์' }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
