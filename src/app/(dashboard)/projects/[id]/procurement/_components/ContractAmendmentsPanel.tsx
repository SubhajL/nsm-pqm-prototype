'use client';

import { useState } from 'react';
import {
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  List,
  Space,
  Typography,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import {
  useContractAmendments,
  useCreateContractAmendment,
} from '@/hooks/useProcurement';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import { useAuthStore } from '@/stores/useAuthStore';
import type { AwardedContract } from '@/types/awarded-contract';

import { foldContractAmendments } from './procurement-actions';

const { Text } = Typography;

interface ContractAmendmentsPanelProps {
  contract: AwardedContract;
  canManage: boolean;
}

interface AmendmentFormValues {
  amendedAt: Dayjs;
  amountDelta: number;
  scheduleDeltaDays: number;
  reason: string;
}

/**
 * Amendment history + effective contract values for one expanded row.
 * Effective amount/expiration derive from `foldContractAmendments` (same
 * math the server's pure helper defines) — never stored, always derived.
 */
export function ContractAmendmentsPanel({
  contract,
  canManage,
}: ContractAmendmentsPanelProps) {
  const [form] = Form.useForm<AmendmentFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const { data: amendments } = useContractAmendments(contract.id);
  const createAmendment = useCreateContractAmendment(contract.id);
  const currentUser = useAuthStore((s) => s.currentUser);

  const list = [...(amendments ?? [])].sort(
    (a, b) => a.amendmentNumber - b.amendmentNumber,
  );
  const effective = foldContractAmendments(contract, list);
  const nextNumber = list.length === 0 ? 1 : list[list.length - 1].amendmentNumber + 1;

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createAmendment.mutateAsync({
        amendmentNumber: nextNumber,
        amendedAt: values.amendedAt.format('YYYY-MM-DD'),
        amountDelta: values.amountDelta,
        scheduleDeltaDays: values.scheduleDeltaDays,
        reason: values.reason.trim(),
        approvedBy: currentUser?.id ?? 'unknown',
      });
      message.success(`บันทึกสัญญาแก้ไขเพิ่มเติม ครั้งที่ ${nextNumber} แล้ว`);
      announce(`บันทึกสัญญาแก้ไขเพิ่มเติม ครั้งที่ ${nextNumber} เรียบร้อยแล้ว`);
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
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Descriptions
        size="small"
        column={2}
        items={[
          {
            key: 'effectiveAmount',
            label: 'มูลค่าหลังแก้ไข (Effective Amount)',
            children: (
              <Text strong>{formatBaht(effective.effectiveAmount)}</Text>
            ),
          },
          {
            key: 'effectiveExpiration',
            label: 'สิ้นสุดหลังแก้ไข (Effective Expiry)',
            children: effective.effectiveExpirationDate
              ? formatThaiDateShort(effective.effectiveExpirationDate)
              : '—',
          },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState
          size="small"
          title="ยังไม่มีสัญญาแก้ไขเพิ่มเติม (No amendments yet)"
        />
      ) : (
        <List
          size="small"
          dataSource={list}
          renderItem={(amendment) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Text strong>
                  {`ครั้งที่ ${amendment.amendmentNumber} · ${formatThaiDateShort(amendment.amendedAt)}`}
                </Text>
                <Text type="secondary">
                  {`มูลค่า ${amendment.amountDelta >= 0 ? '+' : ''}${formatBaht(amendment.amountDelta)} · ระยะเวลา ${amendment.scheduleDeltaDays >= 0 ? '+' : ''}${amendment.scheduleDeltaDays} วัน · ${amendment.reason}`}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      )}

      {canManage && !formOpen && (
        <Button onClick={() => setFormOpen(true)}>
          {`บันทึกแก้ไขครั้งที่ ${nextNumber} (Record Amendment #${nextNumber})`}
        </Button>
      )}

      {canManage && formOpen && (
        <Form form={form} layout="vertical">
          <Form.Item
            name="amendedAt"
            label="วันที่ลงนามแก้ไข (Amended At)"
            rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="amountDelta"
            label="มูลค่าเปลี่ยนแปลง (Amount Delta, บาท — ติดลบได้)"
            rules={[{ required: true, message: 'กรุณาระบุมูลค่าเปลี่ยนแปลง' }]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number((value ?? '').replace(/,/g, ''))}
            />
          </Form.Item>
          <Form.Item
            name="scheduleDeltaDays"
            label="ระยะเวลาเปลี่ยนแปลง (Schedule Delta, วัน — ติดลบได้)"
            rules={[{ required: true, message: 'กรุณาระบุจำนวนวัน' }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="เหตุผล (Reason)"
            rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}
          >
            <Input.TextArea rows={2} placeholder="เหตุผลการแก้ไขสัญญา" />
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
              loading={createAmendment.isPending}
              onClick={handleSubmit}
            >
              บันทึก (Save)
            </Button>
          </Space>
        </Form>
      )}
    </Space>
  );
}
