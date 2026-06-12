import { and, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { workPeriods } from '@/lib/db/schema';
import type { WorkPeriodRepository } from '@/lib/repositories/work-period.repository';
import type { WorkPeriod, WorkPeriodState } from '@/types/work-period';

export class DatabaseWorkPeriodRepository implements WorkPeriodRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<WorkPeriod[]> {
    const rows = await this.db.select().from(workPeriods);
    return rows.map(rowToWorkPeriod);
  }

  async listByProject(projectId: string): Promise<WorkPeriod[]> {
    const rows = await this.db
      .select()
      .from(workPeriods)
      .where(eq(workPeriods.projectId, projectId));
    return rows.map(rowToWorkPeriod);
  }

  async findById(id: string): Promise<WorkPeriod | null> {
    const rows = await this.db
      .select()
      .from(workPeriods)
      .where(eq(workPeriods.id, id))
      .limit(1);
    return rows[0] ? rowToWorkPeriod(rows[0]) : null;
  }

  async create(entity: WorkPeriod): Promise<WorkPeriod> {
    const [row] = await this.db
      .insert(workPeriods)
      .values(workPeriodToRow(entity))
      .returning();
    return rowToWorkPeriod(row);
  }

  async update(id: string, patch: Partial<WorkPeriod>): Promise<WorkPeriod | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: WorkPeriod = { ...existing, ...patch };
    const [row] = await this.db
      .update(workPeriods)
      .set(workPeriodToRow(merged))
      .where(eq(workPeriods.id, id))
      .returning();
    return row ? rowToWorkPeriod(row) : null;
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
    expected: WorkPeriod['state'],
    patch: Partial<WorkPeriod>,
  ): Promise<WorkPeriod | null> {
    const existing = await this.findById(id);
    if (!existing || existing.state !== expected) return null;
    const merged: WorkPeriod = { ...existing, ...patch };
    const [row] = await this.db
      .update(workPeriods)
      .set(workPeriodToRow(merged))
      .where(and(eq(workPeriods.id, id), eq(workPeriods.state, expected)))
      .returning();
    return row ? rowToWorkPeriod(row) : null;
  }

  async delete(id: string): Promise<WorkPeriod | null> {
    const [row] = await this.db
      .delete(workPeriods)
      .where(eq(workPeriods.id, id))
      .returning();
    return row ? rowToWorkPeriod(row) : null;
  }
}

type Row = typeof workPeriods.$inferSelect;

function rowToWorkPeriod(row: Row): WorkPeriod {
  return {
    id: row.id,
    projectId: row.projectId,
    milestoneId: row.milestoneId ?? null,
    number: row.number,
    title: row.title,
    deliverables: Array.isArray(row.deliverables) ? row.deliverables : [],
    plannedStartDate: row.plannedStartDate,
    plannedEndDate: row.plannedEndDate,
    amount: row.amount,
    percentage: row.percentage,
    state: row.state as WorkPeriodState,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function workPeriodToRow(wp: WorkPeriod): typeof workPeriods.$inferInsert {
  return {
    id: wp.id,
    projectId: wp.projectId,
    milestoneId: wp.milestoneId,
    number: wp.number,
    title: wp.title,
    deliverables: wp.deliverables,
    plannedStartDate: wp.plannedStartDate,
    plannedEndDate: wp.plannedEndDate,
    amount: wp.amount,
    percentage: wp.percentage,
    state: wp.state,
    createdAt: wp.createdAt,
    updatedAt: wp.updatedAt,
  };
}
