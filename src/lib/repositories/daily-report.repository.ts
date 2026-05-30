import type { DailyReport } from '@/types/daily-report';
import type { Repository } from './types';

export interface DailyReportRepository extends Repository<DailyReport> {
  listByProject(projectId: string): Promise<DailyReport[]>;
}
