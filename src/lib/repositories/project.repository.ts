import type { Project } from '@/types/project';
import type { Repository } from './types';

export interface ProjectRepository extends Repository<Project> {
  /** Convenience reader for the full array (no filter). */
  all(): Promise<Project[]>;
}
