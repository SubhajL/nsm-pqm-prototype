import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { asBuiltDrawings } from '@/lib/db/schema';
import type { AsBuiltDrawingRepository } from '@/lib/repositories/as-built-drawing.repository';
import type { AsBuiltDrawing } from '@/types/as-built-drawing';

export class DatabaseAsBuiltDrawingRepository
  implements AsBuiltDrawingRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<AsBuiltDrawing[]> {
    const rows = await this.db.select().from(asBuiltDrawings);
    return rows.map(rowToDrawing);
  }

  async listByHandoverPacket(
    handoverPacketId: string,
  ): Promise<AsBuiltDrawing[]> {
    const rows = await this.db
      .select()
      .from(asBuiltDrawings)
      .where(eq(asBuiltDrawings.handoverPacketId, handoverPacketId));
    return rows.map(rowToDrawing);
  }

  async findById(id: string): Promise<AsBuiltDrawing | null> {
    const rows = await this.db
      .select()
      .from(asBuiltDrawings)
      .where(eq(asBuiltDrawings.id, id))
      .limit(1);
    return rows[0] ? rowToDrawing(rows[0]) : null;
  }

  async create(entity: AsBuiltDrawing): Promise<AsBuiltDrawing> {
    const [row] = await this.db
      .insert(asBuiltDrawings)
      .values(drawingToRow(entity))
      .returning();
    return rowToDrawing(row);
  }

  async update(
    id: string,
    patch: Partial<AsBuiltDrawing>,
  ): Promise<AsBuiltDrawing | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: AsBuiltDrawing = { ...existing, ...patch };
    const [row] = await this.db
      .update(asBuiltDrawings)
      .set(drawingToRow(merged))
      .where(eq(asBuiltDrawings.id, id))
      .returning();
    return row ? rowToDrawing(row) : null;
  }

  async delete(id: string): Promise<AsBuiltDrawing | null> {
    const [row] = await this.db
      .delete(asBuiltDrawings)
      .where(eq(asBuiltDrawings.id, id))
      .returning();
    return row ? rowToDrawing(row) : null;
  }
}

type Row = typeof asBuiltDrawings.$inferSelect;

function rowToDrawing(row: Row): AsBuiltDrawing {
  return {
    id: row.id,
    handoverPacketId: row.handoverPacketId,
    drawingNumber: row.drawingNumber,
    title: row.title,
    documentFileId: row.documentFileId ?? null,
    revision: row.revision,
    uploadedAt: row.uploadedAt,
    notes: row.notes,
  };
}

function drawingToRow(
  d: AsBuiltDrawing,
): typeof asBuiltDrawings.$inferInsert {
  return {
    id: d.id,
    handoverPacketId: d.handoverPacketId,
    drawingNumber: d.drawingNumber,
    title: d.title,
    documentFileId: d.documentFileId,
    revision: d.revision,
    uploadedAt: d.uploadedAt,
    notes: d.notes,
  };
}
