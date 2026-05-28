import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { milestones } from '@/lib/db/schema';
import type { MilestoneRepository } from '@/lib/repositories/milestone.repository';
import type { Milestone } from '@/types/project';

export class DatabaseMilestoneRepository implements MilestoneRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Milestone[]> {
    const rows = await this.db.select().from(milestones);
    return rows.map(rowToMilestone);
  }

  async listByProject(projectId: string): Promise<Milestone[]> {
    const rows = await this.db.select().from(milestones).where(eq(milestones.projectId, projectId));
    return rows.map(rowToMilestone);
  }

  async findById(id: string): Promise<Milestone | null> {
    const rows = await this.db.select().from(milestones).where(eq(milestones.id, id)).limit(1);
    return rows[0] ? rowToMilestone(rows[0]) : null;
  }

  async create(entity: Milestone): Promise<Milestone> {
    const [row] = await this.db.insert(milestones).values(milestoneToRow(entity)).returning();
    return rowToMilestone(row);
  }

  async update(id: string, patch: Partial<Milestone>): Promise<Milestone | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: Milestone = { ...existing, ...patch };
    const [row] = await this.db
      .update(milestones)
      .set(milestoneToRow(merged))
      .where(eq(milestones.id, id))
      .returning();
    return row ? rowToMilestone(row) : null;
  }

  async delete(id: string): Promise<Milestone | null> {
    const [row] = await this.db.delete(milestones).where(eq(milestones.id, id)).returning();
    return row ? rowToMilestone(row) : null;
  }
}

type Row = typeof milestones.$inferSelect;

function rowToMilestone(row: Row): Milestone {
  return {
    id: row.id,
    projectId: row.projectId,
    number: row.number,
    name: row.name,
    dueDate: row.dueDate,
    amount: row.amount,
    percentage: row.percentage,
    deliverables: row.deliverables,
    status: row.status as Milestone['status'],
  };
}

function milestoneToRow(milestone: Milestone): typeof milestones.$inferInsert {
  return {
    id: milestone.id,
    projectId: milestone.projectId,
    number: milestone.number,
    name: milestone.name,
    dueDate: milestone.dueDate,
    amount: milestone.amount,
    percentage: milestone.percentage,
    deliverables: milestone.deliverables,
    status: milestone.status,
  };
}
