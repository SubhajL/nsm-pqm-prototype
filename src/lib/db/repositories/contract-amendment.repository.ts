import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { contractAmendments } from '@/lib/db/schema';
import type { ContractAmendmentRepository } from '@/lib/repositories/contract-amendment.repository';
import type { ContractAmendment } from '@/types/contract-amendment';

export class DatabaseContractAmendmentRepository
  implements ContractAmendmentRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<ContractAmendment[]> {
    const rows = await this.db.select().from(contractAmendments);
    return rows.map(rowToAmendment);
  }

  async listByContract(contractId: string): Promise<ContractAmendment[]> {
    const rows = await this.db
      .select()
      .from(contractAmendments)
      .where(eq(contractAmendments.contractId, contractId));
    return rows.map(rowToAmendment);
  }

  async findById(id: string): Promise<ContractAmendment | null> {
    const rows = await this.db
      .select()
      .from(contractAmendments)
      .where(eq(contractAmendments.id, id))
      .limit(1);
    return rows[0] ? rowToAmendment(rows[0]) : null;
  }

  async create(entity: ContractAmendment): Promise<ContractAmendment> {
    const [row] = await this.db
      .insert(contractAmendments)
      .values(amendmentToRow(entity))
      .returning();
    return rowToAmendment(row);
  }

  async update(
    id: string,
    patch: Partial<ContractAmendment>,
  ): Promise<ContractAmendment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: ContractAmendment = { ...existing, ...patch };
    const [row] = await this.db
      .update(contractAmendments)
      .set(amendmentToRow(merged))
      .where(eq(contractAmendments.id, id))
      .returning();
    return row ? rowToAmendment(row) : null;
  }

  async delete(id: string): Promise<ContractAmendment | null> {
    const [row] = await this.db
      .delete(contractAmendments)
      .where(eq(contractAmendments.id, id))
      .returning();
    return row ? rowToAmendment(row) : null;
  }
}

type Row = typeof contractAmendments.$inferSelect;

function rowToAmendment(row: Row): ContractAmendment {
  return {
    id: row.id,
    contractId: row.contractId,
    amendmentNumber: row.amendmentNumber,
    amendedAt: row.amendedAt,
    amountDelta: row.amountDelta,
    scheduleDeltaDays: row.scheduleDeltaDays,
    reason: row.reason,
    approvedBy: row.approvedBy,
    documentFileId: row.documentFileId ?? null,
  };
}

function amendmentToRow(
  a: ContractAmendment,
): typeof contractAmendments.$inferInsert {
  return {
    id: a.id,
    contractId: a.contractId,
    amendmentNumber: a.amendmentNumber,
    amendedAt: a.amendedAt,
    amountDelta: a.amountDelta,
    scheduleDeltaDays: a.scheduleDeltaDays,
    reason: a.reason,
    approvedBy: a.approvedBy,
    documentFileId: a.documentFileId,
  };
}
