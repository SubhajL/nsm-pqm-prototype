import { getMilestoneStore } from '@/lib/milestone-store';
import type { Milestone } from '@/types/project';
import type { Repository } from './types';

export interface MilestoneRepository extends Repository<Milestone> {
  listByProject(projectId: string): Promise<Milestone[]>;
}

export class InMemoryMilestoneRepository implements MilestoneRepository {
  async list(): Promise<Milestone[]> {
    return getMilestoneStore();
  }

  async listByProject(projectId: string): Promise<Milestone[]> {
    return getMilestoneStore().filter((milestone) => milestone.projectId === projectId);
  }

  async findById(id: string): Promise<Milestone | null> {
    return getMilestoneStore().find((milestone) => milestone.id === id) ?? null;
  }

  async create(entity: Milestone): Promise<Milestone> {
    const store = getMilestoneStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<Milestone>): Promise<Milestone | null> {
    const store = getMilestoneStore();
    const index = store.findIndex((milestone) => milestone.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<Milestone | null> {
    const store = getMilestoneStore();
    const index = store.findIndex((milestone) => milestone.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
