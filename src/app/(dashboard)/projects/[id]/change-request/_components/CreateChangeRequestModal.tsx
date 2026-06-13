'use client';

import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import type { FormInstance } from 'antd';

import { BahtInput } from '@/components/common';

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
              {/* InputNumber (not Input type="number") so the form emits a
                  real number — the API schema is a strict z.number(). */}
              <BahtInput aria-label="ผลกระทบงบประมาณ" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="ผลกระทบเวลา"
              name="scheduleImpact"
              rules={[{ required: true, message: 'กรุณาระบุผลกระทบเวลา' }]}
            >
              <InputNumber
                aria-label="ผลกระทบเวลา"
                style={{ width: '100%' }}
              />
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
