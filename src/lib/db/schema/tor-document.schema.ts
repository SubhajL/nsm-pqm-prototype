import { integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

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
}, (table) => ({
  // PR-34 — one row per (package, version); the version is assigned
  // server-side and the race loses with 23505 instead of duplicating.
  packageVersionUq: uniqueIndex('tor_documents_package_version_uq').on(
    table.procurementPackageId,
    table.version,
  ),
}));

export type TorDocumentRow = typeof torDocuments.$inferSelect;
export type TorDocumentInsert = typeof torDocuments.$inferInsert;
