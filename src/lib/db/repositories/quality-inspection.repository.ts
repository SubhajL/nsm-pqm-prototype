import { eq } from 'drizzle-orm';

import type { Db } from '@/lib/db/client';
import { inspectionRecords, itpItems } from '@/lib/db/schema';
import type { QualityInspectionRepository } from '@/lib/repositories/quality-inspection.repository';
import type {
  InspectionsData,
  ITPStatus,
} from '@/types/quality';

type InspectionRecord = InspectionsData['inspectionRecords'][number];
type ItpItem = InspectionsData['itpItems'][number];

export class DatabaseQualityInspectionRepository implements QualityInspectionRepository {
  constructor(private readonly db: Db) {}

  async getData(): Promise<InspectionsData> {
    const [itps, inspections] = await Promise.all([
      this.listItpItems(),
      this.listInspections(),
    ]);
    return { itpItems: itps, inspectionRecords: inspections };
  }

  async listInspections(): Promise<InspectionRecord[]> {
    const rows = await this.db.select().from(inspectionRecords);
    return rows.map(rowToInspection);
  }

  async listInspectionsByProject(projectId: string): Promise<InspectionRecord[]> {
    const rows = await this.db
      .select()
      .from(inspectionRecords)
      .where(eq(inspectionRecords.projectId, projectId));
    return rows.map(rowToInspection);
  }

  async findInspectionById(id: string): Promise<InspectionRecord | null> {
    const rows = await this.db
      .select()
      .from(inspectionRecords)
      .where(eq(inspectionRecords.id, id))
      .limit(1);
    return rows[0] ? rowToInspection(rows[0]) : null;
  }

  async createInspection(record: InspectionRecord): Promise<InspectionRecord> {
    const [row] = await this.db
      .insert(inspectionRecords)
      .values(inspectionToRow(record))
      .returning();
    return rowToInspection(row);
  }

  async deleteInspection(id: string): Promise<InspectionRecord | null> {
    const [row] = await this.db
      .delete(inspectionRecords)
      .where(eq(inspectionRecords.id, id))
      .returning();
    return row ? rowToInspection(row) : null;
  }

  async listItpItems(): Promise<ItpItem[]> {
    const rows = await this.db.select().from(itpItems);
    return rows.map(rowToItp);
  }

  async listItpItemsByProject(projectId: string): Promise<ItpItem[]> {
    const rows = await this.db.select().from(itpItems).where(eq(itpItems.projectId, projectId));
    return rows.map(rowToItp);
  }
}

type InspectionRow = typeof inspectionRecords.$inferSelect;
type ItpRow = typeof itpItems.$inferSelect;

function rowToInspection(row: InspectionRow): InspectionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    itpId: row.itpId,
    title: row.title,
    date: row.date,
    time: row.time,
    inspectors: row.inspectors,
    wbsLink: row.wbsLink,
    standards: row.standards,
    checklist: row.checklist,
    overallResult: row.overallResult,
    failReason: row.failReason,
    autoNCR: row.autoNCR,
    workflowStatus: row.workflowStatus as InspectionRecord['workflowStatus'],
  };
}

function inspectionToRow(record: InspectionRecord): typeof inspectionRecords.$inferInsert {
  return {
    id: record.id,
    projectId: record.projectId,
    itpId: record.itpId,
    title: record.title,
    date: record.date,
    time: record.time,
    inspectors: record.inspectors,
    wbsLink: record.wbsLink,
    standards: record.standards,
    checklist: record.checklist,
    overallResult: record.overallResult,
    failReason: record.failReason,
    autoNCR: record.autoNCR,
    workflowStatus: record.workflowStatus,
  };
}

function rowToItp(row: ItpRow): ItpItem {
  return {
    id: row.id,
    projectId: row.projectId,
    sequence: row.sequence,
    item: row.item,
    standard: row.standard,
    inspectionType: row.inspectionType as ItpItem['inspectionType'],
    inspector: row.inspector,
    status: row.status as ITPStatus,
  };
}
