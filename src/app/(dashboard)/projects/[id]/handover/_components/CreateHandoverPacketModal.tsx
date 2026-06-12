'use client';

import { Form, Input, Modal, Select, message } from 'antd';

import { announce } from '@/components/a11y';
import { useCreateHandoverPacket } from '@/hooks/useHandover';
import { useAwardedContracts } from '@/hooks/useProcurement';

interface CreateHandoverPacketModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

interface CreatePacketFormValues {
  contractId?: string;
  notes?: string;
}

export function CreateHandoverPacketModal({
  projectId,
  open,
  onClose,
}: CreateHandoverPacketModalProps) {
  const [form] = Form.useForm<CreatePacketFormValues>();
  const createPacket = useCreateHandoverPacket(projectId);
  // Optional warranty link — the PR-24 contract supplies warrantyMonths.
  const { data: contracts } = useAwardedContracts(open ? projectId : undefined);

  const close = () => {
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    let values: CreatePacketFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd shows the field-level errors
    }

    try {
      await createPacket.mutateAsync({
        contractId: values.contractId ?? null,
        notes: values.notes?.trim() ?? '',
      });
      message.success('สร้างชุดส่งมอบแล้ว');
      announce('สร้างชุดส่งมอบเรียบร้อยแล้ว');
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
      title="สร้างชุดส่งมอบ (Create Handover Packet)"
      open={open}
      onOk={handleOk}
      onCancel={close}
      confirmLoading={createPacket.isPending}
      okText="สร้าง (Create)"
      cancelText="ยกเลิก (Cancel)"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="contractId"
          label="สัญญาอ้างอิง (Linked Contract — for warranty)"
          extra="เลือกสัญญาเพื่อให้ระบบคำนวณช่วงประกันเมื่อรับมอบ (optional)"
        >
          <Select
            allowClear
            placeholder="ไม่ระบุ (none)"
            options={(contracts ?? []).map((contract) => ({
              value: contract.id,
              label: `${contract.contractNumber} — ${contract.contractorName}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="notes" label="หมายเหตุ (Notes)">
          <Input.TextArea rows={2} placeholder="รายละเอียดเพิ่มเติม" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
