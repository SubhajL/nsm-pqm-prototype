import { asc } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { auditEvents } from '@/lib/db/schema';
import type { AuditEventRepository } from '@/lib/repositories/audit-event.repository';
import type { AuditEvent } from '@/types/audit';
import type { UserRole } from '@/types/admin';

/**
 * Append-only by contract — see the interface doc in
 * `@/lib/repositories/audit-event.repository.ts`. No update/delete surface.
 */
export class DatabaseAuditEventRepository implements AuditEventRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<AuditEvent[]> {
    const rows = await this.db.select().from(auditEvents).orderBy(asc(auditEvents.timestamp));
    return rows.map(rowToEvent);
  }

  async append(
    event: Omit<AuditEvent, 'id' | 'timestamp'> &
      Partial<Pick<AuditEvent, 'id' | 'timestamp'>>,
    options: { id?: string; timestamp?: string } = {},
  ): Promise<AuditEvent> {
    const id = options.id ?? event.id ?? `evt-${crypto.randomUUID()}`;
    const timestamp = options.timestamp ?? event.timestamp ?? new Date().toISOString();

    const full: AuditEvent = {
      id,
      timestamp,
      requestId: event.requestId,
      actorId: event.actorId,
      actorRole: event.actorRole,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      projectId: event.projectId,
      before: event.before,
      after: event.after,
      decisionReason: event.decisionReason,
      authorityBasis: event.authorityBasis,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    };

    const [row] = await this.db.insert(auditEvents).values(eventToRow(full)).returning();
    return rowToEvent(row);
  }
}

type Row = typeof auditEvents.$inferSelect;

function rowToEvent(row: Row): AuditEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    requestId: row.requestId,
    actorId: row.actorId,
    actorRole: row.actorRole as UserRole | null,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    projectId: row.projectId,
    before: row.before,
    after: row.after,
    decisionReason: row.decisionReason,
    authorityBasis: row.authorityBasis,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
  };
}

function eventToRow(event: AuditEvent): typeof auditEvents.$inferInsert {
  return {
    id: event.id,
    timestamp: event.timestamp,
    requestId: event.requestId,
    actorId: event.actorId,
    actorRole: event.actorRole,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    projectId: event.projectId,
    before: event.before,
    after: event.after,
    decisionReason: event.decisionReason,
    authorityBasis: event.authorityBasis,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
  };
}
