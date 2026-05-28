import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { evmDataPoints, evmProjectRegistry } from '@/lib/db/schema';
import type { EvmRepository } from '@/lib/repositories/evm.repository';
import type { EVMDataPoint } from '@/types/evm';

export class DatabaseEvmRepository implements EvmRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<EVMDataPoint[]> {
    const rows = await this.db.select().from(evmDataPoints).orderBy(asc(evmDataPoints.month));
    return rows.map(rowToPoint);
  }

  async listByProject(projectId: string): Promise<EVMDataPoint[]> {
    const rows = await this.db
      .select()
      .from(evmDataPoints)
      .where(eq(evmDataPoints.projectId, projectId))
      .orderBy(asc(evmDataPoints.month));
    return rows.map(rowToPoint);
  }

  async findById(id: string): Promise<EVMDataPoint | null> {
    const rows = await this.db.select().from(evmDataPoints).where(eq(evmDataPoints.id, id)).limit(1);
    return rows[0] ? rowToPoint(rows[0]) : null;
  }

  async findByProjectAndMonth(projectId: string, month: string): Promise<EVMDataPoint | null> {
    const rows = await this.db
      .select()
      .from(evmDataPoints)
      .where(and(eq(evmDataPoints.projectId, projectId), eq(evmDataPoints.month, month)))
      .limit(1);
    return rows[0] ? rowToPoint(rows[0]) : null;
  }

  async create(point: EVMDataPoint): Promise<EVMDataPoint> {
    // Also auto-register the project — the InMemory `create` adds via
    // `getEvmStore().push` and then `getEvmProjectRegistry` recomputes
    // its set from the store. To mimic that here we insert into the
    // registry too (idempotent: on conflict do nothing).
    const [row] = await this.db.insert(evmDataPoints).values(pointToRow(point)).returning();
    await this.db
      .insert(evmProjectRegistry)
      .values({ projectId: point.projectId })
      .onConflictDoNothing();
    return rowToPoint(row);
  }

  async delete(id: string): Promise<EVMDataPoint | null> {
    const [row] = await this.db.delete(evmDataPoints).where(eq(evmDataPoints.id, id)).returning();
    return row ? rowToPoint(row) : null;
  }

  async ensureProjectInitialized(projectId: string): Promise<void> {
    await this.db
      .insert(evmProjectRegistry)
      .values({ projectId })
      .onConflictDoNothing();
  }

  async registeredProjectIds(): Promise<string[]> {
    const rows = await this.db.select({ projectId: evmProjectRegistry.projectId }).from(evmProjectRegistry);
    return rows.map((row) => row.projectId);
  }
}

type Row = typeof evmDataPoints.$inferSelect;

function rowToPoint(row: Row): EVMDataPoint {
  return {
    id: row.id,
    projectId: row.projectId,
    month: row.month,
    monthThai: row.monthThai,
    pv: row.pv,
    ev: row.ev,
    ac: row.ac,
    paidToDate: row.paidToDate ?? undefined,
    spi: row.spi,
    cpi: row.cpi,
  };
}

function pointToRow(point: EVMDataPoint): typeof evmDataPoints.$inferInsert {
  return {
    id: point.id,
    projectId: point.projectId,
    month: point.month,
    monthThai: point.monthThai,
    pv: point.pv,
    ev: point.ev,
    ac: point.ac,
    paidToDate: point.paidToDate ?? null,
    spi: point.spi,
    cpi: point.cpi,
  };
}
