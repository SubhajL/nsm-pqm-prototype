'use client';

import { useState } from 'react';
import { Button, Form, InputNumber, List, Select, Space, Typography, message } from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import {
  useCreateEngineeringEstimate,
  useEngineeringEstimates,
} from '@/hooks/useProcurement';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  ENGINEERING_ESTIMATE_BASES,
  type EngineeringEstimateBasis,
} from '@/types/engineering-estimate';

const { Text } = Typography;

const BASIS_LABELS: Record<EngineeringEstimateBasis, { th: string; en: string }> = {
  unit_price: { th: 'ราคาต่อหน่วย', en: 'Unit Price' },
  cost_plus: { th: 'ต้นทุนบวกกำไร', en: 'Cost Plus' },
  lump_sum: { th: 'เหมารวม', en: 'Lump Sum' },
};

interface EngineeringEstimatesSectionProps {
  packageId: string;
  canManage: boolean;
}

interface EstimateFormValues {
  basis: EngineeringEstimateBasis;
  estimatedTotal: number;
  contingencyPercent: number;
}

/** ราคากลาง rail — cost basis records backing the budget ceiling. */
export function EngineeringEstimatesSection({
  packageId,
  canManage,
}: EngineeringEstimatesSectionProps) {
  const [form] = Form.useForm<EstimateFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const { data: estimates } = useEngineeringEstimates(packageId);
  const createEstimate = useCreateEngineeringEstimate(packageId);
  const currentUser = useAuthStore((s) => s.currentUser);

  const list = estimates ?? [];

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createEstimate.mutateAsync({
        basis: values.basis,
        estimatedTotal: values.estimatedTotal,
        // UI captures whole percent; API stores a fraction (0.10 = 10%).
        contingencyPercent: values.contingencyPercent / 100,
        estimatedBy: currentUser?.id ?? 'unknown',
        estimatedAt: new Date().toISOString().slice(0, 10),
      });
      message.success('บันทึกราคากลางแล้ว');
      announce('บันทึกราคากลางเรียบร้อยแล้ว');
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
    <section aria-label="ราคากลาง (Engineering estimates)">
      {list.length === 0 ? (
        <EmptyState size="small" title="ยังไม่มีราคากลาง (No estimates yet)" />
      ) : (
        <List
          size="small"
          dataSource={list}
          renderItem={(estimate) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Text strong>
                  {`${formatBaht(estimate.estimatedTotal)} · ${BASIS_LABELS[estimate.basis].th} (${BASIS_LABELS[estimate.basis].en})`}
                </Text>
                <Text type="secondary">
                  {`เผื่อเหลือเผื่อขาด ${Math.round(estimate.contingencyPercent * 100)}% · ${formatThaiDateShort(estimate.estimatedAt)}`}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)} style={{ marginTop: 8 }}>
          บันทึกราคากลาง (Record Estimate)
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="basis"
            label="วิธีคำนวณ (Basis)"
            rules={[{ required: true, message: 'กรุณาเลือกวิธีคำนวณ' }]}
          >
            <Select
              placeholder="เลือกวิธีคำนวณ"
              options={ENGINEERING_ESTIMATE_BASES.map((basis) => ({
                value: basis,
                label: `${BASIS_LABELS[basis].th} (${BASIS_LABELS[basis].en})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="estimatedTotal"
            label="ราคากลางรวม (Estimated Total, บาท)"
            rules={[{ required: true, message: 'กรุณาระบุราคากลาง' }]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number((value ?? '').replace(/,/g, ''))}
            />
          </Form.Item>
          <Form.Item
            name="contingencyPercent"
            label="เผื่อเหลือเผื่อขาด (Contingency, %)"
            rules={[{ required: true, message: 'กรุณาระบุสัดส่วน' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Button
              onClick={() => {
                form.resetFields();
                setFormOpen(false);
              }}
            >
              ยกเลิก (Cancel)
            </Button>
            <Button
              type="primary"
              loading={createEstimate.isPending}
              onClick={handleSubmit}
            >
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </section>
  );
}
