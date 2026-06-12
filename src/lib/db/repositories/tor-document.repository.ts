import { desc, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { torDocuments } from '@/lib/db/schema';
import type { TorDocumentRepository } from '@/lib/repositories/tor-document.repository';
import type { TorDocument } from '@/types/tor-document';

export class DatabaseTorDocumentRepository implements TorDocumentRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<TorDocument[]> {
    const rows = await this.db.select().from(torDocuments);
    return rows.map(rowToTor);
  }

  async listByProcurementPackage(
    procurementPackageId: string,
  ): Promise<TorDocument[]> {
    const rows = await this.db
      .select()
      .from(torDocuments)
      .where(eq(torDocuments.procurementPackageId, procurementPackageId));
    return rows.map(rowToTor);
  }

  async findById(id: string): Promise<TorDocument | null> {
    const rows = await this.db
      .select()
      .from(torDocuments)
      .where(eq(torDocuments.id, id))
      .limit(1);
    return rows[0] ? rowToTor(rows[0]) : null;
  }

  async create(entity: TorDocument): Promise<TorDocument> {
    const [row] = await this.db
      .insert(torDocuments)
      .values(torToRow(entity))
      .returning();
    return rowToTor(row);
  }

  async update(
    id: string,
    patch: Partial<TorDocument>,
  ): Promise<TorDocument | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: TorDocument = { ...existing, ...patch };
    const [row] = await this.db
      .update(torDocuments)
      .set(torToRow(merged))
      .where(eq(torDocuments.id, id))
      .returning();
    return row ? rowToTor(row) : null;
  }


  /**
   * PR-34 — highest-version TOR for a package; backs server-side
   * version assignment (next = latest + 1).
   */
  async findLatestByProcurementPackage(
    procurementPackageId: string,
  ): Promise<TorDocument | null> {
    const rows = await this.db
      .select()
      .from(torDocuments)
      .where(eq(torDocuments.procurementPackageId, procurementPackageId))
      .orderBy(desc(torDocuments.version))
      .limit(1);
    return rows[0] ? rowToTor(rows[0]) : null;
  }

  async delete(id: string): Promise<TorDocument | null> {
    const [row] = await this.db
      .delete(torDocuments)
      .where(eq(torDocuments.id, id))
      .returning();
    return row ? rowToTor(row) : null;
  }
}

type Row = typeof torDocuments.$inferSelect;

function rowToTor(row: Row): TorDocument {
  return {
    id: row.id,
    procurementPackageId: row.procurementPackageId,
    version: row.version,
    scopeSummary: row.scopeSummary,
    technicalRequirements: row.technicalRequirements,
    deliverySchedule: row.deliverySchedule,
    evaluationCriteria: row.evaluationCriteria,
    documentFileId: row.documentFileId ?? null,
    approvedAt: row.approvedAt ?? null,
  };
}

function torToRow(t: TorDocument): typeof torDocuments.$inferInsert {
  return {
    id: t.id,
    procurementPackageId: t.procurementPackageId,
    version: t.version,
    scopeSummary: t.scopeSummary,
    technicalRequirements: t.technicalRequirements,
    deliverySchedule: t.deliverySchedule,
    evaluationCriteria: t.evaluationCriteria,
    documentFileId: t.documentFileId,
    approvedAt: t.approvedAt,
  };
}
