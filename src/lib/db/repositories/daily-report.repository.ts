import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { dailyReports } from '@/lib/db/schema';
import type { DailyReportRepository } from '@/lib/repositories/daily-report.repository';
import type { DailyReport } from '@/types/daily-report';

export class DatabaseDailyReportRepository implements DailyReportRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<DailyReport[]> {
    const rows = await this.db.select().from(dailyReports);
    return rows.map(rowToReport);
  }

  async listByProject(projectId: string): Promise<DailyReport[]> {
    const rows = await this.db.select().from(dailyReports).where(eq(dailyReports.projectId, projectId));
    return rows.map(rowToReport);
  }

  async findById(id: string): Promise<DailyReport | null> {
    const rows = await this.db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
    return rows[0] ? rowToReport(rows[0]) : null;
  }

  async create(entity: DailyReport): Promise<DailyReport> {
    const [row] = await this.db.insert(dailyReports).values(reportToRow(entity)).returning();
    return rowToReport(row);
  }

  async update(id: string, patch: Partial<DailyReport>): Promise<DailyReport | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged: DailyReport = { ...existing, ...patch };
    const [row] = await this.db
      .update(dailyReports)
      .set(reportToRow(merged))
      .where(eq(dailyReports.id, id))
      .returning();
    return row ? rowToReport(row) : null;
  }

  async delete(id: string): Promise<DailyReport | null> {
    const [row] = await this.db.delete(dailyReports).where(eq(dailyReports.id, id)).returning();
    return row ? rowToReport(row) : null;
  }
}

type Row = typeof dailyReports.$inferSelect;

function rowToReport(row: Row): DailyReport {
  return {
    id: row.id,
    projectId: row.projectId,
    reportNumber: row.reportNumber,
    date: row.date,
    weather: row.weather,
    temperature: row.temperature,
    linkedWbs: row.linkedWbs,
    personnel: row.personnel,
    totalPersonnel: row.totalPersonnel,
    activities: row.activities,
    photos: row.photos,
    attachments: row.attachments,
    issues: row.issues,
    signatures: row.signatures,
    status: row.status as DailyReport['status'],
    statusHistory: row.statusHistory,
  };
}

function reportToRow(report: DailyReport): typeof dailyReports.$inferInsert {
  return {
    id: report.id,
    projectId: report.projectId,
    reportNumber: report.reportNumber,
    date: report.date,
    weather: report.weather,
    temperature: report.temperature,
    linkedWbs: report.linkedWbs,
    personnel: report.personnel,
    totalPersonnel: report.totalPersonnel,
    activities: report.activities,
    photos: report.photos,
    attachments: report.attachments,
    issues: report.issues,
    signatures: report.signatures,
    status: report.status,
    statusHistory: report.statusHistory,
  };
}
