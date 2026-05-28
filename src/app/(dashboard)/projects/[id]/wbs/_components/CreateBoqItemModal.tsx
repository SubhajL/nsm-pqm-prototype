'use client';

import { Form, Input, InputNumber, Modal } from 'antd';
import type { FormInstance } from 'antd';

import type { CreateBOQItemInput } from '@/hooks/useBOQ';

export function CreateBoqItemModal({
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
  form: FormInstance<CreateBOQItemInput>;
}) {
  return (
    <Modal
      title="เพิ่มรายการ BOQ"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={confirmLoading}
    >
      <Form<CreateBOQItemInput> form={form} layout="vertical">
        <Form.Item
          label="รายการ"
          name="description"
          rules={[{ required: true, message: 'กรุณาระบุรายการ BOQ' }]}
        >
          <Input placeholder="เช่น งานโครงสร้างเหล็ก" />
        </Form.Item>
        <Form.Item
          label="ปริมาณ"
          name="quantity"
          rules={[{ required: true, message: 'กรุณาระบุปริมาณ' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="หน่วย"
          name="unit"
          rules={[{ required: true, message: 'กรุณาระบุหน่วย' }]}
        >
          <Input placeholder="เช่น งาน, ตร.ม., ชุด" />
        </Form.Item>
        <Form.Item
          label="ราคา/หน่วย"
          name="unitPrice"
          rules={[{ required: true, message: 'กรุณาระบุราคา/หน่วย' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
