import { integer, pgTable, real, text } from 'drizzle-orm/pg-core';

export const contractAmendments = pgTable('contract_amendments', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull(),
  amendmentNumber: integer('amendment_number').notNull(),
  amendedAt: text('amended_at').notNull(),
  amountDelta: real('amount_delta').notNull(),
  scheduleDeltaDays: integer('schedule_delta_days').notNull(),
  reason: text('reason').notNull(),
  approvedBy: text('approved_by').notNull(),
  documentFileId: text('document_file_id'),
});

export type ContractAmendmentRow = typeof contractAmendments.$inferSelect;
export type ContractAmendmentInsert = typeof contractAmendments.$inferInsert;
