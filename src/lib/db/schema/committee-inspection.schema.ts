/**
 * PR-23 — `committee_inspections` table.
 *
 * Mirrors `CommitteeInspection` in `src/types/committee-inspection.ts`.
 *
 * `result` is stored as plain `text` (not enum) — see the docstring in
 * `enums.ts`. Inspectors and document ids are JSONB arrays.
 */

import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

export const committeeInspections = pgTable('committee_inspections', {
  id: text('id').primaryKey(),
  workPeriodId: text('work_period_id').notNull(),
  inspectedAt: text('inspected_at').notNull(),
  inspectors: jsonb('inspectors').$type<string[]>().notNull(),
  result: text('result').notNull(),
  conditions: text('conditions').notNull(),
  documentIds: jsonb('document_ids').$type<string[]>().notNull(),
});

export type CommitteeInspectionRow = typeof committeeInspections.$inferSelect;
export type CommitteeInspectionInsert = typeof committeeInspections.$inferInsert;
