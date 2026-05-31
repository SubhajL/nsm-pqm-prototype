import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { permits } from '@/lib/db/schema';
import type { PermitRepository } from '@/lib/repositories/permit.repository';
import type { Permit, PermitStatus } from '@/types/permit';

export class DatabasePermitRepository implements PermitRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Permit[]> {
    const rows = await this.db.select().from(permits);
    return rows.map(rowToPermit);
  }

  async listByProject(projectId: string): Promise<Permit[]> {
    const rows = await this.db
      .select()
      .from(permits)
      .where(eq(permits.projectId, projectId));
    return rows.map(rowToPermit);
  }

  async findById(id: string): Promise<Permit | null> {
    const rows = await this.db
      .select()
      .from(permits)
      .where(eq(permits.id, id))
      .limit(1);
    return rows[0] ? rowToPermit(rows[0]) : null;
  }

  async create(entity: Permit): Promise<Permit> {
    const [row] = await this.db
      .insert(permits)
      .values(permitToRow(entity))
      .returning();
    return rowToPermit(row);
  }

  async update(id: string, patch: Partial<Permit>): Promise<Permit | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: Permit = { ...existing, ...patch };
    const [row] = await this.db
      .update(permits)
      .set(permitToRow(merged))
      .where(eq(permits.id, id))
      .returning();
    return row ? rowToPermit(row) : null;
  }

  async delete(id: string): Promise<Permit | null> {
    const [row] = await this.db
      .delete(permits)
      .where(eq(permits.id, id))
      .returning();
    return row ? rowToPermit(row) : null;
  }
}

type Row = typeof permits.$inferSelect;

function rowToPermit(row: Row): Permit {
  return {
    id: row.id,
    projectId: row.projectId,
    permitType: row.permitType,
    title: row.title,
    issuingAuthority: row.issuingAuthority,
    status: row.status as PermitStatus,
    issuedAt: row.issuedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    notes: row.notes,
  };
}

function permitToRow(p: Permit): typeof permits.$inferInsert {
  return {
    id: p.id,
    projectId: p.projectId,
    permitType: p.permitType,
    title: p.title,
    issuingAuthority: p.issuingAuthority,
    status: p.status,
    issuedAt: p.issuedAt,
    expiresAt: p.expiresAt,
    notes: p.notes,
  };
}
