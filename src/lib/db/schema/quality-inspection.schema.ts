import { boolean, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import type {
  InspectionChecklistItem,
  ITPStatus,
} from '@/types/quality';

/**
 * ITP items — one row per inspection-and-test plan line item.
 */
export const itpItems = pgTable('itp_items', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  sequence: integer('sequence').notNull(),
  item: text('item').notNull(),
  standard: text('standard').notNull(),
  inspectionType: text('inspection_type').notNull(), // 'H' | 'W' | 'RS'
  inspector: text('inspector').notNull(),
  status: text('status').$type<ITPStatus>().notNull(),
});

export type ItpRow = typeof itpItems.$inferSelect;
export type ItpInsert = typeof itpItems.$inferInsert;

/**
 * Inspection records — each one references an ITP item and embeds the
 * per-execution checklist as jsonb.
 */
export const inspectionRecords = pgTable('inspection_records', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  itpId: text('itp_id').notNull(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  inspectors: jsonb('inspectors').$type<string[]>().notNull().default([]),
  wbsLink: text('wbs_link').notNull(),
  standards: jsonb('standards').$type<string[]>().notNull().default([]),
  checklist: jsonb('checklist')
    .$type<InspectionChecklistItem[]>()
    .notNull()
    .default([]),
  overallResult: text('overall_result').notNull(),
  failReason: text('fail_reason').notNull(),
  autoNCR: boolean('auto_ncr').notNull(),
  workflowStatus: text('workflow_status').notNull(),
});

export type InspectionRow = typeof inspectionRecords.$inferSelect;
export type InspectionInsert = typeof inspectionRecords.$inferInsert;
