import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { awardedContracts } from '@/lib/db/schema';
import type { AwardedContractRepository } from '@/lib/repositories/awarded-contract.repository';
import type {
  AwardedContract,
  ContractState,
} from '@/types/awarded-contract';
import type { ContractingModel } from '@/types/rid/vocabulary';

export class DatabaseAwardedContractRepository
  implements AwardedContractRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<AwardedContract[]> {
    const rows = await this.db.select().from(awardedContracts);
    return rows.map(rowToContract);
  }

  async listByProject(projectId: string): Promise<AwardedContract[]> {
    const rows = await this.db
      .select()
      .from(awardedContracts)
      .where(eq(awardedContracts.projectId, projectId));
    return rows.map(rowToContract);
  }

  async listByProcurementPackage(
    procurementPackageId: string,
  ): Promise<AwardedContract[]> {
    const rows = await this.db
      .select()
      .from(awardedContracts)
      .where(eq(awardedContracts.procurementPackageId, procurementPackageId));
    return rows.map(rowToContract);
  }

  async findById(id: string): Promise<AwardedContract | null> {
    const rows = await this.db
      .select()
      .from(awardedContracts)
      .where(eq(awardedContracts.id, id))
      .limit(1);
    return rows[0] ? rowToContract(rows[0]) : null;
  }

  async create(entity: AwardedContract): Promise<AwardedContract> {
    const [row] = await this.db
      .insert(awardedContracts)
      .values(contractToRow(entity))
      .returning();
    return rowToContract(row);
  }

  async update(
    id: string,
    patch: Partial<AwardedContract>,
  ): Promise<AwardedContract | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: AwardedContract = { ...existing, ...patch };
    const [row] = await this.db
      .update(awardedContracts)
      .set(contractToRow(merged))
      .where(eq(awardedContracts.id, id))
      .returning();
    return row ? rowToContract(row) : null;
  }

  async delete(id: string): Promise<AwardedContract | null> {
    const [row] = await this.db
      .delete(awardedContracts)
      .where(eq(awardedContracts.id, id))
      .returning();
    return row ? rowToContract(row) : null;
  }
}

type Row = typeof awardedContracts.$inferSelect;

function rowToContract(row: Row): AwardedContract {
  return {
    id: row.id,
    procurementPackageId: row.procurementPackageId,
    projectId: row.projectId,
    contractNumber: row.contractNumber,
    contractorName: row.contractorName,
    contractorTaxId: row.contractorTaxId ?? null,
    awardAmount: row.awardAmount,
    contractingModel: row.contractingModel as ContractingModel,
    state: row.state as ContractState,
    signedAt: row.signedAt ?? null,
    effectiveDate: row.effectiveDate ?? null,
    expirationDate: row.expirationDate ?? null,
    warrantyMonths: row.warrantyMonths ?? null,
    notes: row.notes,
  };
}

function contractToRow(
  c: AwardedContract,
): typeof awardedContracts.$inferInsert {
  return {
    id: c.id,
    procurementPackageId: c.procurementPackageId,
    projectId: c.projectId,
    contractNumber: c.contractNumber,
    contractorName: c.contractorName,
    contractorTaxId: c.contractorTaxId,
    awardAmount: c.awardAmount,
    contractingModel: c.contractingModel,
    state: c.state,
    signedAt: c.signedAt,
    effectiveDate: c.effectiveDate,
    expirationDate: c.expirationDate,
    warrantyMonths: c.warrantyMonths,
    notes: c.notes,
  };
}
