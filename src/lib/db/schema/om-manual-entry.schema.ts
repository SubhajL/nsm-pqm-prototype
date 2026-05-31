/**
 * PR-26 — `om_manual_entries` table.
 *
 * One row per O&M manual section attached to a HandoverPacket. The
 * SOP 8.10 minimum is one entry per category; the completeness gate
 * (`isHandoverComplete`) consults the set of categories present.
 */

import { pgTable, text } from 'drizzle-orm/pg-core';

import { omManualCategoryEnum } from './enums';

export const omManualEntries = pgTable('om_manual_entries', {
  id: text('id').primaryKey(),
  handoverPacketId: text('handover_packet_id').notNull(),
  category: omManualCategoryEnum('category').notNull(),
  title: text('title').notNull(),
  documentFileId: text('document_file_id'),
  notes: text('notes').notNull(),
});

export type OmManualEntryRow = typeof omManualEntries.$inferSelect;
export type OmManualEntryInsert = typeof omManualEntries.$inferInsert;
