import { pgTable, text } from 'drizzle-orm/pg-core';

import { permitStatusEnum } from './enums';

export const permits = pgTable('permits', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  permitType: text('permit_type').notNull(),
  title: text('title').notNull(),
  issuingAuthority: text('issuing_authority').notNull(),
  status: permitStatusEnum('status').notNull(),
  issuedAt: text('issued_at'),
  expiresAt: text('expires_at'),
  notes: text('notes').notNull(),
});

export type PermitRow = typeof permits.$inferSelect;
export type PermitInsert = typeof permits.$inferInsert;
