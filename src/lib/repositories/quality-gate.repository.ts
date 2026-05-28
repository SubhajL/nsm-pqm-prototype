import { getQualityGateStore } from '@/lib/quality-gate-store';
import type { QualityGate } from '@/types/quality';
import type { Repository } from './types';

export interface QualityGateRepository extends Repository<QualityGate> {
  listByProject(projectId: string): Promise<QualityGate[]>;
}

export class InMemoryQualityGateRepository implements QualityGateRepository {
  async list(): Promise<QualityGate[]> {
    return getQualityGateStore();
  }

  async listByProject(projectId: string): Promise<QualityGate[]> {
    return getQualityGateStore().filter((gate) => gate.projectId === projectId);
  }

  async findById(id: string): Promise<QualityGate | null> {
    return getQualityGateStore().find((gate) => gate.id === id) ?? null;
  }

  async create(entity: QualityGate): Promise<QualityGate> {
    const store = getQualityGateStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<QualityGate>): Promise<QualityGate | null> {
    const store = getQualityGateStore();
    const index = store.findIndex((gate) => gate.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<QualityGate | null> {
    const store = getQualityGateStore();
    const index = store.findIndex((gate) => gate.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
