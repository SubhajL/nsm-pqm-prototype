'use client';

import { DatePicker, Form, InputNumber, Modal } from 'antd';
import type { FormInstance } from 'antd';

export function EvmSnapshotModal({
  open,
  isOutsourced,
  form,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  isOutsourced: boolean;
  form: FormInstance;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      title={isOutsourced ? 'บันทึกงวดความก้าวหน้า/เบิกจ่ายใหม่' : 'บันทึกงวด EVM ใหม่'}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="เดือน"
          name="month"
          rules={[{ required: true, message: 'กรุณาเลือกเดือน' }]}
        >
          <DatePicker
            picker="month"
            format="MM/YYYY"
            placeholder="เลือกเดือน"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="PV" name="pv" rules={[{ required: true, message: 'กรุณาระบุ PV' }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="EV" name="ev" rules={[{ required: true, message: 'กรุณาระบุ EV' }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={isOutsourced ? 'Paid to Date' : 'AC'}
          name="actualAmount"
          rules={[{ required: true, message: isOutsourced ? 'กรุณาระบุยอดจ่ายสะสม' : 'กรุณาระบุ AC' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
