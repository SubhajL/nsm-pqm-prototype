import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { omManualEntries } from '@/lib/db/schema';
import type { OmManualEntryRepository } from '@/lib/repositories/om-manual-entry.repository';
import type { OmManualCategory, OmManualEntry } from '@/types/om-manual';

export class DatabaseOmManualEntryRepository
  implements OmManualEntryRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<OmManualEntry[]> {
    const rows = await this.db.select().from(omManualEntries);
    return rows.map(rowToEntry);
  }

  async listByHandoverPacket(
    handoverPacketId: string,
  ): Promise<OmManualEntry[]> {
    const rows = await this.db
      .select()
      .from(omManualEntries)
      .where(eq(omManualEntries.handoverPacketId, handoverPacketId));
    return rows.map(rowToEntry);
  }

  async findById(id: string): Promise<OmManualEntry | null> {
    const rows = await this.db
      .select()
      .from(omManualEntries)
      .where(eq(omManualEntries.id, id))
      .limit(1);
    return rows[0] ? rowToEntry(rows[0]) : null;
  }

  async create(entity: OmManualEntry): Promise<OmManualEntry> {
    const [row] = await this.db
      .insert(omManualEntries)
      .values(entryToRow(entity))
      .returning();
    return rowToEntry(row);
  }

  async update(
    id: string,
    patch: Partial<OmManualEntry>,
  ): Promise<OmManualEntry | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: OmManualEntry = { ...existing, ...patch };
    const [row] = await this.db
      .update(omManualEntries)
      .set(entryToRow(merged))
      .where(eq(omManualEntries.id, id))
      .returning();
    return row ? rowToEntry(row) : null;
  }

  async delete(id: string): Promise<OmManualEntry | null> {
    const [row] = await this.db
      .delete(omManualEntries)
      .where(eq(omManualEntries.id, id))
      .returning();
    return row ? rowToEntry(row) : null;
  }
}

type Row = typeof omManualEntries.$inferSelect;

function rowToEntry(row: Row): OmManualEntry {
  return {
    id: row.id,
    handoverPacketId: row.handoverPacketId,
    category: row.category as OmManualCategory,
    title: row.title,
    documentFileId: row.documentFileId ?? null,
    notes: row.notes,
  };
}

function entryToRow(
  e: OmManualEntry,
): typeof omManualEntries.$inferInsert {
  return {
    id: e.id,
    handoverPacketId: e.handoverPacketId,
    category: e.category,
    title: e.title,
    documentFileId: e.documentFileId,
    notes: e.notes,
  };
}
