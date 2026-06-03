'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import type { CommitteeInspection } from '@/types/committee-inspection';
import type { CreateCommitteeInspectionRequest } from '@/types/committee-inspection.schema';
import type { DeliverySlip } from '@/types/delivery-slip';
import type { CreateDeliverySlipRequest } from '@/types/delivery-slip.schema';
import type { PaymentVoucher, PaymentVoucherState } from '@/types/payment-voucher';
import type { WorkPeriod, WorkPeriodState } from '@/types/work-period';
import type { CreateWorkPeriodRequest } from '@/types/work-period.schema';

/* ── Work periods ──────────────────────────────────────────────────── */

export function useWorkPeriods(projectId: string | undefined) {
  return useQuery<WorkPeriod[]>({
    queryKey: ['workPeriods', projectId],
    queryFn: () => apiGet<WorkPeriod[]>(`/work-periods/by-project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateWorkPeriod(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<WorkPeriod, Error, CreateWorkPeriodRequest>({
    mutationFn: (payload) =>
      apiPost<WorkPeriod>(`/work-periods/by-project/${projectId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workPeriods', projectId] });
    },
  });
}

export function useTransitionWorkPeriod(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    WorkPeriod,
    Error,
    { workPeriodId: string; targetState: WorkPeriodState }
  >({
    mutationFn: ({ workPeriodId, targetState }) =>
      apiPost<WorkPeriod>(`/work-periods/${workPeriodId}/transition`, { targetState }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workPeriods', projectId] });
    },
  });
}

/* ── Delivery slips (ใบส่งมอบงาน) ───────────────────────────────────── */

export function useDeliverySlips(workPeriodId: string | undefined) {
  return useQuery<DeliverySlip[]>({
    queryKey: ['deliverySlips', workPeriodId],
    queryFn: () => apiGet<DeliverySlip[]>(`/delivery-slips/${workPeriodId}`),
    enabled: !!workPeriodId,
  });
}

export function useCreateDeliverySlip(workPeriodId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<DeliverySlip, Error, CreateDeliverySlipRequest>({
    mutationFn: (payload) =>
      apiPost<DeliverySlip>(`/delivery-slips/${workPeriodId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deliverySlips', workPeriodId] });
    },
  });
}

/* ── Committee inspections (การตรวจรับโดยคณะกรรมการ) ─────────────────── */

export function useCommitteeInspections(workPeriodId: string | undefined) {
  return useQuery<CommitteeInspection[]>({
    queryKey: ['committeeInspections', workPeriodId],
    queryFn: () =>
      apiGet<CommitteeInspection[]>(`/committee-inspections/${workPeriodId}`),
    enabled: !!workPeriodId,
  });
}

export function useCreateCommitteeInspection(workPeriodId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<CommitteeInspection, Error, CreateCommitteeInspectionRequest>({
    mutationFn: (payload) =>
      apiPost<CommitteeInspection>(`/committee-inspections/${workPeriodId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['committeeInspections', workPeriodId],
      });
    },
  });
}

/* ── Payment vouchers (ฎีกาเบิกจ่าย) ────────────────────────────────── */

export function usePaymentVouchers(workPeriodId: string | undefined) {
  return useQuery<PaymentVoucher[]>({
    queryKey: ['paymentVouchers', workPeriodId],
    queryFn: () => apiGet<PaymentVoucher[]>(`/payment-vouchers/${workPeriodId}`),
    enabled: !!workPeriodId,
  });
}

export function useCreatePaymentVoucher(workPeriodId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    PaymentVoucher,
    Error,
    { requestedAmount: number; notes?: string }
  >({
    mutationFn: (payload) =>
      apiPost<PaymentVoucher>(`/payment-vouchers/${workPeriodId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['paymentVouchers', workPeriodId] });
    },
  });
}

export function useUpdatePaymentVoucher(workPeriodId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    PaymentVoucher,
    Error,
    {
      state: PaymentVoucherState;
      approvedAmount?: number | null;
      voucherNumber?: string | null;
      paidAt?: string | null;
      notes?: string;
    }
  >({
    mutationFn: (payload) =>
      apiPatch<PaymentVoucher>(`/payment-vouchers/${workPeriodId}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['paymentVouchers', workPeriodId] });
    },
  });
}
