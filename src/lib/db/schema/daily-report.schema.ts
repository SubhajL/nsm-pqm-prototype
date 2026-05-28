import { integer, jsonb, pgTable, real, text } from 'drizzle-orm/pg-core';

import type {
  ActivityEntry,
  AttachmentEntry,
  DailyReportStatusHistoryEntry,
  PersonnelEntry,
  PhotoEntry,
} from '@/types/daily-report';

/**
 * Daily reports — the nested arrays (personnel, activities, photos,
 * attachments, statusHistory) all ride along as jsonb. Reads are always
 * "full report at a time" so embedding is the natural fit.
 *
 * Signatures live in a single jsonb column rather than two flat columns
 * to match the `{ reporter, inspector }` shape the UI expects.
 */
export const dailyReports = pgTable('daily_reports', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  reportNumber: integer('report_number').notNull(),
  date: text('date').notNull(),
  weather: text('weather').notNull(),
  temperature: real('temperature').notNull(),
  linkedWbs: jsonb('linked_wbs').$type<string[]>().notNull().default([]),
  personnel: jsonb('personnel').$type<PersonnelEntry[]>().notNull().default([]),
  totalPersonnel: integer('total_personnel').notNull(),
  activities: jsonb('activities').$type<ActivityEntry[]>().notNull().default([]),
  photos: jsonb('photos').$type<PhotoEntry[]>().notNull().default([]),
  attachments: jsonb('attachments').$type<AttachmentEntry[]>().notNull().default([]),
  issues: text('issues').notNull(),
  signatures: jsonb('signatures')
    .$type<{
      reporter: { name: string; signed: boolean; timestamp: string | null };
      inspector: { name: string; signed: boolean; timestamp: string | null };
    }>()
    .notNull(),
  status: text('status').notNull(),
  statusHistory: jsonb('status_history')
    .$type<DailyReportStatusHistoryEntry[]>()
    .notNull()
    .default([]),
});

export type DailyReportRow = typeof dailyReports.$inferSelect;
export type DailyReportInsert = typeof dailyReports.$inferInsert;
