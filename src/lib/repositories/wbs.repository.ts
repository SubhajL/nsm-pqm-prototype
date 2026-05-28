import { getWbsStore } from '@/lib/wbs-store';
import type { WBSNode } from '@/hooks/useWBS';
import type { Repository } from './types';

export interface WbsRepository extends Repository<WBSNode> {
  listByProject(projectId: string): Promise<WBSNode[]>;
}

export class InMemoryWbsRepository implements WbsRepository {
  async list(): Promise<WBSNode[]> {
    return getWbsStore();
  }

  async listByProject(projectId: string): Promise<WBSNode[]> {
    return getWbsStore().filter((node) => node.projectId === projectId);
  }

  async findById(id: string): Promise<WBSNode | null> {
    return getWbsStore().find((node) => node.id === id) ?? null;
  }

  async create(entity: WBSNode): Promise<WBSNode> {
    const store = getWbsStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<WBSNode>): Promise<WBSNode | null> {
    const store = getWbsStore();
    const index = store.findIndex((node) => node.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<WBSNode | null> {
    const store = getWbsStore();
    const index = store.findIndex((node) => node.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
