import type { Dt6Area, KnowledgeAreaNote } from '@/types/knowledge-area-note';

import type { Repository } from './types';

export interface KnowledgeAreaNoteRepository
  extends Repository<KnowledgeAreaNote> {
  listByProject(projectId: string): Promise<KnowledgeAreaNote[]>;
  /**
   * Returns the highest-version note for `(projectId, area)` or null when
   * no note has been authored yet. Used by the POST route to compute the
   * next version monotonically.
   */
  findLatestByProjectArea(
    projectId: string,
    area: Dt6Area,
  ): Promise<KnowledgeAreaNote | null>;
}
