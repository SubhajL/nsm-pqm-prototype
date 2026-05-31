import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { changeRequests } from '@/lib/db/schema';
import type { ChangeRequestRepository } from '@/lib/repositories/change-request.repository';
import type { ChangeRequest } from '@/types/document';

export class DatabaseChangeRequestRepository implements ChangeRequestRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<ChangeRequest[]> {
    const rows = await this.db.select().from(changeRequests);
    return rows.map(rowToCr);
  }

  async listByProject(projectId: string): Promise<ChangeRequest[]> {
    const rows = await this.db.select().from(changeRequests).where(eq(changeRequests.projectId, projectId));
    return rows.map(rowToCr);
  }

  async findById(id: string): Promise<ChangeRequest | null> {
    const rows = await this.db.select().from(changeRequests).where(eq(changeRequests.id, id)).limit(1);
    return rows[0] ? rowToCr(rows[0]) : null;
  }

  async create(entity: ChangeRequest): Promise<ChangeRequest> {
    const [row] = await this.db.insert(changeRequests).values(crToRow(entity)).returning();
    return rowToCr(row);
  }

  async update(id: string, patch: Partial<ChangeRequest>): Promise<ChangeRequest | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: ChangeRequest = { ...existing, ...patch };
    const [row] = await this.db
      .update(changeRequests)
      .set(crToRow(merged))
      .where(eq(changeRequests.id, id))
      .returning();
    return row ? rowToCr(row) : null;
  }

  async delete(id: string): Promise<ChangeRequest | null> {
    const [row] = await this.db.delete(changeRequests).where(eq(changeRequests.id, id)).returning();
    return row ? rowToCr(row) : null;
  }
}

type Row = typeof changeRequests.$inferSelect;

function rowToCr(row: Row): ChangeRequest {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    reason: row.reason,
    budgetImpact: row.budgetImpact,
    scheduleImpact: row.scheduleImpact,
    linkedWbs: row.linkedWbs,
    priority: row.priority as ChangeRequest['priority'],
    status: row.status as ChangeRequest['status'],
    requestedBy: row.requestedBy,
    requestedAt: row.requestedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    attachments: row.attachments,
    workflow: row.workflow,
    // PR-27 — impact analysis + approval chain.
    impactScheduleDays: row.impactScheduleDays,
    impactBudgetTHB: row.impactBudgetTHB,
    impactScope: row.impactScope,
    approvedByChain: row.approvedByChain,
    rejectedReason: row.rejectedReason,
    decidedAt: row.decidedAt,
  };
}

function crToRow(cr: ChangeRequest): typeof changeRequests.$inferInsert {
  return {
    id: cr.id,
    projectId: cr.projectId,
    title: cr.title,
    reason: cr.reason,
    budgetImpact: cr.budgetImpact,
    scheduleImpact: cr.scheduleImpact,
    linkedWbs: cr.linkedWbs,
    priority: cr.priority,
    status: cr.status,
    requestedBy: cr.requestedBy,
    requestedAt: cr.requestedAt,
    approvedBy: cr.approvedBy,
    approvedAt: cr.approvedAt,
    attachments: cr.attachments,
    workflow: cr.workflow,
    // PR-27 — impact analysis + approval chain (defaults handled by the
    // column defaults, but we pass them explicitly so the merged patch in
    // `update()` propagates new values reliably).
    impactScheduleDays: cr.impactScheduleDays,
    impactBudgetTHB: cr.impactBudgetTHB,
    impactScope: cr.impactScope,
    approvedByChain: cr.approvedByChain,
    rejectedReason: cr.rejectedReason,
    decidedAt: cr.decidedAt,
  };
}
