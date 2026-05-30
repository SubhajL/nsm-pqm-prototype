import type { QualityGate } from '@/types/quality';
import type { Repository } from './types';

export interface QualityGateRepository extends Repository<QualityGate> {
  listByProject(projectId: string): Promise<QualityGate[]>;
}
