import { pgTable, real, text } from 'drizzle-orm/pg-core';

import { procurementMethodEnum, procurementStateEnum } from './enums';

export const procurementPackages = pgTable('procurement_packages', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  state: procurementStateEnum('state').notNull(),
  budgetCeiling: real('budget_ceiling').notNull(),
  procurementMethod: procurementMethodEnum('procurement_method').notNull(),
  openedAt: text('opened_at'),
  closedAt: text('closed_at'),
  notes: text('notes').notNull(),
});

export type ProcurementPackageRow = typeof procurementPackages.$inferSelect;
export type ProcurementPackageInsert = typeof procurementPackages.$inferInsert;
