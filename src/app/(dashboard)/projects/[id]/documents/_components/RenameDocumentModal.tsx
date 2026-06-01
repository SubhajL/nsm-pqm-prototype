'use client';

import { Form, Input, Modal } from 'antd';
import type { FormInstance } from 'antd';

export interface RenameFormValues {
  name: string;
}

interface RenameDocumentModalProps {
  open: boolean;
  /** Which entity is being renamed — drives the dialog title only. */
  kind: 'folder' | 'file';
  form: FormInstance<RenameFormValues>;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}

/**
 * PR-Docs1 — bilingual rename modal shared by folder rename (entry point in
 * `DocumentsHeader`) and file rename (entry point in `FilesTablePanel`).
 * Kept generic over the entity kind so the same form instance + validation
 * apply to both flows.
 */
export function RenameDocumentModal({
  open,
  kind,
  form,
  confirmLoading,
  onCancel,
  onOk,
}: RenameDocumentModalProps) {
  const title =
    kind === 'folder'
      ? 'เปลี่ยนชื่อโฟลเดอร์ (Rename folder)'
      : 'เปลี่ยนชื่อไฟล์ (Rename file)';
  const fieldLabel = kind === 'folder' ? 'ชื่อโฟลเดอร์ (Folder name)' : 'ชื่อไฟล์ (File name)';

  return (
    <Modal
      open={open}
      title={title}
      okText="บันทึก (Save)"
      cancelText="ยกเลิก (Cancel)"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label={fieldLabel}
          name="name"
          rules={[{ required: true, message: 'กรุณาระบุชื่อ (Name is required)' }]}
        >
          <Input autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
