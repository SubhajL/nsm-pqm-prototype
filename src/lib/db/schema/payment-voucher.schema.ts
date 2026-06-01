/**
 * PR-23 — `payment_vouchers` (ใบเบิกจ่ายเงิน) table.
 *
 * Mirrors `PaymentVoucher` in `src/types/payment-voucher.ts`. State is a
 * Postgres enum so finance reporting can JOIN against it cleanly.
 */

import { numeric, pgTable, text } from 'drizzle-orm/pg-core';

import { paymentVoucherStateEnum } from './enums';

export const paymentVouchers = pgTable('payment_vouchers', {
  id: text('id').primaryKey(),
  workPeriodId: text('work_period_id').notNull(),
  state: paymentVoucherStateEnum('state').notNull(),
  requestedAmount: numeric('requested_amount', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  approvedAmount: numeric('approved_amount', { precision: 14, scale: 2, mode: 'number' }),
  voucherNumber: text('voucher_number'),
  paidAt: text('paid_at'),
  notes: text('notes').notNull(),
});

export type PaymentVoucherRow = typeof paymentVouchers.$inferSelect;
export type PaymentVoucherInsert = typeof paymentVouchers.$inferInsert;
