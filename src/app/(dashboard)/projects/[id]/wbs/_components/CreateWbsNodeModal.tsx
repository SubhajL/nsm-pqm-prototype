'use client';

import { Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';

import type { CreateWBSNodeInput } from '@/hooks/useWBS';

export function CreateWbsNodeModal({
  open,
  onCancel,
  onOk,
  confirmLoading,
  form,
  eligibleParentOptions,
}: {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  form: FormInstance<CreateWBSNodeInput>;
  eligibleParentOptions: Array<{ label: string; value: string }>;
}) {
  return (
    <Modal
      title="เพิ่ม WBS Node"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={confirmLoading}
    >
      <Form<CreateWBSNodeInput> form={form} layout="vertical">
        <Form.Item<CreateWBSNodeInput>
          label="ชื่องาน WBS"
          name="name"
          rules={[{ required: true, message: 'กรุณาระบุชื่อ WBS' }]}
        >
          <Input placeholder="ระบุชื่อ WBS node" />
        </Form.Item>
        <Form.Item<CreateWBSNodeInput> label="WBS แม่" name="parentId">
          <Select
            allowClear
            placeholder="สร้างเป็นระดับบนสุดของโครงการ"
            options={eligibleParentOptions}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
