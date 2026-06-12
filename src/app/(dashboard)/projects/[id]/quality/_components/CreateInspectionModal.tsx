'use client';

import { DatePicker, Form, Input, Modal, Select } from 'antd';
import { THAI_DATE_FORMAT } from '@/lib/antd-thai-locale';
import type { FormInstance } from 'antd';

import type { ITPItem } from '@/types/quality';

export function CreateInspectionModal({
  open,
  form,
  itpItems,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  form: FormInstance;
  itpItems: ITPItem[];
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      title="บันทึกผลตรวจคุณภาพใหม่"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="หัวข้อการตรวจ" name="title" rules={[{ required: true, message: 'กรุณาระบุหัวข้อการตรวจ' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="รายการ ITP" name="itpId" rules={[{ required: true, message: 'กรุณาเลือกรายการ ITP' }]}>
          <Select
            options={itpItems.map((item) => ({ value: item.id, label: item.item }))}
          />
        </Form.Item>
        <Form.Item label="วันที่ตรวจ" name="date" rules={[{ required: true, message: 'กรุณาเลือกวันที่ตรวจ' }]}>
          <DatePicker format={THAI_DATE_FORMAT} placeholder="เลือกวันที่ตรวจ" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="เวลา" name="time" rules={[{ required: true, message: 'กรุณาระบุเวลา' }]}>
          <Input placeholder="HH:mm" />
        </Form.Item>
        <Form.Item label="ผู้ตรวจสอบ" name="inspectors" rules={[{ required: true, message: 'กรุณาระบุผู้ตรวจสอบ' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="WBS อ้างอิง" name="wbsLink" rules={[{ required: true, message: 'กรุณาระบุ WBS อ้างอิง' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="มาตรฐานอ้างอิง" name="standards" rules={[{ required: true, message: 'กรุณาระบุมาตรฐานอ้างอิง' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="ผลรวม" name="overallResult" initialValue="pass" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'pass', label: 'ผ่าน (PASS)' },
              { value: 'conditional', label: 'Conditional' },
            ]}
          />
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {({ getFieldValue }) =>
            getFieldValue('overallResult') === 'conditional' ? (
              <Form.Item label="เหตุผล/หมายเหตุ" name="failReason" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
}
