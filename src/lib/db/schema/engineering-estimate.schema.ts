import { numeric, pgTable, real, text } from 'drizzle-orm/pg-core';

import { engineeringEstimateBasisEnum } from './enums';

export const engineeringEstimates = pgTable('engineering_estimates', {
  id: text('id').primaryKey(),
  procurementPackageId: text('procurement_package_id').notNull(),
  boqId: text('boq_id'),
  basis: engineeringEstimateBasisEnum('basis').notNull(),
  estimatedTotal: numeric('estimated_total', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  contingencyPercent: real('contingency_percent').notNull(),
  estimatedBy: text('estimated_by').notNull(),
  estimatedAt: text('estimated_at').notNull(),
  notes: text('notes').notNull(),
});

export type EngineeringEstimateRow = typeof engineeringEstimates.$inferSelect;
export type EngineeringEstimateInsert =
  typeof engineeringEstimates.$inferInsert;
