/**
 * PR-26 — `asset_registrations` table.
 *
 * RID asset-system-compatible record of assets handed over from
 * construction to O&M. `cost_center` is denormalised text (no FK) so
 * the GFMIS cost-center catalogue can move independently.
 */

import { pgTable, real, text } from 'drizzle-orm/pg-core';

import { assetTypeEnum } from './enums';

export const assetRegistrations = pgTable('asset_registrations', {
  id: text('id').primaryKey(),
  handoverPacketId: text('handover_packet_id').notNull(),
  assetCode: text('asset_code').notNull(),
  assetType: assetTypeEnum('asset_type').notNull(),
  installedAt: text('installed_at').notNull(),
  installedLocation: text('installed_location').notNull(),
  initialValue: real('initial_value').notNull(),
  costCenter: text('cost_center'),
  notes: text('notes').notNull(),
});

export type AssetRegistrationRow = typeof assetRegistrations.$inferSelect;
export type AssetRegistrationInsert = typeof assetRegistrations.$inferInsert;
