import { eq } from 'drizzle-orm';

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
