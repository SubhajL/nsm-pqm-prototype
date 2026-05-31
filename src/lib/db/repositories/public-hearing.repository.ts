import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { publicHearings } from '@/lib/db/schema';
import type { PublicHearingRepository } from '@/lib/repositories/public-hearing.repository';
import type { PublicHearing } from '@/types/public-hearing';

export class DatabasePublicHearingRepository
  implements PublicHearingRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<PublicHearing[]> {
    const rows = await this.db.select().from(publicHearings);
    return rows.map(rowToHearing);
  }

  async listByProject(projectId: string): Promise<PublicHearing[]> {
    const rows = await this.db
      .select()
      .from(publicHearings)
      .where(eq(publicHearings.projectId, projectId));
    return rows.map(rowToHearing);
  }

  async findById(id: string): Promise<PublicHearing | null> {
    const rows = await this.db
      .select()
      .from(publicHearings)
      .where(eq(publicHearings.id, id))
      .limit(1);
    return rows[0] ? rowToHearing(rows[0]) : null;
  }

  async create(entity: PublicHearing): Promise<PublicHearing> {
    const [row] = await this.db
      .insert(publicHearings)
      .values(hearingToRow(entity))
      .returning();
    return rowToHearing(row);
  }

  async update(
    id: string,
    patch: Partial<PublicHearing>,
  ): Promise<PublicHearing | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: PublicHearing = { ...existing, ...patch };
    const [row] = await this.db
      .update(publicHearings)
      .set(hearingToRow(merged))
      .where(eq(publicHearings.id, id))
      .returning();
    return row ? rowToHearing(row) : null;
  }

  async delete(id: string): Promise<PublicHearing | null> {
    const [row] = await this.db
      .delete(publicHearings)
      .where(eq(publicHearings.id, id))
      .returning();
    return row ? rowToHearing(row) : null;
  }
}

type Row = typeof publicHearings.$inferSelect;

function rowToHearing(row: Row): PublicHearing {
  return {
    id: row.id,
    projectId: row.projectId,
    heldAt: row.heldAt,
    location: row.location,
    attendeeCount: row.attendeeCount,
    summary: row.summary,
    signedMinuteDocId: row.signedMinuteDocId ?? null,
  };
}

function hearingToRow(
  h: PublicHearing,
): typeof publicHearings.$inferInsert {
  return {
    id: h.id,
    projectId: h.projectId,
    heldAt: h.heldAt,
    location: h.location,
    attendeeCount: h.attendeeCount,
    summary: h.summary,
    signedMinuteDocId: h.signedMinuteDocId,
  };
}
