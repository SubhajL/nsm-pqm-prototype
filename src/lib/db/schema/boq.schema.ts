import { pgTable, real, text } from 'drizzle-orm/pg-core';

/**
 * BOQ items. `wbsId` is a soft reference — no FK because tests create
 * orphan BOQ items pointing at arbitrary `wbs-x` ids that need not have a
 * matching row.
 */
export const boqItems = pgTable('boq_items', {
  id: text('id').primaryKey(),
  wbsId: text('wbs_id').notNull(),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
});

export type BoqRow = typeof boqItems.$inferSelect;
export type BoqInsert = typeof boqItems.$inferInsert;
