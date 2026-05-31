import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { itSprints } from '@/lib/db/schema';
import type { ItSprintRepository } from '@/lib/repositories/sprint.repository';
import type { ItSprint } from '@/types/sprint';

export class DatabaseItSprintRepository implements ItSprintRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<ItSprint[]> {
    const rows = await this.db.select().from(itSprints);
    return rows.map(rowToSprint);
  }

  async listByProject(projectId: string): Promise<ItSprint[]> {
    const rows = await this.db
      .select()
      .from(itSprints)
      .where(eq(itSprints.projectId, projectId));
    return rows.map(rowToSprint);
  }

  async findById(id: string): Promise<ItSprint | null> {
    const rows = await this.db
      .select()
      .from(itSprints)
      .where(eq(itSprints.id, id))
      .limit(1);
    return rows[0] ? rowToSprint(rows[0]) : null;
  }

  async create(entity: ItSprint): Promise<ItSprint> {
    const [row] = await this.db
      .insert(itSprints)
      .values(sprintToRow(entity))
      .returning();
    return rowToSprint(row);
  }

  async update(id: string, patch: Partial<ItSprint>): Promise<ItSprint | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: ItSprint = { ...existing, ...patch };
    const [row] = await this.db
      .update(itSprints)
      .set(sprintToRow(merged))
      .where(eq(itSprints.id, id))
      .returning();
    return row ? rowToSprint(row) : null;
  }

  async delete(id: string): Promise<ItSprint | null> {
    const [row] = await this.db
      .delete(itSprints)
      .where(eq(itSprints.id, id))
      .returning();
    return row ? rowToSprint(row) : null;
  }
}

type Row = typeof itSprints.$inferSelect;

function rowToSprint(row: Row): ItSprint {
  return {
    id: row.id,
    projectId: row.projectId,
    lifecycleStage: row.lifecycleStage,
    sprintNumber: row.sprintNumber,
    startDate: row.startDate,
    endDate: row.endDate,
    goal: row.goal,
    velocityPoints: row.velocityPoints,
    completedPoints: row.completedPoints,
    notes: row.notes,
  };
}

function sprintToRow(s: ItSprint): typeof itSprints.$inferInsert {
  return {
    id: s.id,
    projectId: s.projectId,
    lifecycleStage: s.lifecycleStage,
    sprintNumber: s.sprintNumber,
    startDate: s.startDate,
    endDate: s.endDate,
    goal: s.goal,
    velocityPoints: s.velocityPoints,
    completedPoints: s.completedPoints,
    notes: s.notes,
  };
}
