import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { landAcquisitionRecords } from '@/lib/db/schema';
import type { LandAcquisitionRepository } from '@/lib/repositories/land-acquisition.repository';
import type {
  LandAcquisitionRecord,
  LandAcquisitionStatus,
} from '@/types/land-acquisition';

export class DatabaseLandAcquisitionRepository
  implements LandAcquisitionRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<LandAcquisitionRecord[]> {
    const rows = await this.db.select().from(landAcquisitionRecords);
    return rows.map(rowToLand);
  }

  async listByProject(projectId: string): Promise<LandAcquisitionRecord[]> {
    const rows = await this.db
      .select()
      .from(landAcquisitionRecords)
      .where(eq(landAcquisitionRecords.projectId, projectId));
    return rows.map(rowToLand);
  }

  async findById(id: string): Promise<LandAcquisitionRecord | null> {
    const rows = await this.db
      .select()
      .from(landAcquisitionRecords)
      .where(eq(landAcquisitionRecords.id, id))
      .limit(1);
    return rows[0] ? rowToLand(rows[0]) : null;
  }

  async create(entity: LandAcquisitionRecord): Promise<LandAcquisitionRecord> {
    const [row] = await this.db
      .insert(landAcquisitionRecords)
      .values(landToRow(entity))
      .returning();
    return rowToLand(row);
  }

  async update(
    id: string,
    patch: Partial<LandAcquisitionRecord>,
  ): Promise<LandAcquisitionRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: LandAcquisitionRecord = { ...existing, ...patch };
    const [row] = await this.db
      .update(landAcquisitionRecords)
      .set(landToRow(merged))
      .where(eq(landAcquisitionRecords.id, id))
      .returning();
    return row ? rowToLand(row) : null;
  }

  async delete(id: string): Promise<LandAcquisitionRecord | null> {
    const [row] = await this.db
      .delete(landAcquisitionRecords)
      .where(eq(landAcquisitionRecords.id, id))
      .returning();
    return row ? rowToLand(row) : null;
  }
}

type Row = typeof landAcquisitionRecords.$inferSelect;

function rowToLand(row: Row): LandAcquisitionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    parcelReference: row.parcelReference,
    landownerName: row.landownerName,
    areaRai: row.areaRai,
    status: row.status as LandAcquisitionStatus,
    compensationAmount: row.compensationAmount ?? null,
    notes: row.notes,
  };
}

function landToRow(
  l: LandAcquisitionRecord,
): typeof landAcquisitionRecords.$inferInsert {
  return {
    id: l.id,
    projectId: l.projectId,
    parcelReference: l.parcelReference,
    landownerName: l.landownerName,
    areaRai: l.areaRai,
    status: l.status,
    compensationAmount: l.compensationAmount,
    notes: l.notes,
  };
}
