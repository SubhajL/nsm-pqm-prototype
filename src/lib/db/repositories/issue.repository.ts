import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { issues } from '@/lib/db/schema';
import type { IssueRepository } from '@/lib/repositories/issue.repository';
import type { Issue } from '@/types/risk';

export class DatabaseIssueRepository implements IssueRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Issue[]> {
    const rows = await this.db.select().from(issues);
    return rows.map(rowToIssue);
  }

  async listByProject(projectId: string): Promise<Issue[]> {
    const rows = await this.db.select().from(issues).where(eq(issues.projectId, projectId));
    return rows.map(rowToIssue);
  }

  async findById(id: string): Promise<Issue | null> {
    const rows = await this.db.select().from(issues).where(eq(issues.id, id)).limit(1);
    return rows[0] ? rowToIssue(rows[0]) : null;
  }

  async create(entity: Issue): Promise<Issue> {
    const [row] = await this.db.insert(issues).values(issueToRow(entity)).returning();
    return rowToIssue(row);
  }

  async update(id: string, patch: Partial<Issue>): Promise<Issue | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: Issue = { ...existing, ...patch };
    const [row] = await this.db
      .update(issues)
      .set(issueToRow(merged))
      .where(eq(issues.id, id))
      .returning();
    return row ? rowToIssue(row) : null;
  }

  async delete(id: string): Promise<Issue | null> {
    const [row] = await this.db.delete(issues).where(eq(issues.id, id)).returning();
    return row ? rowToIssue(row) : null;
  }
}

type Row = typeof issues.$inferSelect;

function rowToIssue(row: Row): Issue {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    severity: row.severity as Issue['severity'],
    status: row.status as Issue['status'],
    assignee: row.assignee,
    linkedWbs: row.linkedWbs,
    slaHours: row.slaHours,
    resolution: row.resolution ?? undefined,
    progress: row.progress ?? undefined,
    tags: row.tags ?? undefined,
    sourceInspectionId: row.sourceInspectionId ?? undefined,
    sourceRiskId: row.sourceRiskId ?? undefined,
    sourceType: (row.sourceType ?? undefined) as Issue['sourceType'],
    createdAt: row.createdAt,
    closedAt: row.closedAt,
  };
}

function issueToRow(issue: Issue): typeof issues.$inferInsert {
  return {
    id: issue.id,
    projectId: issue.projectId,
    title: issue.title,
    severity: issue.severity,
    status: issue.status,
    assignee: issue.assignee,
    linkedWbs: issue.linkedWbs,
    slaHours: issue.slaHours,
    resolution: issue.resolution ?? null,
    progress: issue.progress ?? null,
    tags: issue.tags ?? [],
    sourceInspectionId: issue.sourceInspectionId ?? null,
    sourceRiskId: issue.sourceRiskId ?? null,
    sourceType: issue.sourceType ?? null,
    createdAt: issue.createdAt,
    closedAt: issue.closedAt,
  };
}
