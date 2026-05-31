import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { vendorSows } from '@/lib/db/schema';
import type { VendorSowRepository } from '@/lib/repositories/vendor-sow.repository';
import type { SowState, VendorSow } from '@/types/vendor-sow';

export class DatabaseVendorSowRepository implements VendorSowRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<VendorSow[]> {
    const rows = await this.db.select().from(vendorSows);
    return rows.map(rowToSow);
  }

  async listByProject(projectId: string): Promise<VendorSow[]> {
    const rows = await this.db
      .select()
      .from(vendorSows)
      .where(eq(vendorSows.projectId, projectId));
    return rows.map(rowToSow);
  }

  async findById(id: string): Promise<VendorSow | null> {
    const rows = await this.db
      .select()
      .from(vendorSows)
      .where(eq(vendorSows.id, id))
      .limit(1);
    return rows[0] ? rowToSow(rows[0]) : null;
  }

  async create(entity: VendorSow): Promise<VendorSow> {
    const [row] = await this.db
      .insert(vendorSows)
      .values(sowToRow(entity))
      .returning();
    return rowToSow(row);
  }

  async update(id: string, patch: Partial<VendorSow>): Promise<VendorSow | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: VendorSow = { ...existing, ...patch };
    const [row] = await this.db
      .update(vendorSows)
      .set(sowToRow(merged))
      .where(eq(vendorSows.id, id))
      .returning();
    return row ? rowToSow(row) : null;
  }

  async delete(id: string): Promise<VendorSow | null> {
    const [row] = await this.db
      .delete(vendorSows)
      .where(eq(vendorSows.id, id))
      .returning();
    return row ? rowToSow(row) : null;
  }
}

type Row = typeof vendorSows.$inferSelect;

function rowToSow(row: Row): VendorSow {
  return {
    id: row.id,
    projectId: row.projectId,
    contractId: row.contractId ?? null,
    phase: row.phase,
    scopeSummary: row.scopeSummary,
    uatCriteria: row.uatCriteria,
    warrantyMonths: row.warrantyMonths ?? null,
    state: row.state as SowState,
    signedAt: row.signedAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
    notes: row.notes,
  };
}

function sowToRow(s: VendorSow): typeof vendorSows.$inferInsert {
  return {
    id: s.id,
    projectId: s.projectId,
    contractId: s.contractId,
    phase: s.phase,
    scopeSummary: s.scopeSummary,
    uatCriteria: s.uatCriteria,
    warrantyMonths: s.warrantyMonths,
    state: s.state,
    signedAt: s.signedAt,
    acceptedAt: s.acceptedAt,
    notes: s.notes,
  };
}
