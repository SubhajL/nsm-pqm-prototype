import { integer, pgTable, real, text } from 'drizzle-orm/pg-core';

import { contractStateEnum, contractingModelEnum } from './enums';

export const awardedContracts = pgTable('awarded_contracts', {
  id: text('id').primaryKey(),
  procurementPackageId: text('procurement_package_id').notNull(),
  projectId: text('project_id').notNull(),
  contractNumber: text('contract_number').notNull(),
  contractorName: text('contractor_name').notNull(),
  contractorTaxId: text('contractor_tax_id'),
  awardAmount: real('award_amount').notNull(),
  contractingModel: contractingModelEnum('contracting_model').notNull(),
  state: contractStateEnum('state').notNull(),
  signedAt: text('signed_at'),
  effectiveDate: text('effective_date'),
  expirationDate: text('expiration_date'),
  warrantyMonths: integer('warranty_months'),
  notes: text('notes').notNull(),
});

export type AwardedContractRow = typeof awardedContracts.$inferSelect;
export type AwardedContractInsert = typeof awardedContracts.$inferInsert;
