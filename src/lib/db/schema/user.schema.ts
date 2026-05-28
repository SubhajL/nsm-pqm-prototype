import { integer, pgTable, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: text('position').notNull(),
  role: text('role').notNull(),
  department: text('department').notNull(),
  departmentId: text('department_id').notNull(),
  status: text('status').notNull(),
  projectCount: integer('project_count').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
