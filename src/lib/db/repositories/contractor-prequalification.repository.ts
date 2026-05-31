import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { contractorPrequalifications } from '@/lib/db/schema';
import type { ContractorPrequalificationRepository } from '@/lib/repositories/contractor-prequalification.repository';
import type { ContractorPrequalification } from '@/types/contractor-prequalification';

export class DatabaseContractorPrequalificationRepository
  implements ContractorPrequalificationRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<ContractorPrequalification[]> {
    const rows = await this.db.select().from(contractorPrequalifications);
    return rows.map(rowToRecord);
  }

  async listByProject(projectId: string): Promise<ContractorPrequalification[]> {
    const rows = await this.db
      .select()
      .from(contractorPrequalifications)
      .where(eq(contractorPrequalifications.projectId, projectId));
    return rows.map(rowToRecord);
  }

  async findById(id: string): Promise<ContractorPrequalification | null> {
    const rows = await this.db
      .select()
      .from(contractorPrequalifications)
      .where(eq(contractorPrequalifications.id, id))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async create(
    entity: ContractorPrequalification,
  ): Promise<ContractorPrequalification> {
    const [row] = await this.db
      .insert(contractorPrequalifications)
      .values(recordToRow(entity))
      .returning();
    return rowToRecord(row);
  }

  async update(
    id: string,
    patch: Partial<ContractorPrequalification>,
  ): Promise<ContractorPrequalification | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: ContractorPrequalification = { ...existing, ...patch };
    const [row] = await this.db
      .update(contractorPrequalifications)
      .set(recordToRow(merged))
      .where(eq(contractorPrequalifications.id, id))
      .returning();
    return row ? rowToRecord(row) : null;
  }

  async delete(id: string): Promise<ContractorPrequalification | null> {
    const [row] = await this.db
      .delete(contractorPrequalifications)
      .where(eq(contractorPrequalifications.id, id))
      .returning();
    return row ? rowToRecord(row) : null;
  }
}

type Row = typeof contractorPrequalifications.$inferSelect;

function rowToRecord(row: Row): ContractorPrequalification {
  return {
    id: row.id,
    projectId: row.projectId,
    contractorName: row.contractorName,
    contractorTaxId: row.contractorTaxId ?? null,
    prequalifiedAt: row.prequalifiedAt,
    validUntil: row.validUntil ?? null,
    ahpScore: row.ahpScore ?? null,
    evidenceDocIds: Array.isArray(row.evidenceDocIds)
      ? (row.evidenceDocIds as string[])
      : [],
    notes: row.notes,
  };
}

function recordToRow(
  r: ContractorPrequalification,
): typeof contractorPrequalifications.$inferInsert {
  return {
    id: r.id,
    projectId: r.projectId,
    contractorName: r.contractorName,
    contractorTaxId: r.contractorTaxId,
    prequalifiedAt: r.prequalifiedAt,
    validUntil: r.validUntil,
    ahpScore: r.ahpScore,
    evidenceDocIds: r.evidenceDocIds,
    notes: r.notes,
  };
}
