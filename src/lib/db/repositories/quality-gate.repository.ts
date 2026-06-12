import { and, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { qualityGates } from '@/lib/db/schema';
import type { QualityGateRepository } from '@/lib/repositories/quality-gate.repository';
import type { QualityGate } from '@/types/quality';

export class DatabaseQualityGateRepository implements QualityGateRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<QualityGate[]> {
    const rows = await this.db.select().from(qualityGates);
    return rows.map(rowToGate);
  }

  async listByProject(projectId: string): Promise<QualityGate[]> {
    const rows = await this.db.select().from(qualityGates).where(eq(qualityGates.projectId, projectId));
    return rows.map(rowToGate);
  }

  async findById(id: string): Promise<QualityGate | null> {
    const rows = await this.db.select().from(qualityGates).where(eq(qualityGates.id, id)).limit(1);
    return rows[0] ? rowToGate(rows[0]) : null;
  }

  async create(entity: QualityGate): Promise<QualityGate> {
    const [row] = await this.db.insert(qualityGates).values(gateToRow(entity)).returning();
    return rowToGate(row);
  }

  async update(id: string, patch: Partial<QualityGate>): Promise<QualityGate | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: QualityGate = { ...existing, ...patch };
    const [row] = await this.db
      .update(qualityGates)
      .set(gateToRow(merged))
      .where(eq(qualityGates.id, id))
      .returning();
    return row ? rowToGate(row) : null;
  }


  /**
   * PR-34 — compare-and-swap update: applies `patch` only while the
   * row's status still equals `expected`. The UPDATE itself carries
   * `WHERE id = ? AND status = ?`, so a transition raced by another
   * writer matches zero rows and returns null instead of clobbering.
   * Callers map null to 409 STATE_CONFLICT.
   */
  async updateIfState(
    id: string,
    expected: QualityGate['status'],
    patch: Partial<QualityGate>,
  ): Promise<QualityGate | null> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== expected) return null;
    const merged: QualityGate = { ...existing, ...patch };
    const [row] = await this.db
      .update(qualityGates)
      .set(gateToRow(merged))
      .where(and(eq(qualityGates.id, id), eq(qualityGates.status, expected)))
      .returning();
    return row ? rowToGate(row) : null;
  }

  async delete(id: string): Promise<QualityGate | null> {
    const [row] = await this.db.delete(qualityGates).where(eq(qualityGates.id, id)).returning();
    return row ? rowToGate(row) : null;
  }
}

type Row = typeof qualityGates.$inferSelect;

function rowToGate(row: Row): QualityGate {
  return {
    id: row.id,
    projectId: row.projectId,
    number: row.number,
    name: row.name,
    nameEn: row.nameEn,
    status: row.status,
    date: row.date,
    checklist: row.checklist ?? undefined,
  };
}

function gateToRow(gate: QualityGate): typeof qualityGates.$inferInsert {
  return {
    id: gate.id,
    projectId: gate.projectId,
    number: gate.number,
    name: gate.name,
    nameEn: gate.nameEn,
    status: gate.status,
    date: gate.date,
    checklist: gate.checklist ?? null,
  };
}
