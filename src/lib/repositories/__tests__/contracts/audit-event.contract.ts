import { describe, expect, it, beforeEach } from 'vitest';
import type { AuditEventRepository } from '../../audit-event.repository';

export function runAuditEventRepositoryContract(
  makeRepo: () => Promise<AuditEventRepository> | AuditEventRepository,
) {
  describe('AuditEventRepository contract', () => {
    let repo: AuditEventRepository;

    beforeEach(async () => {
      repo = await makeRepo();
    });

    it('append returns the persisted event with id + timestamp', async () => {
      const before = await repo.list();
      const initialLength = before.length;
      const event = await repo.append({
        requestId: 'req-contract-1',
        actorId: 'user-contract',
        actorRole: 'Engineer',
        action: 'edit_test',
        resourceType: 'test',
        resourceId: 'test-1',
        projectId: null,
        before: null,
        after: { foo: 'bar' },
        decisionReason: null,
        authorityBasis: null,
        ipAddress: null,
        userAgent: null,
      });
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      const after = await repo.list();
      expect(after.length).toBe(initialLength + 1);
      expect(after[after.length - 1].action).toBe('edit_test');
    });

    it('exposes NO update/delete surface (append-only invariant)', () => {
      // Compile-time + runtime check: the repo must not advertise mutators.
      expect((repo as unknown as Record<string, unknown>).update).toBeUndefined();
      expect((repo as unknown as Record<string, unknown>).delete).toBeUndefined();
    });
  });
}
