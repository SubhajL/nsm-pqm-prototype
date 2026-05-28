'use client';

import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';

import type { DocumentFile } from '@/types/document';

import type { VersionFormValues } from './helpers';

export function VersionModal({
  open,
  form,
  versionTarget,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  form: FormInstance<VersionFormValues>;
  versionTarget: DocumentFile | null;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      open={open}
      title="อัปโหลดเวอร์ชันใหม่"
      okText="บันทึก"
      cancelText="ยกเลิก"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="ไฟล์เป้าหมาย">
          <Input aria-label="ไฟล์เป้าหมาย" value={versionTarget?.name} readOnly />
        </Form.Item>
        <Form.Item
          label="หมายเหตุเวอร์ชัน"
          name="note"
          rules={[{ required: true, message: 'กรุณาระบุหมายเหตุเวอร์ชัน' }]}
        >
          <Input.TextArea aria-label="หมายเหตุเวอร์ชัน" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
