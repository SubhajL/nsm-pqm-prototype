import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { deliverySlips } from '@/lib/db/schema';
import type { DeliverySlipRepository } from '@/lib/repositories/delivery-slip.repository';
import type { DeliverySlip } from '@/types/delivery-slip';

export class DatabaseDeliverySlipRepository implements DeliverySlipRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<DeliverySlip[]> {
    const rows = await this.db.select().from(deliverySlips);
    return rows.map(rowToSlip);
  }

  async listByWorkPeriod(workPeriodId: string): Promise<DeliverySlip[]> {
    const rows = await this.db
      .select()
      .from(deliverySlips)
      .where(eq(deliverySlips.workPeriodId, workPeriodId));
    return rows.map(rowToSlip);
  }

  async findById(id: string): Promise<DeliverySlip | null> {
    const rows = await this.db
      .select()
      .from(deliverySlips)
      .where(eq(deliverySlips.id, id))
      .limit(1);
    return rows[0] ? rowToSlip(rows[0]) : null;
  }

  async create(entity: DeliverySlip): Promise<DeliverySlip> {
    const [row] = await this.db
      .insert(deliverySlips)
      .values(slipToRow(entity))
      .returning();
    return rowToSlip(row);
  }

  async update(
    id: string,
    patch: Partial<DeliverySlip>,
  ): Promise<DeliverySlip | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: DeliverySlip = { ...existing, ...patch };
    const [row] = await this.db
      .update(deliverySlips)
      .set(slipToRow(merged))
      .where(eq(deliverySlips.id, id))
      .returning();
    return row ? rowToSlip(row) : null;
  }

  async delete(id: string): Promise<DeliverySlip | null> {
    const [row] = await this.db
      .delete(deliverySlips)
      .where(eq(deliverySlips.id, id))
      .returning();
    return row ? rowToSlip(row) : null;
  }
}

type Row = typeof deliverySlips.$inferSelect;

function rowToSlip(row: Row): DeliverySlip {
  return {
    id: row.id,
    workPeriodId: row.workPeriodId,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    attachedDocIds: Array.isArray(row.attachedDocIds) ? row.attachedDocIds : [],
    notes: row.notes,
  };
}

function slipToRow(slip: DeliverySlip): typeof deliverySlips.$inferInsert {
  return {
    id: slip.id,
    workPeriodId: slip.workPeriodId,
    submittedAt: slip.submittedAt,
    submittedBy: slip.submittedBy,
    attachedDocIds: slip.attachedDocIds,
    notes: slip.notes,
  };
}
