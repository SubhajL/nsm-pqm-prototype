import { and, eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { teamMemberships } from '@/lib/db/schema';
import type { TeamMembershipRepository } from '@/lib/repositories/team-membership.repository';
import type {
  ProjectAssignmentRole,
  ProjectMembership,
} from '@/lib/repositories/team-membership.repository';

export class DatabaseTeamMembershipRepository implements TeamMembershipRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<ProjectMembership[]> {
    const rows = await this.db.select().from(teamMemberships);
    return rows.map(rowToMembership);
  }

  async listByProject(projectId: string): Promise<ProjectMembership[]> {
    const rows = await this.db
      .select()
      .from(teamMemberships)
      .where(eq(teamMemberships.projectId, projectId));
    return rows.map(rowToMembership);
  }

  async has(projectId: string, userId: string): Promise<boolean> {
    return (await this.find(projectId, userId)) !== null;
  }

  async find(projectId: string, userId: string): Promise<ProjectMembership | null> {
    const rows = await this.db
      .select()
      .from(teamMemberships)
      .where(
        and(eq(teamMemberships.projectId, projectId), eq(teamMemberships.userId, userId)),
      )
      .limit(1);
    return rows[0] ? rowToMembership(rows[0]) : null;
  }

  async add(membership: ProjectMembership): Promise<boolean> {
    if (await this.has(membership.projectId, membership.userId)) {
      return false;
    }
    await this.db.insert(teamMemberships).values({
      projectId: membership.projectId,
      userId: membership.userId,
      assignmentRole: membership.assignmentRole,
    });
    return true;
  }

  async remove(projectId: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(teamMemberships)
      .where(
        and(eq(teamMemberships.projectId, projectId), eq(teamMemberships.userId, userId)),
      )
      .returning();
    return deleted.length > 0;
  }
}

type Row = typeof teamMemberships.$inferSelect;

function rowToMembership(row: Row): ProjectMembership {
  return {
    projectId: row.projectId,
    userId: row.userId,
    assignmentRole: row.assignmentRole as ProjectAssignmentRole,
  };
}
