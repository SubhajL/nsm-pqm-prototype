'use client';

import { Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';

import { OrgUnitTreePicker } from '@/components/admin/OrgUnitTreePicker';
import {
  PROJECT_SIZE_TIERS,
  RID_ORG_UNIT_KINDS,
} from '@/types/rid/vocabulary';

import {
  CONSTRUCTION_TIER_LABELS,
  ORG_KIND_LABELS,
  type OrgUnitFormValues,
  type OrgUnitWithUserCount,
} from './helpers';

export function OrgUnitModal({
  open,
  mode,
  form,
  orgUnits,
  confirmLoading,
  onCancel,
  onOk,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  form: FormInstance<OrgUnitFormValues>;
  orgUnits: OrgUnitWithUserCount[];
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: () => void;
}) {
  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'เพิ่มหน่วยงาน' : 'แก้ไขหน่วยงาน'}
      okText="บันทึก"
      cancelText="ยกเลิก"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="ประเภทหน่วยงาน (Kind)"
          name="kind"
          rules={[{ required: true, message: 'กรุณาเลือกประเภทหน่วยงาน' }]}
        >
          <Select
            aria-label="ประเภทหน่วยงาน"
            options={RID_ORG_UNIT_KINDS.map((kind) => ({
              value: kind,
              label: ORG_KIND_LABELS[kind],
            }))}
          />
        </Form.Item>
        <Form.Item
          label="ชื่อหน่วยงาน"
          name="name"
          rules={[{ required: true, message: 'กรุณาระบุชื่อหน่วยงาน' }]}
        >
          <Input aria-label="ชื่อหน่วยงาน" />
        </Form.Item>
        <Form.Item label="ชื่อภาษาอังกฤษ (English name)" name="nameEn">
          <Input aria-label="ชื่อภาษาอังกฤษ" />
        </Form.Item>
        <Form.Item label="หน่วยงานแม่ (Parent unit)" name="parentId">
          <OrgUnitTreePicker
            units={orgUnits}
            ariaLabel="หน่วยงานแม่"
          />
        </Form.Item>
        <Form.Item label="รหัสศูนย์ต้นทุน (Cost center)" name="costCenter">
          <Input aria-label="รหัสศูนย์ต้นทุน" placeholder="เช่น CC-1234 (รอ RID-IT ยืนยันรูปแบบ)" />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev: OrgUnitFormValues, next: OrgUnitFormValues) =>
            prev.kind !== next.kind
          }
        >
          {() =>
            form.getFieldValue('kind') === 'construction_office' ? (
              <Form.Item label="ระดับสำนักงานก่อสร้าง (Construction tier)" name="constructionTier">
                <Select
                  aria-label="ระดับสำนักงานก่อสร้าง"
                  allowClear
                  options={PROJECT_SIZE_TIERS.map((tier) => ({
                    value: tier,
                    label: CONSTRUCTION_TIER_LABELS[tier],
                  }))}
                />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
}
