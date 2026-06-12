import { and, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { handoverPackets } from '@/lib/db/schema';
import type { HandoverPacketRepository } from '@/lib/repositories/handover-packet.repository';
import type { HandoverPacket, HandoverState } from '@/types/handover-packet';

export class DatabaseHandoverPacketRepository
  implements HandoverPacketRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<HandoverPacket[]> {
    const rows = await this.db.select().from(handoverPackets);
    return rows.map(rowToPacket);
  }

  async listByProject(projectId: string): Promise<HandoverPacket[]> {
    const rows = await this.db
      .select()
      .from(handoverPackets)
      .where(eq(handoverPackets.projectId, projectId));
    return rows.map(rowToPacket);
  }

  async findById(id: string): Promise<HandoverPacket | null> {
    const rows = await this.db
      .select()
      .from(handoverPackets)
      .where(eq(handoverPackets.id, id))
      .limit(1);
    return rows[0] ? rowToPacket(rows[0]) : null;
  }

  async create(entity: HandoverPacket): Promise<HandoverPacket> {
    const [row] = await this.db
      .insert(handoverPackets)
      .values(packetToRow(entity))
      .returning();
    return rowToPacket(row);
  }

  async update(
    id: string,
    patch: Partial<HandoverPacket>,
  ): Promise<HandoverPacket | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: HandoverPacket = { ...existing, ...patch };
    const [row] = await this.db
      .update(handoverPackets)
      .set(packetToRow(merged))
      .where(eq(handoverPackets.id, id))
      .returning();
    return row ? rowToPacket(row) : null;
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
    expected: HandoverPacket['state'],
    patch: Partial<HandoverPacket>,
  ): Promise<HandoverPacket | null> {
    const existing = await this.findById(id);
    if (!existing || existing.state !== expected) return null;
    const merged: HandoverPacket = { ...existing, ...patch };
    const [row] = await this.db
      .update(handoverPackets)
      .set(packetToRow(merged))
      .where(and(eq(handoverPackets.id, id), eq(handoverPackets.state, expected)))
      .returning();
    return row ? rowToPacket(row) : null;
  }

  async delete(id: string): Promise<HandoverPacket | null> {
    const [row] = await this.db
      .delete(handoverPackets)
      .where(eq(handoverPackets.id, id))
      .returning();
    return row ? rowToPacket(row) : null;
  }
}

type Row = typeof handoverPackets.$inferSelect;

function rowToPacket(row: Row): HandoverPacket {
  return {
    id: row.id,
    projectId: row.projectId,
    contractId: row.contractId ?? null,
    state: row.state as HandoverState,
    submittedAt: row.submittedAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
    warrantyStartDate: row.warrantyStartDate ?? null,
    warrantyEndDate: row.warrantyEndDate ?? null,
    acceptedBy: row.acceptedBy ?? null,
    notes: row.notes,
  };
}

function packetToRow(p: HandoverPacket): typeof handoverPackets.$inferInsert {
  return {
    id: p.id,
    projectId: p.projectId,
    contractId: p.contractId,
    state: p.state,
    submittedAt: p.submittedAt,
    acceptedAt: p.acceptedAt,
    warrantyStartDate: p.warrantyStartDate,
    warrantyEndDate: p.warrantyEndDate,
    acceptedBy: p.acceptedBy,
    notes: p.notes,
  };
}
