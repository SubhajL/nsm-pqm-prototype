import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { risks } from '@/lib/db/schema';
import type { RiskRepository } from '@/lib/repositories/risk.repository';
import type { Risk } from '@/types/risk';

export class DatabaseRiskRepository implements RiskRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Risk[]> {
    const rows = await this.db.select().from(risks);
    return rows.map(rowToRisk);
  }

  async listByProject(projectId: string): Promise<Risk[]> {
    const rows = await this.db.select().from(risks).where(eq(risks.projectId, projectId));
    return rows.map(rowToRisk);
  }

  async findById(id: string): Promise<Risk | null> {
    const rows = await this.db.select().from(risks).where(eq(risks.id, id)).limit(1);
    return rows[0] ? rowToRisk(rows[0]) : null;
  }

  async create(entity: Risk): Promise<Risk> {
    const [row] = await this.db.insert(risks).values(riskToRow(entity)).returning();
    return rowToRisk(row);
  }

  async update(id: string, patch: Partial<Risk>): Promise<Risk | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: Risk = { ...existing, ...patch };
    const [row] = await this.db
      .update(risks)
      .set(riskToRow(merged))
      .where(eq(risks.id, id))
      .returning();
    return row ? rowToRisk(row) : null;
  }

  async delete(id: string): Promise<Risk | null> {
    const [row] = await this.db.delete(risks).where(eq(risks.id, id)).returning();
    return row ? rowToRisk(row) : null;
  }
}

type Row = typeof risks.$inferSelect;

function rowToRisk(row: Row): Risk {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    likelihood: row.likelihood,
    impact: row.impact,
    score: row.score,
    level: row.level as Risk['level'],
    status: row.status as Risk['status'],
    owner: row.owner,
    dateIdentified: row.dateIdentified,
    mitigation: row.mitigation,
  };
}

function riskToRow(risk: Risk): typeof risks.$inferInsert {
  return {
    id: risk.id,
    projectId: risk.projectId,
    title: risk.title,
    description: risk.description,
    likelihood: risk.likelihood,
    impact: risk.impact,
    score: risk.score,
    level: risk.level,
    status: risk.status,
    owner: risk.owner,
    dateIdentified: risk.dateIdentified,
    mitigation: risk.mitigation,
  };
}
