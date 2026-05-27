import { describe, expect, it } from 'vitest';

import {
  createDailyReportRequestSchema,
  updateDailyReportStatusRequestSchema,
} from './daily-report.schema';

describe('createDailyReportRequestSchema', () => {
  it('accepts a minimal payload with only projectId', () => {
    const result = createDailyReportRequestSchema.safeParse({
      projectId: 'PJ-2569-0012',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing projectId — the documented hot-spot at daily-reports/route.ts:56', () => {
    const result = createDailyReportRequestSchema.safeParse({
      date: '2026-05-27',
      weather: 'แดดจัด',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.projectId).toBeDefined();
    }
  });

  it('accepts a fully populated payload', () => {
    const result = createDailyReportRequestSchema.safeParse({
      projectId: 'PJ-2569-0012',
      date: '2026-05-27',
      weather: 'แดดจัด',
      temperature: 33,
      linkedWbs: ['wbs-1', 'wbs-2'],
      personnel: [{ type: 'ช่าง', count: 4 }],
      totalPersonnel: 4,
      activities: [
        {
          wbsId: 'wbs-1',
          task: 'เทคอนกรีต',
          quantity: 12,
          unit: 'ม³',
          cumulativeProgress: 0.6,
        },
      ],
      photos: [],
      attachments: [],
      issues: '',
      status: 'draft',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-string projectId', () => {
    const result = createDailyReportRequestSchema.safeParse({
      projectId: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateDailyReportStatusRequestSchema', () => {
  it.each(['draft', 'submitted', 'approved', 'rejected'] as const)(
    'accepts status %s',
    (status) => {
      const result = updateDailyReportStatusRequestSchema.safeParse({ status });
      expect(result.success).toBe(true);
    },
  );

  it('rejects unknown status', () => {
    const result = updateDailyReportStatusRequestSchema.safeParse({
      status: 'archived',
    });
    expect(result.success).toBe(false);
  });
});
