/**
 * PR-23 — `delivery_slips` (ใบส่งมอบงาน) table.
 *
 * Mirrors `DeliverySlip` in `src/types/delivery-slip.ts`. Attached
 * document ids are stored as JSONB array — they reference
 * `document_files.id` at the application level (no FK).
 */

import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

export const deliverySlips = pgTable('delivery_slips', {
  id: text('id').primaryKey(),
  workPeriodId: text('work_period_id').notNull(),
  submittedAt: text('submitted_at').notNull(),
  submittedBy: text('submitted_by').notNull(),
  attachedDocIds: jsonb('attached_doc_ids').$type<string[]>().notNull(),
  notes: text('notes').notNull(),
});

export type DeliverySlipRow = typeof deliverySlips.$inferSelect;
export type DeliverySlipInsert = typeof deliverySlips.$inferInsert;
