import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { engineeringEstimates } from '@/lib/db/schema';
import type { EngineeringEstimateRepository } from '@/lib/repositories/engineering-estimate.repository';
import type {
  EngineeringEstimate,
  EngineeringEstimateBasis,
} from '@/types/engineering-estimate';

export class DatabaseEngineeringEstimateRepository
  implements EngineeringEstimateRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<EngineeringEstimate[]> {
    const rows = await this.db.select().from(engineeringEstimates);
    return rows.map(rowToEstimate);
  }

  async listByProcurementPackage(
    procurementPackageId: string,
  ): Promise<EngineeringEstimate[]> {
    const rows = await this.db
      .select()
      .from(engineeringEstimates)
      .where(
        eq(engineeringEstimates.procurementPackageId, procurementPackageId),
      );
    return rows.map(rowToEstimate);
  }

  async findById(id: string): Promise<EngineeringEstimate | null> {
    const rows = await this.db
      .select()
      .from(engineeringEstimates)
      .where(eq(engineeringEstimates.id, id))
      .limit(1);
    return rows[0] ? rowToEstimate(rows[0]) : null;
  }

  async create(entity: EngineeringEstimate): Promise<EngineeringEstimate> {
    const [row] = await this.db
      .insert(engineeringEstimates)
      .values(estimateToRow(entity))
      .returning();
    return rowToEstimate(row);
  }

  async update(
    id: string,
    patch: Partial<EngineeringEstimate>,
  ): Promise<EngineeringEstimate | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: EngineeringEstimate = { ...existing, ...patch };
    const [row] = await this.db
      .update(engineeringEstimates)
      .set(estimateToRow(merged))
      .where(eq(engineeringEstimates.id, id))
      .returning();
    return row ? rowToEstimate(row) : null;
  }

  async delete(id: string): Promise<EngineeringEstimate | null> {
    const [row] = await this.db
      .delete(engineeringEstimates)
      .where(eq(engineeringEstimates.id, id))
      .returning();
    return row ? rowToEstimate(row) : null;
  }
}

type Row = typeof engineeringEstimates.$inferSelect;

function rowToEstimate(row: Row): EngineeringEstimate {
  return {
    id: row.id,
    procurementPackageId: row.procurementPackageId,
    boqId: row.boqId ?? null,
    basis: row.basis as EngineeringEstimateBasis,
    estimatedTotal: row.estimatedTotal,
    contingencyPercent: row.contingencyPercent,
    estimatedBy: row.estimatedBy,
    estimatedAt: row.estimatedAt,
    notes: row.notes,
  };
}

function estimateToRow(
  e: EngineeringEstimate,
): typeof engineeringEstimates.$inferInsert {
  return {
    id: e.id,
    procurementPackageId: e.procurementPackageId,
    boqId: e.boqId,
    basis: e.basis,
    estimatedTotal: e.estimatedTotal,
    contingencyPercent: e.contingencyPercent,
    estimatedBy: e.estimatedBy,
    estimatedAt: e.estimatedAt,
    notes: e.notes,
  };
}
