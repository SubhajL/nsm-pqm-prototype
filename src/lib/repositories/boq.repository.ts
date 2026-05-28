import { getBoqStore } from '@/lib/boq-store';
import type { BOQItem } from '@/hooks/useBOQ';
import type { Repository } from './types';

export interface BoqRepository extends Repository<BOQItem> {
  listByWbs(wbsId: string): Promise<BOQItem[]>;
}

export class InMemoryBoqRepository implements BoqRepository {
  async list(): Promise<BOQItem[]> {
    return getBoqStore();
  }

  async listByWbs(wbsId: string): Promise<BOQItem[]> {
    return getBoqStore().filter((item) => item.wbsId === wbsId);
  }

  async findById(id: string): Promise<BOQItem | null> {
    return getBoqStore().find((item) => item.id === id) ?? null;
  }

  async create(entity: BOQItem): Promise<BOQItem> {
    const store = getBoqStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<BOQItem>): Promise<BOQItem | null> {
    const store = getBoqStore();
    const index = store.findIndex((item) => item.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<BOQItem | null> {
    const store = getBoqStore();
    const index = store.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
