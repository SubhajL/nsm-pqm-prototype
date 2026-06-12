import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { projectApprovalRequests } from '@/lib/db/schema';
import type { ProjectApprovalRequestRepository } from '@/lib/repositories/project-approval-request.repository';
import type {
  ApprovalRequestApproverRole,
  ApprovalRequestState,
  ProjectApprovalRequest,
} from '@/types/project-approval-request';

export class DatabaseProjectApprovalRequestRepository
  implements ProjectApprovalRequestRepository
{
  constructor(private readonly db: Db) {}

  async list(): Promise<ProjectApprovalRequest[]> {
    const rows = await this.db.select().from(projectApprovalRequests);
    return rows.map(rowToEntity);
  }

  async listByProject(projectId: string): Promise<ProjectApprovalRequest[]> {
    const rows = await this.db
      .select()
      .from(projectApprovalRequests)
      .where(eq(projectApprovalRequests.projectId, projectId));
    return rows.map(rowToEntity);
  }

  async findById(id: string): Promise<ProjectApprovalRequest | null> {
    const rows = await this.db
      .select()
      .from(projectApprovalRequests)
      .where(eq(projectApprovalRequests.id, id))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async create(entity: ProjectApprovalRequest): Promise<ProjectApprovalRequest> {
    const [row] = await this.db
      .insert(projectApprovalRequests)
      .values(entityToRow(entity))
      .returning();
    return rowToEntity(row);
  }

  async update(
    id: string,
    patch: Partial<ProjectApprovalRequest>,
  ): Promise<ProjectApprovalRequest | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: ProjectApprovalRequest = { ...existing, ...patch };
    const [row] = await this.db
      .update(projectApprovalRequests)
      .set(entityToRow(merged))
      .where(eq(projectApprovalRequests.id, id))
      .returning();
    return row ? rowToEntity(row) : null;
  }


  /**
   * PR-34 — compare-and-swap update: applies `patch` only while the
   * row's state still equals `expected`. The UPDATE itself carries
   * `WHERE id = ? AND state = ?`, so a transition raced by another
   * writer matches zero rows and returns null instead of clobbering.
   * Callers map null to 409 STATE_CONFLICT.
   */
  async updateIfState(
    id: string,
    expected: ProjectApprovalRequest['state'],
    patch: Partial<ProjectApprovalRequest>,
  ): Promise<ProjectApprovalRequest | null> {
    const existing = await this.findById(id);
    if (!existing || existing.state !== expected) return null;
    const merged: ProjectApprovalRequest = { ...existing, ...patch };
    const [row] = await this.db
      .update(projectApprovalRequests)
      .set(entityToRow(merged))
      .where(and(eq(projectApprovalRequests.id, id), eq(projectApprovalRequests.state, expected)))
      .returning();
    return row ? rowToEntity(row) : null;
  }


  /**
   * PR-34 — CAS on state + jsonb_array_length(decision_history). See
   * the interface doc: protects the append-only history from the
   * same-state `request_changes` race that a state-only CAS misses.
   */
  async updateIfStateAndHistoryLength(
    id: string,
    expectedState: ProjectApprovalRequest['state'],
    expectedHistoryLength: number,
    patch: Partial<ProjectApprovalRequest>,
  ): Promise<ProjectApprovalRequest | null> {
    const existing = await this.findById(id);
    if (
      !existing ||
      existing.state !== expectedState ||
      existing.decisionHistory.length !== expectedHistoryLength
    ) {
      return null;
    }
    const merged: ProjectApprovalRequest = { ...existing, ...patch };
    const [row] = await this.db
      .update(projectApprovalRequests)
      .set(entityToRow(merged))
      .where(
        and(
          eq(projectApprovalRequests.id, id),
          eq(projectApprovalRequests.state, expectedState),
          sql`jsonb_array_length(${projectApprovalRequests.decisionHistory}) = ${expectedHistoryLength}`,
        ),
      )
      .returning();
    return row ? rowToEntity(row) : null;
  }

  async delete(id: string): Promise<ProjectApprovalRequest | null> {
    const [row] = await this.db
      .delete(projectApprovalRequests)
      .where(eq(projectApprovalRequests.id, id))
      .returning();
    return row ? rowToEntity(row) : null;
  }
}

type Row = typeof projectApprovalRequests.$inferSelect;

function rowToEntity(row: Row): ProjectApprovalRequest {
  return {
    id: row.id,
    projectId: row.projectId,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt,
    state: row.state as ApprovalRequestState,
    currentApproverRole: row.currentApproverRole as
      | ApprovalRequestApproverRole
      | null,
    decisionHistory: row.decisionHistory,
    notes: row.notes,
  };
}

function entityToRow(
  entity: ProjectApprovalRequest,
): typeof projectApprovalRequests.$inferInsert {
  return {
    id: entity.id,
    projectId: entity.projectId,
    submittedBy: entity.submittedBy,
    submittedAt: entity.submittedAt,
    state: entity.state,
    currentApproverRole: entity.currentApproverRole,
    decisionHistory: entity.decisionHistory,
    notes: entity.notes,
  };
}
