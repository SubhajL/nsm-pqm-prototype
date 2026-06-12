import { and, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { paymentVouchers } from '@/lib/db/schema';
import type { PaymentVoucherRepository } from '@/lib/repositories/payment-voucher.repository';
import type {
  PaymentVoucher,
  PaymentVoucherState,
} from '@/types/payment-voucher';

export class DatabasePaymentVoucherRepository
  implements PaymentVoucherRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<PaymentVoucher[]> {
    const rows = await this.db.select().from(paymentVouchers);
    return rows.map(rowToVoucher);
  }

  async listByWorkPeriod(workPeriodId: string): Promise<PaymentVoucher[]> {
    const rows = await this.db
      .select()
      .from(paymentVouchers)
      .where(eq(paymentVouchers.workPeriodId, workPeriodId));
    return rows.map(rowToVoucher);
  }

  async findByWorkPeriod(
    workPeriodId: string,
  ): Promise<PaymentVoucher | null> {
    const all = await this.listByWorkPeriod(workPeriodId);
    if (all.length === 0) return null;
    // Pick the most recently paid voucher, falling back to insertion order.
    // The interface contract is "most recently created"; without a
    // created_at column we proxy that with paid_at and then ordering of
    // the underlying scan (Postgres physical row order).
    const sorted = [...all].sort((a, b) => {
      if (a.paidAt && b.paidAt) return a.paidAt < b.paidAt ? 1 : -1;
      if (a.paidAt) return -1;
      if (b.paidAt) return 1;
      return 0;
    });
    return sorted[0];
  }

  async findById(id: string): Promise<PaymentVoucher | null> {
    const rows = await this.db
      .select()
      .from(paymentVouchers)
      .where(eq(paymentVouchers.id, id))
      .limit(1);
    return rows[0] ? rowToVoucher(rows[0]) : null;
  }

  async create(entity: PaymentVoucher): Promise<PaymentVoucher> {
    const [row] = await this.db
      .insert(paymentVouchers)
      .values(voucherToRow(entity))
      .returning();
    return rowToVoucher(row);
  }

  async update(
    id: string,
    patch: Partial<PaymentVoucher>,
  ): Promise<PaymentVoucher | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: PaymentVoucher = { ...existing, ...patch };
    const [row] = await this.db
      .update(paymentVouchers)
      .set(voucherToRow(merged))
      .where(eq(paymentVouchers.id, id))
      .returning();
    return row ? rowToVoucher(row) : null;
  }


  /**
   * PR-34 — compare-and-swap update: applies `patch` only while the
   * row's state still equals `expected`. The UPDATE itself carries
   * `WHERE id = ? AND state = ?`, so a transition raced by another
   * writer matches zero rows and returns null instead of clobbering.
   * Callers map null to 409 STATE_CONFLICT.
   */
  async updateIfState(
    id: string,
    expected: PaymentVoucher['state'],
    patch: Partial<PaymentVoucher>,
  ): Promise<PaymentVoucher | null> {
    const existing = await this.findById(id);
    if (!existing || existing.state !== expected) return null;
    const merged: PaymentVoucher = { ...existing, ...patch };
    const [row] = await this.db
      .update(paymentVouchers)
      .set(voucherToRow(merged))
      .where(and(eq(paymentVouchers.id, id), eq(paymentVouchers.state, expected)))
      .returning();
    return row ? rowToVoucher(row) : null;
  }

  async delete(id: string): Promise<PaymentVoucher | null> {
    const [row] = await this.db
      .delete(paymentVouchers)
      .where(eq(paymentVouchers.id, id))
      .returning();
    return row ? rowToVoucher(row) : null;
  }
}

type Row = typeof paymentVouchers.$inferSelect;

function rowToVoucher(row: Row): PaymentVoucher {
  return {
    id: row.id,
    workPeriodId: row.workPeriodId,
    state: row.state as PaymentVoucherState,
    requestedAmount: row.requestedAmount,
    approvedAmount: row.approvedAmount ?? null,
    voucherNumber: row.voucherNumber ?? null,
    paidAt: row.paidAt ?? null,
    notes: row.notes,
  };
}

function voucherToRow(
  v: PaymentVoucher,
): typeof paymentVouchers.$inferInsert {
  return {
    id: v.id,
    workPeriodId: v.workPeriodId,
    state: v.state,
    requestedAmount: v.requestedAmount,
    approvedAmount: v.approvedAmount,
    voucherNumber: v.voucherNumber,
    paidAt: v.paidAt,
    notes: v.notes,
  };
}
