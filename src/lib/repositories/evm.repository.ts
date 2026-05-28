import {
  ensureEvmProjectInitialized,
  getEvmProjectRegistry,
  getEvmStore,
} from '@/lib/evm-store';
import type { EVMDataPoint } from '@/types/evm';

/**
 * EVM has two coupled collections: an array of monthly data points keyed by
 * `projectId` and a parallel `Set<string>` of "registered" project ids that
 * lets newly-bootstrapped projects appear in EVM listings even before their
 * first data point is recorded.
 */
export interface EvmRepository {
  list(): Promise<EVMDataPoint[]>;
  listByProject(projectId: string): Promise<EVMDataPoint[]>;
  findById(id: string): Promise<EVMDataPoint | null>;
  findByProjectAndMonth(
    projectId: string,
    month: string,
  ): Promise<EVMDataPoint | null>;
  create(point: EVMDataPoint): Promise<EVMDataPoint>;
  delete(id: string): Promise<EVMDataPoint | null>;
  ensureProjectInitialized(projectId: string): Promise<void>;
  /** Snapshot helper — returns the registry as a plain array. */
  registeredProjectIds(): Promise<string[]>;
}

export class InMemoryEvmRepository implements EvmRepository {
  async list(): Promise<EVMDataPoint[]> {
    return getEvmStore();
  }

  async listByProject(projectId: string): Promise<EVMDataPoint[]> {
    return getEvmStore().filter((point) => point.projectId === projectId);
  }

  async findById(id: string): Promise<EVMDataPoint | null> {
    return getEvmStore().find((point) => point.id === id) ?? null;
  }

  async findByProjectAndMonth(
    projectId: string,
    month: string,
  ): Promise<EVMDataPoint | null> {
    return (
      getEvmStore().find(
        (point) => point.projectId === projectId && point.month === month,
      ) ?? null
    );
  }

  async create(point: EVMDataPoint): Promise<EVMDataPoint> {
    const store = getEvmStore();
    store.push(point);
    // Match the API route's prior behavior of keeping the array sorted by month.
    store.sort((a, b) => a.month.localeCompare(b.month));
    return point;
  }

  async delete(id: string): Promise<EVMDataPoint | null> {
    const store = getEvmStore();
    const index = store.findIndex((point) => point.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }

  async ensureProjectInitialized(projectId: string): Promise<void> {
    ensureEvmProjectInitialized(projectId);
  }

  async registeredProjectIds(): Promise<string[]> {
    return Array.from(getEvmProjectRegistry());
  }
}
