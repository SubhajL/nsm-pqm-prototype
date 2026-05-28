/**
 * PR-20 — Dual-write wrapper unit tests.
 *
 * Verifies:
 *   - Read methods delegate to PRIMARY only (secondary untouched).
 *   - Write methods call BOTH primary and secondary.
 *   - Secondary failures DO NOT throw — primary's result is returned and
 *     the failure is logged + audit-emitted.
 *   - Method-name heuristic: `findById/list/get*` skipped, `create/update/delete/append/lockVersion`
 *     duplicated.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditEvent } from '@/types/audit';
import type { AuditEventRepository } from '../audit-event.repository';
import { dualWrite, recordSecondaryWriteFailure } from '../dual-write';

interface FakeKV {
  list(): Promise<string[]>;
  findById(id: string): Promise<string | null>;
  getData(): Promise<{ size: number }>;
  create(value: string): Promise<string>;
  update(id: string, next: string): Promise<string>;
  delete(id: string): Promise<string>;
  append(value: string): Promise<void>;
  lockVersion(id: string): Promise<boolean>;
}

class FakeKVImpl implements FakeKV {
  public calls: Array<{ method: string; args: unknown[] }> = [];
  private store: string[] = [];

  async list() {
    this.calls.push({ method: 'list', args: [] });
    return [...this.store];
  }
  async findById(id: string) {
    this.calls.push({ method: 'findById', args: [id] });
    return this.store.find((s) => s === id) ?? null;
  }
  async getData() {
    this.calls.push({ method: 'getData', args: [] });
    return { size: this.store.length };
  }
  async create(value: string) {
    this.calls.push({ method: 'create', args: [value] });
    this.store.push(value);
    return value;
  }
  async update(id: string, next: string) {
    this.calls.push({ method: 'update', args: [id, next] });
    return next;
  }
  async delete(id: string) {
    this.calls.push({ method: 'delete', args: [id] });
    return id;
  }
  async append(value: string) {
    this.calls.push({ method: 'append', args: [value] });
  }
  async lockVersion(id: string) {
    this.calls.push({ method: 'lockVersion', args: [id] });
    return true;
  }
}

class CapturingAuditRepo implements AuditEventRepository {
  public events: AuditEvent[] = [];
  async list() {
    return [...this.events];
  }
  async append(
    event: Omit<AuditEvent, 'id' | 'timestamp'> &
      Partial<Pick<AuditEvent, 'id' | 'timestamp'>>,
  ) {
    const full: AuditEvent = {
      id: event.id ?? `evt-${this.events.length}`,
      timestamp: event.timestamp ?? new Date().toISOString(),
      requestId: event.requestId,
      actorId: event.actorId,
      actorRole: event.actorRole,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      projectId: event.projectId,
      before: event.before,
      after: event.after,
      decisionReason: event.decisionReason,
      authorityBasis: event.authorityBasis,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    };
    this.events.push(full);
    return full;
  }
}

describe('dualWrite', () => {
  let primary: FakeKVImpl;
  let secondary: FakeKVImpl;
  let audit: CapturingAuditRepo;
  let wrapped: FakeKV;

  beforeEach(() => {
    primary = new FakeKVImpl();
    secondary = new FakeKVImpl();
    audit = new CapturingAuditRepo();
    wrapped = dualWrite<FakeKV>(primary, secondary, {
      domain: 'test',
      auditRepo: audit,
    });
  });

  describe('read passthrough', () => {
    it('list() touches PRIMARY only', async () => {
      await wrapped.list();
      expect(primary.calls.map((c) => c.method)).toEqual(['list']);
      expect(secondary.calls).toEqual([]);
    });

    it('findById() touches PRIMARY only', async () => {
      await wrapped.findById('x');
      expect(primary.calls.map((c) => c.method)).toEqual(['findById']);
      expect(secondary.calls).toEqual([]);
    });

    it('getData() touches PRIMARY only', async () => {
      await wrapped.getData();
      expect(primary.calls.map((c) => c.method)).toEqual(['getData']);
      expect(secondary.calls).toEqual([]);
    });
  });

  describe('write duplication', () => {
    it('create() calls BOTH primary and secondary with same args', async () => {
      const out = await wrapped.create('alpha');
      expect(out).toBe('alpha');
      expect(primary.calls).toEqual([{ method: 'create', args: ['alpha'] }]);
      expect(secondary.calls).toEqual([{ method: 'create', args: ['alpha'] }]);
    });

    it('update() calls BOTH', async () => {
      await wrapped.update('id1', 'next');
      expect(primary.calls[0]).toEqual({ method: 'update', args: ['id1', 'next'] });
      expect(secondary.calls[0]).toEqual({ method: 'update', args: ['id1', 'next'] });
    });

    it('delete() calls BOTH', async () => {
      await wrapped.delete('id1');
      expect(primary.calls[0].method).toBe('delete');
      expect(secondary.calls[0].method).toBe('delete');
    });

    it('append() calls BOTH', async () => {
      await wrapped.append('x');
      expect(primary.calls[0].method).toBe('append');
      expect(secondary.calls[0].method).toBe('append');
    });

    it('lockVersion() calls BOTH (extra-write-methods list)', async () => {
      await wrapped.lockVersion('doc-1');
      expect(primary.calls[0].method).toBe('lockVersion');
      expect(secondary.calls[0].method).toBe('lockVersion');
    });
  });

  describe('secondary failure handling', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('primary still returns success when secondary throws', async () => {
      vi.spyOn(secondary, 'create').mockRejectedValueOnce(new Error('DB down'));
      const out = await wrapped.create('zeta');
      expect(out).toBe('zeta');
      expect(primary.calls.some((c) => c.method === 'create' && c.args[0] === 'zeta')).toBe(true);
    });

    it('logs the secondary failure', async () => {
      vi.spyOn(secondary, 'update').mockRejectedValueOnce(new Error('timeout'));
      await wrapped.update('id', 'next');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[dual-write:test] secondary update failed'),
        expect.any(Error),
      );
    });

    it('emits an audit event with action=dual_write_secondary_failed', async () => {
      vi.spyOn(secondary, 'create').mockRejectedValueOnce(new Error('boom'));
      await wrapped.create('omega');
      // Audit is fire-and-forget — give it a microtask to settle.
      await new Promise((r) => setImmediate(r));
      const failEvents = audit.events.filter(
        (e) => e.action === 'dual_write_secondary_failed',
      );
      expect(failEvents).toHaveLength(1);
      expect(failEvents[0].resourceType).toBe('persistence_backend');
      expect(failEvents[0].resourceId).toBe('test:create');
      expect(failEvents[0].after).toMatchObject({
        domain: 'test',
        method: 'create',
        errorMessage: 'boom',
      });
      expect(failEvents[0].authorityBasis).toContain('PR-20');
    });

    it('does NOT emit an audit event when no auditRepo is configured', async () => {
      const noAuditWrapped = dualWrite<FakeKV>(primary, secondary, {
        domain: 'audit-itself',
      });
      vi.spyOn(secondary, 'create').mockRejectedValueOnce(new Error('boom'));
      const result = await noAuditWrapped.create('x');
      expect(result).toBe('x');
      // No audit repo passed → audit.events stays empty.
      expect(audit.events).toEqual([]);
      // But the failure was still logged.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('does not throw when the audit emission itself fails', async () => {
      const brokenAudit: AuditEventRepository = {
        async list() {
          return [];
        },
        async append() {
          throw new Error('audit broken');
        },
      };
      const brokenWrapped = dualWrite<FakeKV>(primary, secondary, {
        domain: 'test',
        auditRepo: brokenAudit,
      });
      vi.spyOn(secondary, 'create').mockRejectedValueOnce(new Error('first'));
      const out = await brokenWrapped.create('p');
      expect(out).toBe('p');
      // Allow the catch chain to settle.
      await new Promise((r) => setImmediate(r));
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('secondary missing methods', () => {
    it('silently skips when secondary lacks the method', async () => {
      // Build a secondary that lacks `lockVersion`.
      const partialSecondary = {
        async list() {
          return [];
        },
        async findById() {
          return null;
        },
        async getData() {
          return { size: 0 };
        },
        async create(v: string) {
          return v;
        },
        async update(_id: string, n: string) {
          return n;
        },
        async delete(id: string) {
          return id;
        },
        async append() {
          return;
        },
        // no lockVersion
      } as unknown as FakeKV;

      const w = dualWrite<FakeKV>(primary, partialSecondary, {
        domain: 'test',
        auditRepo: audit,
      });
      const out = await w.lockVersion('x');
      expect(out).toBe(true);
      // No audit event, no thrown error.
      expect(audit.events).toEqual([]);
    });
  });
});

describe('recordSecondaryWriteFailure', () => {
  it('builds an audit event with the expected shape', async () => {
    const audit = new CapturingAuditRepo();
    await recordSecondaryWriteFailure(audit, 'projects', 'update', ['id-1', { x: 1 }], new Error('nope'));
    expect(audit.events).toHaveLength(1);
    const ev = audit.events[0];
    expect(ev.action).toBe('dual_write_secondary_failed');
    expect(ev.resourceType).toBe('persistence_backend');
    expect(ev.resourceId).toBe('projects:update');
    expect(ev.after).toMatchObject({
      domain: 'projects',
      method: 'update',
      argCount: 2,
      errorName: 'Error',
      errorMessage: 'nope',
    });
  });
});
