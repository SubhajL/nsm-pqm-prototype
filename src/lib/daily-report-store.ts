import seedDailyReports from '@/data/daily-reports.json';
import { generatedDailyReports } from '@/lib/generated-project-data';
import type { DailyReport } from '@/types/daily-report';

declare global {
  // eslint-disable-next-line no-var
  var __nsmDailyReportStore: DailyReport[] | undefined;
}

export function getDailyReportStore() {
  if (!globalThis.__nsmDailyReportStore) {
    globalThis.__nsmDailyReportStore = [
      ...(seedDailyReports as DailyReport[]),
      ...generatedDailyReports,
    ].map((report) => ({
      ...report,
      attachments: report.attachments ?? [],
      photos: (report.photos ?? []).map((photo) => ({
        ...photo,
        url: photo.url,
        mimeType: photo.mimeType,
        sizeBytes: photo.sizeBytes,
      })),
      statusHistory: report.statusHistory ?? [],
    }));
  }

  return globalThis.__nsmDailyReportStore;
}
