import { integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import type { GateChecklistItem, GateStatus } from '@/types/quality';

/**
 * Quality gates — checklist is embedded as jsonb (always read with the gate).
 */
export const qualityGates = pgTable('quality_gates', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  number: integer('number').notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en').notNull(),
  status: text('status').$type<GateStatus>().notNull(),
  date: text('date'),
  checklist: jsonb('checklist').$type<GateChecklistItem[]>().default([]),
});

export type QualityGateRow = typeof qualityGates.$inferSelect;
export type QualityGateInsert = typeof qualityGates.$inferInsert;
