/**
 * PR-26 — `as_built_drawings` table.
 *
 * Per-packet register of as-built drawings handed over to the committee.
 * No FK constraints (matches PR-25 convention); application-level
 * integrity ties rows back to `handover_packets.id`.
 */

import { pgTable, text } from 'drizzle-orm/pg-core';

export const asBuiltDrawings = pgTable('as_built_drawings', {
  id: text('id').primaryKey(),
  handoverPacketId: text('handover_packet_id').notNull(),
  drawingNumber: text('drawing_number').notNull(),
  title: text('title').notNull(),
  documentFileId: text('document_file_id'),
  revision: text('revision').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  notes: text('notes').notNull(),
});

export type AsBuiltDrawingRow = typeof asBuiltDrawings.$inferSelect;
export type AsBuiltDrawingInsert = typeof asBuiltDrawings.$inferInsert;
