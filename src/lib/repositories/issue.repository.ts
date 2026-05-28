import { getIssueStore } from '@/lib/issue-store';
import type { Issue } from '@/types/risk';
import type { Repository } from './types';

export interface IssueRepository extends Repository<Issue> {
  listByProject(projectId: string): Promise<Issue[]>;
}

export class InMemoryIssueRepository implements IssueRepository {
  async list(): Promise<Issue[]> {
    return getIssueStore();
  }

  async listByProject(projectId: string): Promise<Issue[]> {
    return getIssueStore().filter((issue) => issue.projectId === projectId);
  }

  async findById(id: string): Promise<Issue | null> {
    return getIssueStore().find((issue) => issue.id === id) ?? null;
  }

  async create(entity: Issue): Promise<Issue> {
    const store = getIssueStore();
    store.push(entity);
    return entity;
  }

  async update(id: string, patch: Partial<Issue>): Promise<Issue | null> {
    const store = getIssueStore();
    const index = store.findIndex((issue) => issue.id === id);
    if (index < 0) return null;
    Object.assign(store[index], patch);
    return store[index];
  }

  async delete(id: string): Promise<Issue | null> {
    const store = getIssueStore();
    const index = store.findIndex((issue) => issue.id === id);
    if (index < 0) return null;
    const [removed] = store.splice(index, 1);
    return removed;
  }
}
