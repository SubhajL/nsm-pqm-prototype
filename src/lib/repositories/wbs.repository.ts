import type { WBSNode } from '@/hooks/useWBS';
import type { Repository } from './types';

export interface WbsRepository extends Repository<WBSNode> {
  listByProject(projectId: string): Promise<WBSNode[]>;
}
