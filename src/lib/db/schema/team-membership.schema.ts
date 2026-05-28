import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

/**
 * Composite primary key on (projectId, userId) mirrors the in-memory
 * `(projectId, userId)` uniqueness invariant enforced by
 * `addProjectMembership`.
 */
export const teamMemberships = pgTable(
  'team_memberships',
  {
    projectId: text('project_id').notNull(),
    userId: text('user_id').notNull(),
    assignmentRole: text('assignment_role').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
  }),
);

export type TeamMembershipRow = typeof teamMemberships.$inferSelect;
export type TeamMembershipInsert = typeof teamMemberships.$inferInsert;
