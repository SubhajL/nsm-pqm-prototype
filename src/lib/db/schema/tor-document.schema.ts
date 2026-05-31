import { integer, pgTable, text } from 'drizzle-orm/pg-core';

export const torDocuments = pgTable('tor_documents', {
  id: text('id').primaryKey(),
  procurementPackageId: text('procurement_package_id').notNull(),
  version: integer('version').notNull(),
  scopeSummary: text('scope_summary').notNull(),
  technicalRequirements: text('technical_requirements').notNull(),
  deliverySchedule: text('delivery_schedule').notNull(),
  evaluationCriteria: text('evaluation_criteria').notNull(),
  documentFileId: text('document_file_id'),
  approvedAt: text('approved_at'),
});

export type TorDocumentRow = typeof torDocuments.$inferSelect;
export type TorDocumentInsert = typeof torDocuments.$inferInsert;
