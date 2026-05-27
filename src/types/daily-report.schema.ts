import { z } from 'zod';

/**
 * Zod schemas for the daily-report domain.
 *
 * The POST route accepts a Partial<DailyReport>-ish body (server fills in
 * report number, id, timestamps, derived totals, status history). The PATCH
 * route only accepts a status transition + note. Both shapes are described
 * separately here.
 */

const dailyReportStatusSchema = z.enum([
  'draft',
  'submitted',
  'approved',
  'rejected',
]);

const personnelEntrySchema = z
  .object({
    type: z.string(),
    count: z.number(),
  })
  .strict();

const activityEntrySchema = z
  .object({
    wbsId: z.string().optional(),
    task: z.string(),
    quantity: z.number(),
    unit: z.string(),
    cumulativeProgress: z.number(),
  })
  .strict();

const photoEntrySchema = z
  .object({
    id: z.string().optional(),
    filename: z.string(),
    gpsLat: z.number().optional(),
    gpsLng: z.number().optional(),
    timestamp: z.string().optional(),
    url: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().optional(),
  })
  .strict();

const photoMetadataSchema = z
  .object({
    gpsLat: z.number().optional(),
    gpsLng: z.number().optional(),
    timestamp: z.string().optional(),
  })
  .strict();

const attachmentEntrySchema = z
  .object({
    id: z.string().optional(),
    filename: z.string(),
    url: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    uploadedAt: z.string().optional(),
  })
  .strict();

const signatureEntrySchema = z
  .object({
    name: z.string(),
    signed: z.boolean(),
    timestamp: z.string().nullable(),
  })
  .strict();

export const createDailyReportRequestSchema = z
  .object({
    projectId: z.string().min(1, 'projectId is required'),
    date: z.string().optional(),
    weather: z.string().optional(),
    temperature: z.number().optional(),
    linkedWbs: z.array(z.string()).optional(),
    personnel: z.array(personnelEntrySchema).optional(),
    totalPersonnel: z.number().optional(),
    activities: z.array(activityEntrySchema).optional(),
    photos: z.array(photoEntrySchema).optional(),
    photoMetadata: z.array(photoMetadataSchema).optional(),
    attachments: z.array(attachmentEntrySchema).optional(),
    issues: z.string().optional(),
    signatures: z
      .object({
        reporter: signatureEntrySchema.optional(),
        inspector: signatureEntrySchema.optional(),
      })
      .strict()
      .optional(),
    status: dailyReportStatusSchema.optional(),
  })
  .strict();

export type CreateDailyReportRequest = z.infer<
  typeof createDailyReportRequestSchema
>;

export const updateDailyReportStatusRequestSchema = z
  .object({
    status: dailyReportStatusSchema,
    note: z.string().optional(),
  })
  .strict();

export type UpdateDailyReportStatusRequest = z.infer<
  typeof updateDailyReportStatusRequestSchema
>;
