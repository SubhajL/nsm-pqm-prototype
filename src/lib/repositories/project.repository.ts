import { getProjectStore } from '@/lib/project-store';
import type { Project } from '@/types/project';
import type { Repository } from './types';

export interface ProjectRepository extends Repository<Project> {
  /** Convenience reader for the full array (no filter). */
  all(): Promise<Project[]>;
}

export class InMemoryProjectRepository implements ProjectRepository {
  async all(): Promise<Project[]> {
    return getProjectStore();
  }

  async list(): Promise<Project[]> {
    return getProjectStore();
  }

  async findById(id: string): Promise<Project | null> {
    return getProjectStore().find((project) => project.id === id) ?? null;
  }

  async create(entity: Project): Promise<Project> {
    const store = getProjectStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<Project>): Promise<Project | null> {
    const store = getProjectStore();
    const index = store.findIndex((project) => project.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<Project | null> {
    const store = getProjectStore();
    const index = store.findIndex((project) => project.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
