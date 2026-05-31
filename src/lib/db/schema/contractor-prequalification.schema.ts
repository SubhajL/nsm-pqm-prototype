import { jsonb, pgTable, real, text } from 'drizzle-orm/pg-core';

export const contractorPrequalifications = pgTable(
  'contractor_prequalifications',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    contractorName: text('contractor_name').notNull(),
    contractorTaxId: text('contractor_tax_id'),
    prequalifiedAt: text('prequalified_at').notNull(),
    validUntil: text('valid_until'),
    ahpScore: real('ahp_score'),
    /** string[] of DocumentFile.id values; stored as jsonb. */
    evidenceDocIds: jsonb('evidence_doc_ids').notNull(),
    notes: text('notes').notNull(),
  },
);

export type ContractorPrequalificationRow =
  typeof contractorPrequalifications.$inferSelect;
export type ContractorPrequalificationInsert =
  typeof contractorPrequalifications.$inferInsert;
