'use client';

import { Col, Form, Input, Modal, Row, Select } from 'antd';
import type { FormInstance } from 'antd';

import type { ChangeRequestFormValues } from './types';

export function CreateChangeRequestModal({
  open,
  form,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  form: FormInstance<ChangeRequestFormValues>;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      open={open}
      title="สร้าง Change Request"
      okText="บันทึก"
      cancelText="ยกเลิก"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="หัวข้อ"
          name="title"
          rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}
        >
          <Input aria-label="หัวข้อ" />
        </Form.Item>
        <Form.Item
          label="เหตุผล"
          name="reason"
          rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}
        >
          <Input.TextArea aria-label="เหตุผล" rows={3} />
        </Form.Item>
        <Form.Item
          label="เชื่อมโยง WBS"
          name="linkedWbs"
          rules={[{ required: true, message: 'กรุณาระบุ WBS' }]}
        >
          <Input aria-label="เชื่อมโยง WBS" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="ผลกระทบงบประมาณ"
              name="budgetImpact"
              rules={[{ required: true, message: 'กรุณาระบุผลกระทบงบประมาณ' }]}
            >
              <Input aria-label="ผลกระทบงบประมาณ" type="number" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="ผลกระทบเวลา"
              name="scheduleImpact"
              rules={[{ required: true, message: 'กรุณาระบุผลกระทบเวลา' }]}
            >
              <Input aria-label="ผลกระทบเวลา" type="number" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="ระดับความสำคัญ"
          name="priority"
          initialValue="medium"
          rules={[{ required: true, message: 'กรุณาเลือกระดับความสำคัญ' }]}
        >
          <Select
            aria-label="ระดับความสำคัญ"
            options={[
              { value: 'high', label: 'สูง (High)' },
              { value: 'medium', label: 'ปานกลาง (Medium)' },
              { value: 'low', label: 'ต่ำ (Low)' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
