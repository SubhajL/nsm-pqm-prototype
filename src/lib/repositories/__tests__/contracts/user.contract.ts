import { describe, expect, it, beforeEach } from 'vitest';
import type { User } from '@/types/admin';
import type { UserRepository } from '../../user.repository';

export function runUserRepositoryContract(
  makeRepo: () => Promise<UserRepository> | UserRepository,
) {
  describe('UserRepository contract', () => {
    let repo: UserRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleUser(id: string, departmentId = 'dept-x'): User {
      return {
        id,
        name: `User ${id}`,
        position: 'Test Position',
        role: 'Engineer',
        department: 'Test Dept',
        departmentId,
        status: 'active',
        projectCount: 0,
        email: `${id}@example.com`,
        phone: '02-000-0000',
      };
    }

    it('CRUD round-trip', async () => {
      const u = sampleUser('user-c-1');
      await repo.create(u);
      expect((await repo.findById(u.id))?.id).toBe(u.id);
      await repo.update(u.id, { status: 'suspended' });
      expect((await repo.findById(u.id))?.status).toBe('suspended');
      await repo.delete(u.id);
      expect(await repo.findById(u.id)).toBeNull();
    });

    it('listByDepartment filters correctly', async () => {
      await repo.create(sampleUser('user-c-2', 'dept-a'));
      await repo.create(sampleUser('user-c-3', 'dept-b'));
      const onlyA = await repo.listByDepartment('dept-a');
      expect(onlyA.every((u) => u.departmentId === 'dept-a')).toBe(true);
    });
  });
}
