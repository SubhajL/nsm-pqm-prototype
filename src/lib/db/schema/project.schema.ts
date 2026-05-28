import { integer, jsonb, pgTable, real, text } from 'drizzle-orm/pg-core';

import {
  contractingModelEnum,
  deliveryMethodEnum,
  projectSizeTierEnum,
  ridLifecycleStageEnum,
} from './enums';
import type { LifecycleStageHistoryEntry } from '@/types/project';

/**
 * Projects table — mirrors the full `Project` shape from `@/types/project`
 * including the PR-13/14/15/16 additions: deliveryMethod, contractingModel,
 * sizeTier, currentLifecycleStage and the append-only lifecycleStageHistory.
 *
 * `lifecycleStageHistory` is stored as jsonb — it is conceptually a child
 * table, but the access pattern is always "read with the project" and the
 * history is small (<10 entries per project), so embedding is cheaper than
 * a join.
 */
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en').notNull(),
  type: text('type').notNull(), // ProjectType — text (legacy values beyond RID class)
  deliveryMethod: deliveryMethodEnum('delivery_method').notNull(),
  contractingModel: contractingModelEnum('contracting_model'),
  sizeTier: projectSizeTierEnum('size_tier').notNull(),
  status: text('status').notNull(),
  budget: real('budget').notNull(),
  progress: real('progress').notNull(),
  scheduleHealth: text('schedule_health'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  duration: integer('duration').notNull(),
  spiValue: real('spi_value').notNull(),
  cpiValue: real('cpi_value').notNull(),
  managerId: text('manager_id').notNull(),
  managerName: text('manager_name').notNull(),
  departmentId: text('department_id').notNull(),
  departmentName: text('department_name').notNull(),
  openIssues: integer('open_issues').notNull(),
  highRisks: integer('high_risks').notNull(),
  currentMilestone: integer('current_milestone').notNull(),
  totalMilestones: integer('total_milestones').notNull(),
  currentLifecycleStage: ridLifecycleStageEnum('current_lifecycle_stage').notNull(),
  lifecycleStageHistory: jsonb('lifecycle_stage_history')
    .$type<LifecycleStageHistoryEntry[]>()
    .notNull(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
