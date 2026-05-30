import type { Milestone } from '@/types/project';
import type { Repository } from './types';

export interface MilestoneRepository extends Repository<Milestone> {
  listByProject(projectId: string): Promise<Milestone[]>;
}
