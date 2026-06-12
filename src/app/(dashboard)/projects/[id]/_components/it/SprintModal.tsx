'use client';

import { useEffect } from 'react';
import { DatePicker, Form, Input, InputNumber, Modal, message } from 'antd';
import { THAI_DATE_FORMAT } from '@/lib/antd-thai-locale';
import dayjs, { type Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import { useCreateItSprint, useUpdateItSprint } from '@/hooks/useItClass';
import type { ItSprint } from '@/types/sprint';

interface SprintModalProps {
  projectId: string;
  /** Prefilled sprint number for create mode (ignored when editing). */
  nextSprintNumber: number;
  /** Null → create mode; non-null → edit mode (PATCHable fields only). */
  sprint: ItSprint | null;
  open: boolean;
  onClose: () => void;
}

interface SprintFormValues {
  sprintNumber: number;
  range: [Dayjs, Dayjs];
  goal: string;
  velocityPoints: number;
  completedPoints?: number;
  notes?: string;
}

/**
 * Create + edit modal for sprints. Edit mode only exposes the fields the
 * PATCH route accepts (goal, velocity, completed points, notes) — sprint
 * number and dates are fixed once created.
 */
export function SprintModal({
  projectId,
  nextSprintNumber,
  sprint,
  open,
  onClose,
}: SprintModalProps) {
  const [form] = Form.useForm<SprintFormValues>();
  const createSprint = useCreateItSprint(projectId);
  const updateSprint = useUpdateItSprint(projectId);
  const isEdit = sprint !== null;

  useEffect(() => {
    if (!open) return;
    if (sprint) {
      form.setFieldsValue({
        sprintNumber: sprint.sprintNumber,
        range: [dayjs(sprint.startDate), dayjs(sprint.endDate)],
        goal: sprint.goal,
        velocityPoints: sprint.velocityPoints,
        completedPoints: sprint.completedPoints,
        notes: sprint.notes,
      });
    } else {
      form.setFieldsValue({ sprintNumber: nextSprintNumber });
    }
  }, [form, nextSprintNumber, open, sprint]);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    let values: SprintFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      if (isEdit && sprint) {
        await updateSprint.mutateAsync({
          sprintId: sprint.id,
          goal: values.goal.trim(),
          velocityPoints: values.velocityPoints,
          completedPoints: values.completedPoints ?? 0,
          notes: values.notes?.trim() ?? '',
        });
        message.success('อัปเดตสปรินต์แล้ว');
        announce('อัปเดตสปรินต์เรียบร้อยแล้ว');
      } else {
        await createSprint.mutateAsync({
          sprintNumber: values.sprintNumber,
          startDate: values.range[0].format('YYYY-MM-DD'),
          endDate: values.range[1].format('YYYY-MM-DD'),
          goal: values.goal.trim(),
          velocityPoints: values.velocityPoints,
          completedPoints: values.completedPoints ?? 0,
          notes: values.notes?.trim() ?? '',
        });
        message.success('สร้างสปรินต์แล้ว');
        announce('สร้างสปรินต์เรียบร้อยแล้ว');
      }
      close();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <Modal
      title={isEdit ? 'แก้ไขสปรินต์ (Edit Sprint)' : 'สร้างสปรินต์ (Create Sprint)'}
      open={open}
      onOk={handleOk}
      onCancel={close}
      confirmLoading={createSprint.isPending || updateSprint.isPending}
      okText={isEdit ? 'บันทึก (Save)' : 'สร้าง (Create)'}
      cancelText="ยกเลิก (Cancel)"
    >
      <Form form={form} layout="vertical" requiredMark style={{ marginTop: 12 }}>
        <Form.Item
          name="sprintNumber"
          label="สปรินต์ที่ (Sprint No.)"
          rules={[{ required: true, message: 'กรุณาระบุหมายเลขสปรินต์' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="range"
          label="ช่วงเวลา (Sprint Window)"
          rules={[{ required: true, message: 'กรุณาระบุช่วงเวลา' }]}
        >
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            format={THAI_DATE_FORMAT}
            disabled={isEdit}
          />
        </Form.Item>
        <Form.Item
          name="goal"
          label="เป้าหมาย (Goal)"
          rules={[{ required: true, message: 'กรุณาระบุเป้าหมาย' }]}
        >
          <Input placeholder="เช่น ส่งมอบโมดูลทะเบียนผู้ใช้" />
        </Form.Item>
        <Form.Item
          name="velocityPoints"
          label="แต้มตามแผน (Planned Points)"
          rules={[{ required: true, message: 'กรุณาระบุแต้มตามแผน' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="completedPoints" label="แต้มที่ทำได้ (Completed Points)">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="notes" label="หมายเหตุ (Notes)">
          <Input.TextArea rows={2} placeholder="บันทึกเพิ่มเติมของสปรินต์" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
