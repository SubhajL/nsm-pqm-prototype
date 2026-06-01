'use client';

import { Form, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';

import type { Folder } from '@/types/document';

export interface MoveFormValues {
  toFolderId: string;
}

interface MoveDocumentModalProps {
  open: boolean;
  /** All folders available in the project; the current folder is filtered out. */
  folders: Folder[];
  /** The file's current `folderId` so the source folder is excluded from the choices. */
  currentFolderId: string | undefined;
  form: FormInstance<MoveFormValues>;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}

/**
 * PR-Docs1 — move-file destination picker. Folders other than the file's
 * current parent become options; the user must pick one explicitly.
 */
export function MoveDocumentModal({
  open,
  folders,
  currentFolderId,
  form,
  confirmLoading,
  onCancel,
  onOk,
}: MoveDocumentModalProps) {
  const options = folders
    .filter((folder) => folder.id !== currentFolderId)
    .map((folder) => ({ value: folder.id, label: folder.name }));

  return (
    <Modal
      open={open}
      title="ย้ายไฟล์ไปยังโฟลเดอร์ (Move file to folder)"
      okText="ย้าย (Move)"
      cancelText="ยกเลิก (Cancel)"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="โฟลเดอร์ปลายทาง (Destination folder)"
          name="toFolderId"
          rules={[{ required: true, message: 'กรุณาเลือกโฟลเดอร์ปลายทาง (Select a destination)' }]}
        >
          <Select
            options={options}
            placeholder="เลือกโฟลเดอร์ (Choose a folder)"
            showSearch
            optionFilterProp="label"
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
