/**
 * PR-30a — `vendor_sows` (Statement of Work per phase).
 *
 * Mirrors `VendorSow` in `src/types/vendor-sow.ts`. `state` is a
 * Postgres enum so the state machine in `it-class-helpers.ts` and
 * downstream reporting stay consistent.
 *
 * No FK constraints (matches PR-23 / PR-25 convention) — application
 * code keeps integrity.
 */

import { integer, pgTable, text } from 'drizzle-orm/pg-core';

import { sowStateEnum } from './enums';

export const vendorSows = pgTable('vendor_sows', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  contractId: text('contract_id'),
  phase: text('phase').notNull(),
  scopeSummary: text('scope_summary').notNull(),
  uatCriteria: text('uat_criteria').notNull(),
  warrantyMonths: integer('warranty_months'),
  state: sowStateEnum('state').notNull(),
  signedAt: text('signed_at'),
  acceptedAt: text('accepted_at'),
  notes: text('notes').notNull(),
});

export type VendorSowRow = typeof vendorSows.$inferSelect;
export type VendorSowInsert = typeof vendorSows.$inferInsert;
