import type { EVMDataPoint } from '@/types/evm';

/**
 * EVM has two coupled collections: an array of monthly data points keyed by
 * `projectId` and a parallel registry of "registered" project ids that lets
 * newly-bootstrapped projects appear in EVM listings even before their first
 * data point is recorded.
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
