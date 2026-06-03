'use client';

import { useState } from 'react';
import { Button, Form, Input, List, Space, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { useCreateDeliverySlip } from '@/hooks/useWorkPeriods';
import { formatThaiDateShort } from '@/lib/date-utils';
import type { DeliverySlip } from '@/types/delivery-slip';

const { Text } = Typography;

interface DeliverySlipSectionProps {
  workPeriodId: string;
  slips: DeliverySlip[];
  canManage: boolean;
}

/** ใบส่งมอบงาน rail — the evidence required before `submitted`. */
export function DeliverySlipSection({
  workPeriodId,
  slips,
  canManage,
}: DeliverySlipSectionProps) {
  const [form] = Form.useForm<{ notes: string }>();
  const [formOpen, setFormOpen] = useState(false);
  const createSlip = useCreateDeliverySlip(workPeriodId);

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createSlip.mutateAsync({ attachedDocIds: [], notes: values.notes?.trim() ?? '' });
      message.success('บันทึกใบส่งมอบงานแล้ว');
      announce('บันทึกใบส่งมอบงานเรียบร้อยแล้ว');
      form.resetFields();
      setFormOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
      }
    }
  };

  return (
    <section aria-label="ใบส่งมอบงาน (Delivery slips)">
      {slips.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีใบส่งมอบงาน (No delivery slips yet)" />
      ) : (
        <List
          size="small"
          dataSource={slips}
          renderItem={(slip) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Text>{formatThaiDateShort(slip.submittedAt)}</Text>
                {slip.notes ? <Text type="secondary">{slip.notes}</Text> : null}
              </Space>
            </List.Item>
          )}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)} style={{ marginTop: 8 }}>
          ส่งมอบงาน (File delivery slip)
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="notes" label="หมายเหตุ (Notes)">
            <Input.TextArea rows={2} placeholder="รายละเอียดการส่งมอบงาน" />
          </Form.Item>
          <Space>
            <Button onClick={() => { form.resetFields(); setFormOpen(false); }}>
              ยกเลิก (Cancel)
            </Button>
            <Button type="primary" loading={createSlip.isPending} onClick={handleSubmit}>
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </section>
  );
}
