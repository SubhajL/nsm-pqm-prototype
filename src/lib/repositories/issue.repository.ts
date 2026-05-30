import type { Issue } from '@/types/risk';
import type { Repository } from './types';

export interface IssueRepository extends Repository<Issue> {
  listByProject(projectId: string): Promise<Issue[]>;
}
