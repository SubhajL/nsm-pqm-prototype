'use client';

import { useState } from 'react';
import {
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  message,
} from 'antd';

import { announce } from '@/components/a11y';
import { EmptyState } from '@/components/common';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  useCreatePaymentVoucher,
  useUpdatePaymentVoucher,
} from '@/hooks/useWorkPeriods';
import { formatBaht, formatThaiDateShort } from '@/lib/date-utils';
import {
  PAYMENT_VOUCHER_STATE_LABELS,
  type PaymentVoucher,
  type PaymentVoucherState,
} from '@/types/payment-voucher';

import { getLegalNextPaymentVoucherStates } from './work-period-actions';

/** Action-verb copy keyed by the voucher state being moved INTO. */
const VOUCHER_ACTION_LABEL: Record<PaymentVoucherState, string> = {
  draft: 'ร่าง (Draft)',
  submitted: 'ยื่นฎีกา (Submit)',
  approved: 'อนุมัติเบิก (Approve)',
  paid: 'จ่ายเงินแล้ว (Mark Paid)',
  rejected: 'ไม่อนุมัติ (Reject)',
};

interface PaymentVoucherSectionProps {
  workPeriodId: string;
  vouchers: PaymentVoucher[];
  canManage: boolean;
}

export function PaymentVoucherSection({
  workPeriodId,
  vouchers,
  canManage,
}: PaymentVoucherSectionProps) {
  const voucher = vouchers[0];
  const createVoucher = useCreatePaymentVoucher(workPeriodId);
  const updateVoucher = useUpdatePaymentVoucher(workPeriodId);

  const [createForm] = Form.useForm<{ requestedAmount: number }>();
  const [approveForm] = Form.useForm<{ voucherNumber: string; approvedAmount: number }>();
  const [approveOpen, setApproveOpen] = useState(false);

  const handleCreate = async () => {
    const values = await createForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      await createVoucher.mutateAsync({ requestedAmount: values.requestedAmount });
      message.success('สร้างฎีกาเบิกจ่ายแล้ว');
      announce('สร้างฎีกาเบิกจ่ายเรียบร้อยแล้ว');
      createForm.resetFields();
    } catch (error) {
      reportError(error);
    }
  };

  const patchState = async (
    state: PaymentVoucherState,
    extra?: { approvedAmount?: number; voucherNumber?: string },
  ): Promise<boolean> => {
    try {
      await updateVoucher.mutateAsync({ state, ...extra });
      message.success(`อัปเดตฎีกาเป็น "${PAYMENT_VOUCHER_STATE_LABELS[state].th}" แล้ว`);
      announce(`อัปเดตสถานะฎีกาเบิกจ่ายเป็น ${PAYMENT_VOUCHER_STATE_LABELS[state].th}`);
      return true;
    } catch (error) {
      reportError(error);
      return false;
    }
  };

  const handleApprove = async () => {
    const values = await approveForm.validateFields().catch(() => null);
    if (!values) return;
    const ok = await patchState('approved', {
      voucherNumber: values.voucherNumber.trim(),
      approvedAmount: values.approvedAmount,
    });
    // Keep the modal open + inputs intact on failure so the user can retry.
    if (!ok) return;
    approveForm.resetFields();
    setApproveOpen(false);
  };

  if (!voucher) {
    return (
      <section aria-label="ฎีกาเบิกจ่าย (Payment voucher)">
        <EmptyState size="small" title="ยังไม่มีฎีกาเบิกจ่าย (No payment voucher yet)" />
        {canManage && (
          <Form form={createForm} layout="inline" style={{ marginTop: 8 }}>
            <Form.Item
              name="requestedAmount"
              label="จำนวนเงินที่ขอเบิก (Requested, บาท)"
              rules={[{ required: true, message: 'กรุณาระบุจำนวนเงิน' }]}
            >
              <InputNumber min={1} style={{ width: 180 }} />
            </Form.Item>
            <Button type="primary" loading={createVoucher.isPending} onClick={handleCreate}>
              สร้างฎีกา (Create voucher)
            </Button>
          </Form>
        )}
      </section>
    );
  }

  const nextStates = getLegalNextPaymentVoucherStates(voucher.state);

  return (
    <section aria-label="ฎีกาเบิกจ่าย (Payment voucher)">
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="สถานะ (Status)">
          <StatusBadge status={voucher.state} type="paymentVoucher" />
        </Descriptions.Item>
        <Descriptions.Item label="ขอเบิก (Requested)">
          {formatBaht(voucher.requestedAmount)}
        </Descriptions.Item>
        {voucher.approvedAmount !== null && (
          <Descriptions.Item label="อนุมัติ (Approved)">
            {formatBaht(voucher.approvedAmount)}
          </Descriptions.Item>
        )}
        {voucher.voucherNumber && (
          <Descriptions.Item label="เลขที่ฎีกา (Voucher No.)">
            {voucher.voucherNumber}
          </Descriptions.Item>
        )}
        {voucher.paidAt && (
          <Descriptions.Item label="วันที่จ่าย (Paid)">
            {formatThaiDateShort(voucher.paidAt)}
          </Descriptions.Item>
        )}
      </Descriptions>

      {canManage && nextStates.length > 0 && (
        <Space style={{ marginTop: 12 }} wrap>
          {nextStates.map((state) => (
            <Button
              key={state}
              danger={state === 'rejected'}
              type={state === 'approved' || state === 'paid' ? 'primary' : 'default'}
              loading={updateVoucher.isPending}
              onClick={() =>
                state === 'approved' ? setApproveOpen(true) : patchState(state)
              }
            >
              {VOUCHER_ACTION_LABEL[state]}
            </Button>
          ))}
        </Space>
      )}

      <Modal
        title="อนุมัติฎีกาเบิกจ่าย (Approve Voucher)"
        open={approveOpen}
        onOk={handleApprove}
        onCancel={() => {
          approveForm.resetFields();
          setApproveOpen(false);
        }}
        confirmLoading={updateVoucher.isPending}
        okText="อนุมัติ (Approve)"
        cancelText="ยกเลิก (Cancel)"
      >
        <Form form={approveForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="voucherNumber"
            label="เลขที่ฎีกา (Voucher No.)"
            rules={[{ required: true, message: 'กรุณาระบุเลขที่ฎีกา' }]}
          >
            <Input placeholder="เช่น ฎ.2569/001" />
          </Form.Item>
          <Form.Item
            name="approvedAmount"
            label="จำนวนเงินที่อนุมัติ (Approved, บาท)"
            rules={[{ required: true, message: 'กรุณาระบุจำนวนเงินที่อนุมัติ' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );

  function reportError(error: unknown) {
    if (error instanceof Error) {
      message.error(error.message);
      announce(`เกิดข้อผิดพลาด: ${error.message}`, 'assertive');
    }
  }
}
