import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core';

/**
 * Notifications — insertion-ordered (the InMemory impl `unshift`s newest
 * first, so the API returns the newest first). The DB impl preserves this
 * with a synthetic auto-incrementing `seq` column ordered descending.
 */
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  /** Monotonic insertion sequence — DB equivalent of the InMemory `unshift`. */
  seq: integer('seq').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  projectId: text('project_id'),
  isRead: boolean('is_read').notNull(),
  timestamp: text('timestamp').notNull(),
  actionUrl: text('action_url'),
  severity: text('severity').notNull(),
});

export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;
