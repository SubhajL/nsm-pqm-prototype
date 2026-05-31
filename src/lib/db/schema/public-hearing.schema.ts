import { integer, pgTable, text } from 'drizzle-orm/pg-core';

export const publicHearings = pgTable('public_hearings', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  heldAt: text('held_at').notNull(),
  location: text('location').notNull(),
  attendeeCount: integer('attendee_count').notNull(),
  summary: text('summary').notNull(),
  signedMinuteDocId: text('signed_minute_doc_id'),
});

export type PublicHearingRow = typeof publicHearings.$inferSelect;
export type PublicHearingInsert = typeof publicHearings.$inferInsert;
