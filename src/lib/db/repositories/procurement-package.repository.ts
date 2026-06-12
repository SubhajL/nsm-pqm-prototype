import { and, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { procurementPackages } from '@/lib/db/schema';
import type { ProcurementPackageRepository } from '@/lib/repositories/procurement-package.repository';
import type {
  ProcurementMethod,
  ProcurementPackage,
  ProcurementState,
} from '@/types/procurement-package';

export class DatabaseProcurementPackageRepository
  implements ProcurementPackageRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<ProcurementPackage[]> {
    const rows = await this.db.select().from(procurementPackages);
    return rows.map(rowToPackage);
  }

  async listByProject(projectId: string): Promise<ProcurementPackage[]> {
    const rows = await this.db
      .select()
      .from(procurementPackages)
      .where(eq(procurementPackages.projectId, projectId));
    return rows.map(rowToPackage);
  }

  async findById(id: string): Promise<ProcurementPackage | null> {
    const rows = await this.db
      .select()
      .from(procurementPackages)
      .where(eq(procurementPackages.id, id))
      .limit(1);
    return rows[0] ? rowToPackage(rows[0]) : null;
  }

  async create(entity: ProcurementPackage): Promise<ProcurementPackage> {
    const [row] = await this.db
      .insert(procurementPackages)
      .values(packageToRow(entity))
      .returning();
    return rowToPackage(row);
  }

  async update(
    id: string,
    patch: Partial<ProcurementPackage>,
  ): Promise<ProcurementPackage | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: ProcurementPackage = { ...existing, ...patch };
    const [row] = await this.db
      .update(procurementPackages)
      .set(packageToRow(merged))
      .where(eq(procurementPackages.id, id))
      .returning();
    return row ? rowToPackage(row) : null;
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
    expected: ProcurementPackage['state'],
    patch: Partial<ProcurementPackage>,
  ): Promise<ProcurementPackage | null> {
    const existing = await this.findById(id);
    if (!existing || existing.state !== expected) return null;
    const merged: ProcurementPackage = { ...existing, ...patch };
    const [row] = await this.db
      .update(procurementPackages)
      .set(packageToRow(merged))
      .where(and(eq(procurementPackages.id, id), eq(procurementPackages.state, expected)))
      .returning();
    return row ? rowToPackage(row) : null;
  }

  async delete(id: string): Promise<ProcurementPackage | null> {
    const [row] = await this.db
      .delete(procurementPackages)
      .where(eq(procurementPackages.id, id))
      .returning();
    return row ? rowToPackage(row) : null;
  }
}

type Row = typeof procurementPackages.$inferSelect;

function rowToPackage(row: Row): ProcurementPackage {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    state: row.state as ProcurementState,
    budgetCeiling: row.budgetCeiling,
    procurementMethod: row.procurementMethod as ProcurementMethod,
    openedAt: row.openedAt ?? null,
    closedAt: row.closedAt ?? null,
    notes: row.notes,
  };
}

function packageToRow(
  p: ProcurementPackage,
): typeof procurementPackages.$inferInsert {
  return {
    id: p.id,
    projectId: p.projectId,
    name: p.name,
    state: p.state,
    budgetCeiling: p.budgetCeiling,
    procurementMethod: p.procurementMethod,
    openedAt: p.openedAt,
    closedAt: p.closedAt,
    notes: p.notes,
  };
}
