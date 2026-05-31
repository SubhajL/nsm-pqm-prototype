import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { committeeInspections } from '@/lib/db/schema';
import type { CommitteeInspectionRepository } from '@/lib/repositories/committee-inspection.repository';
import type {
  CommitteeInspection,
  CommitteeInspectionResult,
} from '@/types/committee-inspection';

export class DatabaseCommitteeInspectionRepository
  implements CommitteeInspectionRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<CommitteeInspection[]> {
    const rows = await this.db.select().from(committeeInspections);
    return rows.map(rowToInspection);
  }

  async listByWorkPeriod(
    workPeriodId: string,
  ): Promise<CommitteeInspection[]> {
    const rows = await this.db
      .select()
      .from(committeeInspections)
      .where(eq(committeeInspections.workPeriodId, workPeriodId));
    return rows.map(rowToInspection);
  }

  async findById(id: string): Promise<CommitteeInspection | null> {
    const rows = await this.db
      .select()
      .from(committeeInspections)
      .where(eq(committeeInspections.id, id))
      .limit(1);
    return rows[0] ? rowToInspection(rows[0]) : null;
  }

  async create(entity: CommitteeInspection): Promise<CommitteeInspection> {
    const [row] = await this.db
      .insert(committeeInspections)
      .values(inspectionToRow(entity))
      .returning();
    return rowToInspection(row);
  }

  async update(
    id: string,
    patch: Partial<CommitteeInspection>,
  ): Promise<CommitteeInspection | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: CommitteeInspection = { ...existing, ...patch };
    const [row] = await this.db
      .update(committeeInspections)
      .set(inspectionToRow(merged))
      .where(eq(committeeInspections.id, id))
      .returning();
    return row ? rowToInspection(row) : null;
  }

  async delete(id: string): Promise<CommitteeInspection | null> {
    const [row] = await this.db
      .delete(committeeInspections)
      .where(eq(committeeInspections.id, id))
      .returning();
    return row ? rowToInspection(row) : null;
  }
}

type Row = typeof committeeInspections.$inferSelect;

function rowToInspection(row: Row): CommitteeInspection {
  return {
    id: row.id,
    workPeriodId: row.workPeriodId,
    inspectedAt: row.inspectedAt,
    inspectors: Array.isArray(row.inspectors) ? row.inspectors : [],
    result: row.result as CommitteeInspectionResult,
    conditions: row.conditions,
    documentIds: Array.isArray(row.documentIds) ? row.documentIds : [],
  };
}

function inspectionToRow(
  insp: CommitteeInspection,
): typeof committeeInspections.$inferInsert {
  return {
    id: insp.id,
    workPeriodId: insp.workPeriodId,
    inspectedAt: insp.inspectedAt,
    inspectors: insp.inspectors,
    result: insp.result,
    conditions: insp.conditions,
    documentIds: insp.documentIds,
  };
}
