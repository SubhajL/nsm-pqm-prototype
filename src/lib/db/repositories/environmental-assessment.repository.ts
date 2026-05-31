import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { environmentalAssessments } from '@/lib/db/schema';
import type { EnvironmentalAssessmentRepository } from '@/lib/repositories/environmental-assessment.repository';
import type {
  EiaStatus,
  EnvironmentalAssessment,
  EnvironmentalAssessmentKind,
} from '@/types/environmental-assessment';

export class DatabaseEnvironmentalAssessmentRepository
  implements EnvironmentalAssessmentRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<EnvironmentalAssessment[]> {
    const rows = await this.db.select().from(environmentalAssessments);
    return rows.map(rowToEia);
  }

  async listByProject(projectId: string): Promise<EnvironmentalAssessment[]> {
    const rows = await this.db
      .select()
      .from(environmentalAssessments)
      .where(eq(environmentalAssessments.projectId, projectId));
    return rows.map(rowToEia);
  }

  async findById(id: string): Promise<EnvironmentalAssessment | null> {
    const rows = await this.db
      .select()
      .from(environmentalAssessments)
      .where(eq(environmentalAssessments.id, id))
      .limit(1);
    return rows[0] ? rowToEia(rows[0]) : null;
  }

  async create(
    entity: EnvironmentalAssessment,
  ): Promise<EnvironmentalAssessment> {
    const [row] = await this.db
      .insert(environmentalAssessments)
      .values(eiaToRow(entity))
      .returning();
    return rowToEia(row);
  }

  async update(
    id: string,
    patch: Partial<EnvironmentalAssessment>,
  ): Promise<EnvironmentalAssessment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: EnvironmentalAssessment = { ...existing, ...patch };
    const [row] = await this.db
      .update(environmentalAssessments)
      .set(eiaToRow(merged))
      .where(eq(environmentalAssessments.id, id))
      .returning();
    return row ? rowToEia(row) : null;
  }

  async delete(id: string): Promise<EnvironmentalAssessment | null> {
    const [row] = await this.db
      .delete(environmentalAssessments)
      .where(eq(environmentalAssessments.id, id))
      .returning();
    return row ? rowToEia(row) : null;
  }
}

type Row = typeof environmentalAssessments.$inferSelect;

function rowToEia(row: Row): EnvironmentalAssessment {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind as EnvironmentalAssessmentKind,
    status: row.status as EiaStatus,
    approvedAt: row.approvedAt ?? null,
    approvalReference: row.approvalReference ?? null,
    notes: row.notes,
  };
}

function eiaToRow(
  e: EnvironmentalAssessment,
): typeof environmentalAssessments.$inferInsert {
  return {
    id: e.id,
    projectId: e.projectId,
    kind: e.kind,
    status: e.status,
    approvedAt: e.approvedAt,
    approvalReference: e.approvalReference,
    notes: e.notes,
  };
}
