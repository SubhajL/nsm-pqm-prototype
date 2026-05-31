/**
 * PR-23 — Zod schemas for the PaymentVoucher API surface.
 *
 * - `createPaymentVoucherRequestSchema` — POST body.
 * - `patchPaymentVoucherRequestSchema` — PATCH body for state updates.
 *
 * The route layer is the only legitimate place to mint a `voucherNumber`
 * (finance-team policy) — it is accepted on PATCH but only honoured at the
 * `approved` transition.
 */

import { z } from 'zod';

import { PAYMENT_VOUCHER_STATES } from './payment-voucher';

const stateSchema = z.enum(PAYMENT_VOUCHER_STATES);

export const createPaymentVoucherRequestSchema = z
  .object({
    requestedAmount: z
      .number()
      .positive('requestedAmount must be > 0'),
    notes: z.string().optional(),
  })
  .strict();

export type CreatePaymentVoucherRequest = z.infer<
  typeof createPaymentVoucherRequestSchema
>;

export const patchPaymentVoucherRequestSchema = z
  .object({
    state: stateSchema,
    approvedAmount: z.number().nonnegative().nullable().optional(),
    voucherNumber: z.string().min(1).nullable().optional(),
    paidAt: z.string().min(1).nullable().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type PatchPaymentVoucherRequest = z.infer<
  typeof patchPaymentVoucherRequestSchema
>;
