import type { EnvironmentalAssessment } from '@/types/environmental-assessment';

import type { Repository } from './types';

export interface EnvironmentalAssessmentRepository
  extends Repository<EnvironmentalAssessment> {
  listByProject(projectId: string): Promise<EnvironmentalAssessment[]>;
}
