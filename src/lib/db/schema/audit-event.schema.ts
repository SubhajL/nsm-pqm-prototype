import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

/**
 * Append-only audit event log. `actor_id` + `timestamp` are the two most
 * common query axes (per-actor activity feed, time-window reports), so we
 * index them. `requestId` is indexed separately for request-trace lookups.
 *
 * The repository surface intentionally has NO update or delete — see
 * `audit-event.repository.ts` for the invariant note.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    timestamp: text('timestamp').notNull(),
    requestId: text('request_id').notNull(),
    actorId: text('actor_id'),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    projectId: text('project_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    decisionReason: text('decision_reason'),
    authorityBasis: text('authority_basis'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => ({
    actorTimestampIdx: index('audit_events_actor_ts_idx').on(
      table.actorId,
      table.timestamp,
    ),
    requestIdIdx: index('audit_events_request_id_idx').on(table.requestId),
  }),
);

export type AuditEventRow = typeof auditEvents.$inferSelect;
export type AuditEventInsert = typeof auditEvents.$inferInsert;
