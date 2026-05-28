'use client';

import { Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';

import { OrgUnitTreePicker } from '@/components/admin/OrgUnitTreePicker';

import type {
  OrgUnitWithUserCount,
  User,
  UserFormValues,
} from './helpers';

export function UserModal({
  open,
  editingUser,
  form,
  orgUnits,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  editingUser: User | null;
  form: FormInstance<UserFormValues>;
  orgUnits: OrgUnitWithUserCount[];
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      open={open}
      title={editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}
      okText="บันทึก"
      cancelText="ยกเลิก"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="ชื่อ-สกุล"
          name="name"
          rules={[{ required: true, message: 'กรุณาระบุชื่อ-สกุล' }]}
        >
          <Input aria-label="ชื่อ-สกุล" />
        </Form.Item>
        <Form.Item
          label="ตำแหน่ง"
          name="position"
          rules={[{ required: true, message: 'กรุณาระบุตำแหน่ง' }]}
        >
          <Input aria-label="ตำแหน่ง" />
        </Form.Item>
        <Form.Item
          label="บทบาทในระบบ"
          name="role"
          rules={[{ required: true, message: 'กรุณาเลือกบทบาท' }]}
        >
          <Select
            aria-label="บทบาทในระบบ"
            options={[
              'System Admin',
              'Project Manager',
              'Engineer',
              'Coordinator',
              'Team Member',
              'Executive',
              'Consultant',
            ].map((role) => ({ value: role, label: role }))}
          />
        </Form.Item>
        <Form.Item
          label="สังกัดหน่วยงาน"
          name="departmentId"
          rules={[{ required: true, message: 'กรุณาเลือกหน่วยงาน' }]}
        >
          <OrgUnitTreePicker
            units={orgUnits}
            ariaLabel="สังกัดหน่วยงาน"
          />
        </Form.Item>
        <Form.Item
          label="อีเมล"
          name="email"
          rules={[{ required: true, message: 'กรุณาระบุอีเมล' }]}
        >
          <Input aria-label="อีเมล" />
        </Form.Item>
        <Form.Item
          label="เบอร์โทร"
          name="phone"
          rules={[{ required: true, message: 'กรุณาระบุเบอร์โทร' }]}
        >
          <Input aria-label="เบอร์โทร" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
