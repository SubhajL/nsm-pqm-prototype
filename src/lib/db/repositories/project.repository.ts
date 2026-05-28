import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import type { ProjectRepository } from '@/lib/repositories/project.repository';
import type { Project } from '@/types/project';

/**
 * Drizzle-backed `ProjectRepository` — satisfies the PR-18 interface.
 * Behavioral equivalence with `InMemoryProjectRepository` is asserted by
 * the shared contract test in `__tests__/database-contract.test.ts`.
 */
export class DatabaseProjectRepository implements ProjectRepository {
  constructor(private readonly db: Db) {}

  async all(): Promise<Project[]> {
    return this.list();
  }

  async list(): Promise<Project[]> {
    const rows = await this.db.select().from(projects);
    return rows.map(rowToProject);
  }

  async findById(id: string): Promise<Project | null> {
    const rows = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return rows[0] ? rowToProject(rows[0]) : null;
  }

  async create(entity: Project): Promise<Project> {
    const [row] = await this.db.insert(projects).values(projectToRow(entity)).returning();
    return rowToProject(row);
  }

  async update(id: string, patch: Partial<Project>): Promise<Project | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: Project = { ...existing, ...patch };
    const [row] = await this.db
      .update(projects)
      .set(projectToRow(merged))
      .where(eq(projects.id, id))
      .returning();
    return row ? rowToProject(row) : null;
  }

  async delete(id: string): Promise<Project | null> {
    const [row] = await this.db.delete(projects).where(eq(projects.id, id)).returning();
    return row ? rowToProject(row) : null;
  }
}

type ProjectRow = typeof projects.$inferSelect;
type ProjectInsert = typeof projects.$inferInsert;

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameEn: row.nameEn,
    type: row.type as Project['type'],
    deliveryMethod: row.deliveryMethod,
    contractingModel: row.contractingModel,
    sizeTier: row.sizeTier,
    status: row.status as Project['status'],
    budget: row.budget,
    progress: row.progress,
    scheduleHealth: (row.scheduleHealth ?? undefined) as Project['scheduleHealth'],
    startDate: row.startDate,
    endDate: row.endDate,
    duration: row.duration,
    spiValue: row.spiValue,
    cpiValue: row.cpiValue,
    managerId: row.managerId,
    managerName: row.managerName,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    openIssues: row.openIssues,
    highRisks: row.highRisks,
    currentMilestone: row.currentMilestone,
    totalMilestones: row.totalMilestones,
    currentLifecycleStage: row.currentLifecycleStage,
    lifecycleStageHistory: row.lifecycleStageHistory,
  };
}

function projectToRow(project: Project): ProjectInsert {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    nameEn: project.nameEn,
    type: project.type,
    deliveryMethod: project.deliveryMethod,
    contractingModel: project.contractingModel,
    sizeTier: project.sizeTier,
    status: project.status,
    budget: project.budget,
    progress: project.progress,
    scheduleHealth: project.scheduleHealth ?? null,
    startDate: project.startDate,
    endDate: project.endDate,
    duration: project.duration,
    spiValue: project.spiValue,
    cpiValue: project.cpiValue,
    managerId: project.managerId,
    managerName: project.managerName,
    departmentId: project.departmentId,
    departmentName: project.departmentName,
    openIssues: project.openIssues,
    highRisks: project.highRisks,
    currentMilestone: project.currentMilestone,
    totalMilestones: project.totalMilestones,
    currentLifecycleStage: project.currentLifecycleStage,
    lifecycleStageHistory: project.lifecycleStageHistory,
  };
}
