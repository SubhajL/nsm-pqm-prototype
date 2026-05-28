'use client';

import { Form, Input, InputNumber, Modal, Segmented } from 'antd';
import type { FormInstance } from 'antd';

export function CreateIssueModal({
  open,
  form,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  form: FormInstance;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      title="เปิดเคสใหม่"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="หัวข้อปัญหา" name="title" rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}>
          <Input placeholder="เช่น แบบก่อสร้างไม่ตรงกับหน้างาน" />
        </Form.Item>
        <Form.Item label="ความรุนแรง" name="severity" rules={[{ required: true, message: 'กรุณาระบุความรุนแรง' }]}>
          <Segmented
            options={[
              { label: 'สูง', value: 'high' },
              { label: 'ปานกลาง', value: 'medium' },
              { label: 'ต่ำ', value: 'low' },
            ]}
          />
        </Form.Item>
        <Form.Item label="ผู้รับผิดชอบ" name="assignee" rules={[{ required: true, message: 'กรุณาระบุผู้รับผิดชอบ' }]}>
          <Input placeholder="เช่น น.ส.วิภา ขจรศักดิ์" />
        </Form.Item>
        <Form.Item label="อ้างอิง WBS" name="linkedWbs">
          <Input placeholder="เช่น WBS 1.0" />
        </Form.Item>
        <Form.Item label="SLA (ชั่วโมง)" name="slaHours" rules={[{ required: true, message: 'กรุณาระบุ SLA' }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
