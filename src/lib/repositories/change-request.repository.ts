import type { ChangeRequest } from '@/types/document';
import type { Repository } from './types';

export interface ChangeRequestRepository extends Repository<ChangeRequest> {
  listByProject(projectId: string): Promise<ChangeRequest[]>;
}
