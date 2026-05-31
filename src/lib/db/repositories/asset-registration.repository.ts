import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { assetRegistrations } from '@/lib/db/schema';
import type { AssetRegistrationRepository } from '@/lib/repositories/asset-registration.repository';
import type { AssetRegistration, AssetType } from '@/types/asset-registration';

export class DatabaseAssetRegistrationRepository
  implements AssetRegistrationRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<AssetRegistration[]> {
    const rows = await this.db.select().from(assetRegistrations);
    return rows.map(rowToRegistration);
  }

  async listByHandoverPacket(
    handoverPacketId: string,
  ): Promise<AssetRegistration[]> {
    const rows = await this.db
      .select()
      .from(assetRegistrations)
      .where(eq(assetRegistrations.handoverPacketId, handoverPacketId));
    return rows.map(rowToRegistration);
  }

  async findById(id: string): Promise<AssetRegistration | null> {
    const rows = await this.db
      .select()
      .from(assetRegistrations)
      .where(eq(assetRegistrations.id, id))
      .limit(1);
    return rows[0] ? rowToRegistration(rows[0]) : null;
  }

  async create(entity: AssetRegistration): Promise<AssetRegistration> {
    const [row] = await this.db
      .insert(assetRegistrations)
      .values(registrationToRow(entity))
      .returning();
    return rowToRegistration(row);
  }

  async update(
    id: string,
    patch: Partial<AssetRegistration>,
  ): Promise<AssetRegistration | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: AssetRegistration = { ...existing, ...patch };
    const [row] = await this.db
      .update(assetRegistrations)
      .set(registrationToRow(merged))
      .where(eq(assetRegistrations.id, id))
      .returning();
    return row ? rowToRegistration(row) : null;
  }

  async delete(id: string): Promise<AssetRegistration | null> {
    const [row] = await this.db
      .delete(assetRegistrations)
      .where(eq(assetRegistrations.id, id))
      .returning();
    return row ? rowToRegistration(row) : null;
  }
}

type Row = typeof assetRegistrations.$inferSelect;

function rowToRegistration(row: Row): AssetRegistration {
  return {
    id: row.id,
    handoverPacketId: row.handoverPacketId,
    assetCode: row.assetCode,
    assetType: row.assetType as AssetType,
    installedAt: row.installedAt,
    installedLocation: row.installedLocation,
    initialValue: row.initialValue,
    costCenter: row.costCenter ?? null,
    notes: row.notes,
  };
}

function registrationToRow(
  a: AssetRegistration,
): typeof assetRegistrations.$inferInsert {
  return {
    id: a.id,
    handoverPacketId: a.handoverPacketId,
    assetCode: a.assetCode,
    assetType: a.assetType,
    installedAt: a.installedAt,
    installedLocation: a.installedLocation,
    initialValue: a.initialValue,
    costCenter: a.costCenter,
    notes: a.notes,
  };
}
