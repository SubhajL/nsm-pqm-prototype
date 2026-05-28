import { getDailyReportStore } from '@/lib/daily-report-store';
import type { DailyReport } from '@/types/daily-report';
import type { Repository } from './types';

export interface DailyReportRepository extends Repository<DailyReport> {
  listByProject(projectId: string): Promise<DailyReport[]>;
}

export class InMemoryDailyReportRepository implements DailyReportRepository {
  async list(): Promise<DailyReport[]> {
    return getDailyReportStore();
  }

  async listByProject(projectId: string): Promise<DailyReport[]> {
    return getDailyReportStore().filter((report) => report.projectId === projectId);
  }

  async findById(id: string): Promise<DailyReport | null> {
    return getDailyReportStore().find((report) => report.id === id) ?? null;
  }

  async create(entity: DailyReport): Promise<DailyReport> {
    const store = getDailyReportStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<DailyReport>): Promise<DailyReport | null> {
    const store = getDailyReportStore();
    const index = store.findIndex((report) => report.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<DailyReport | null> {
    const store = getDailyReportStore();
    const index = store.findIndex((report) => report.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
