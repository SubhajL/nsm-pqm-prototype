'use client';

import { useState } from 'react';
import { Button, Form, Input, List, Select, Space, Tag, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { useCreateCommitteeInspection } from '@/hooks/useWorkPeriods';
import {
  COMMITTEE_INSPECTION_RESULTS,
  type CommitteeInspection,
  type CommitteeInspectionResult,
} from '@/types/committee-inspection';
import { formatThaiDateShort } from '@/lib/date-utils';

const { Text } = Typography;

const RESULT_LABEL: Record<CommitteeInspectionResult, { label: string; color: string }> = {
  pass: { label: 'ผ่าน (Pass)', color: 'success' },
  fail: { label: 'ไม่ผ่าน (Fail)', color: 'error' },
  pass_with_conditions: { label: 'ผ่านแบบมีเงื่อนไข (Conditional)', color: 'warning' },
};

interface CommitteeInspectionSectionProps {
  workPeriodId: string;
  inspections: CommitteeInspection[];
  canManage: boolean;
}

interface InspectionFormValues {
  inspectors: string;
  result: CommitteeInspectionResult;
  conditions?: string;
}

/** การตรวจรับโดยคณะกรรมการ — evidence required before inspection_passed/failed. */
export function CommitteeInspectionSection({
  workPeriodId,
  inspections,
  canManage,
}: CommitteeInspectionSectionProps) {
  const [form] = Form.useForm<InspectionFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const createInspection = useCreateCommitteeInspection(workPeriodId);

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createInspection.mutateAsync({
        inspectors: values.inspectors
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        result: values.result,
        conditions: values.conditions?.trim() ?? '',
        documentIds: [],
      });
      message.success('บันทึกผลตรวจรับแล้ว');
      announce('บันทึกผลตรวจรับโดยคณะกรรมการเรียบร้อยแล้ว');
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
    <section aria-label="การตรวจรับโดยคณะกรรมการ (Committee inspection)">
      {inspections.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีผลการตรวจรับ (No inspection records yet)" />
      ) : (
        <List
          size="small"
          dataSource={inspections}
          renderItem={(record) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Space>
                  <Tag color={RESULT_LABEL[record.result].color}>
                    {RESULT_LABEL[record.result].label}
                  </Tag>
                  <Text type="secondary">{formatThaiDateShort(record.inspectedAt)}</Text>
                </Space>
                {record.conditions ? <Text type="secondary">{record.conditions}</Text> : null}
              </Space>
            </List.Item>
          )}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)} style={{ marginTop: 8 }}>
          บันทึกผลตรวจรับ (Record inspection)
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="inspectors"
            label="คณะกรรมการตรวจรับ (Inspectors)"
            rules={[{ required: true, message: 'กรุณาระบุกรรมการอย่างน้อยหนึ่งคน' }]}
          >
            <Input placeholder="ชื่อกรรมการ คั่นด้วยจุลภาค (,)" />
          </Form.Item>
          <Form.Item
            name="result"
            label="ผลการตรวจรับ (Result)"
            rules={[{ required: true, message: 'กรุณาเลือกผลการตรวจรับ' }]}
          >
            <Select
              options={COMMITTEE_INSPECTION_RESULTS.map((value) => ({
                value,
                label: RESULT_LABEL[value].label,
              }))}
            />
          </Form.Item>
          <Form.Item name="conditions" label="เงื่อนไข/หมายเหตุ (Conditions)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Button onClick={() => { form.resetFields(); setFormOpen(false); }}>
              ยกเลิก (Cancel)
            </Button>
            <Button type="primary" loading={createInspection.isPending} onClick={handleSubmit}>
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </section>
  );
}
