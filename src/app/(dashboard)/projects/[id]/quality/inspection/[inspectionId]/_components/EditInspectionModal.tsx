'use client';

import { useEffect } from 'react';
import { Form, Input, Modal, Select, message } from 'antd';

import { announce } from '@/components/a11y';
import { useUpdateInspection } from '@/hooks/useQuality';
import type { InspectionRecord, WorkflowStatus } from '@/types/quality';

interface EditInspectionModalProps {
  open: boolean;
  inspection: InspectionRecord;
  projectId: string;
  onClose: () => void;
}

interface EditFormValues {
  overallResult: 'pass' | 'conditional';
  failReason: string;
  workflowStatus: WorkflowStatus;
}

/**
 * PR-PRQM-K — Inspection edit modal.
 *
 * Surfaces the three editable inspection-metadata fields covered by
 * `PATCH /api/quality/inspections/[id]`:
 *   - overallResult (pass / conditional)
 *   - failReason (free text — visible when conditional)
 *   - workflowStatus (draft → confirmed → signed)
 *
 * Validation + state-machine guards run server-side; the modal surfaces
 * any rejection as an antd `message.error` + a polite SR announcement.
 */
export function EditInspectionModal({
  open,
  inspection,
  projectId,
  onClose,
}: EditInspectionModalProps) {
  const [form] = Form.useForm<EditFormValues>();
  const updateMutation = useUpdateInspection(projectId);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        overallResult: (inspection.overallResult === 'conditional'
          ? 'conditional'
          : 'pass') as 'pass' | 'conditional',
        failReason: inspection.failReason ?? '',
        workflowStatus: inspection.workflowStatus ?? 'draft',
      });
    }
  }, [open, inspection, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await updateMutation.mutateAsync({
        id: inspection.id,
        overallResult: values.overallResult,
        failReason: values.failReason.trim(),
        workflowStatus: values.workflowStatus,
      });
      message.success('บันทึกการตรวจแล้ว');
      announce('บันทึกการตรวจคุณภาพเรียบร้อยแล้ว');
      onClose();
    } catch (error) {
      // Form validation errors come back as `{ errorFields: [...] }`;
      // anything else is a server error we should surface.
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      const detail = error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ';
      message.error(detail);
      announce(`เกิดข้อผิดพลาด: ${detail}`, 'assertive');
    }
  };

  return (
    <Modal
      open={open}
      title="แก้ไขผลการตรวจ (Edit Inspection)"
      okText="บันทึก (Save)"
      cancelText="ยกเลิก (Cancel)"
      confirmLoading={updateMutation.isPending}
      onOk={() => {
        void handleOk();
      }}
      onCancel={onClose}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="overallResult"
          label="ผลรวม (Overall Result)"
          rules={[{ required: true, message: 'กรุณาเลือกผลรวม' }]}
        >
          <Select
            options={[
              { label: 'ผ่าน (Pass)', value: 'pass' },
              { label: 'ไม่ผ่านเงื่อนไข — Conditional (FAIL)', value: 'conditional' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="failReason"
          label="เหตุผล (Reason / Notes)"
          tooltip="ใส่เหตุผลเมื่อผลรวมเป็น Conditional (Required only when Conditional)"
        >
          <Input.TextArea rows={3} placeholder="เช่น อุณหภูมิคอนกรีตเกินเกณฑ์" />
        </Form.Item>

        <Form.Item
          name="workflowStatus"
          label="สถานะ Workflow (Workflow Status)"
          tooltip="draft → confirmed → signed (ไม่สามารถข้ามขั้น)"
          rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}
        >
          <Select
            options={[
              { label: 'แบบร่าง (Draft)', value: 'draft' },
              { label: 'ยืนยันแล้ว (Confirmed)', value: 'confirmed' },
              { label: 'ลงนามแล้ว (Signed)', value: 'signed' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
