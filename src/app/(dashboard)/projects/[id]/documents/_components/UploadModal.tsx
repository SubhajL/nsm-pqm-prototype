'use client';

import { Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';

import type { Folder } from '@/types/document';

import type { UploadFormValues } from './helpers';

export function UploadModal({
  open,
  form,
  folders,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  form: FormInstance<UploadFormValues>;
  folders: Folder[];
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      open={open}
      title="อัปโหลดเอกสาร"
      okText="บันทึก"
      cancelText="ยกเลิก"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="ชื่อไฟล์"
          name="name"
          rules={[{ required: true, message: 'กรุณาระบุชื่อไฟล์' }]}
        >
          <Input aria-label="ชื่อไฟล์" />
        </Form.Item>
        <Form.Item
          label="โฟลเดอร์ปลายทาง"
          name="folderId"
          rules={[{ required: true, message: 'กรุณาเลือกโฟลเดอร์' }]}
        >
          <Select
            aria-label="โฟลเดอร์ปลายทาง"
            options={folders
              .filter((folder) => folder.parentId !== null)
              .map((folder) => ({ value: folder.id, label: folder.name }))}
          />
        </Form.Item>
        <Form.Item
          label="ประเภทเอกสาร"
          name="type"
          rules={[{ required: true, message: 'กรุณาระบุประเภทเอกสาร' }]}
        >
          <Input aria-label="ประเภทเอกสาร" />
        </Form.Item>
        <Form.Item
          label="ขนาดไฟล์"
          name="size"
          rules={[{ required: true, message: 'กรุณาระบุขนาดไฟล์' }]}
        >
          <Input aria-label="ขนาดไฟล์" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
