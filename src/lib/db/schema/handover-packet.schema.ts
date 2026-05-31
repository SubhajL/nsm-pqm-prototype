/**
 * PR-26 — `handover_packets` table.
 *
 * Mirrors `HandoverPacket` in `src/types/handover-packet.ts`. `state` is a
 * Postgres enum so cross-table constraints (future) can reference it
 * cleanly; the `contract_id` link is a plain text column rather than a
 * FK to keep migration ordering independent of the PR-24 contract
 * table (matches PR-25 / PR-23 convention).
 */

import { pgTable, text } from 'drizzle-orm/pg-core';

import { handoverStateEnum } from './enums';

export const handoverPackets = pgTable('handover_packets', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  contractId: text('contract_id'),
  state: handoverStateEnum('state').notNull(),
  submittedAt: text('submitted_at'),
  acceptedAt: text('accepted_at'),
  warrantyStartDate: text('warranty_start_date'),
  warrantyEndDate: text('warranty_end_date'),
  acceptedBy: text('accepted_by'),
  notes: text('notes').notNull(),
});

export type HandoverPacketRow = typeof handoverPackets.$inferSelect;
export type HandoverPacketInsert = typeof handoverPackets.$inferInsert;
