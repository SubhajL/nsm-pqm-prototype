import { getRiskStore } from '@/lib/risk-store';
import type { Risk } from '@/types/risk';
import type { Repository } from './types';

export interface RiskRepository extends Repository<Risk> {
  listByProject(projectId: string): Promise<Risk[]>;
}

export class InMemoryRiskRepository implements RiskRepository {
  async list(): Promise<Risk[]> {
    return getRiskStore();
  }

  async listByProject(projectId: string): Promise<Risk[]> {
    return getRiskStore().filter((risk) => risk.projectId === projectId);
  }

  async findById(id: string): Promise<Risk | null> {
    return getRiskStore().find((risk) => risk.id === id) ?? null;
  }

  async create(entity: Risk): Promise<Risk> {
    const store = getRiskStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<Risk>): Promise<Risk | null> {
    const store = getRiskStore();
    const index = store.findIndex((risk) => risk.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<Risk | null> {
    const store = getRiskStore();
    const index = store.findIndex((risk) => risk.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
