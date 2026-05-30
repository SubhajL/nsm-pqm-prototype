import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRequestId, recordAuditEvent } from '@/lib/audit-helpers';
import { getRepositories } from '@/lib/repositories';
import type { AuditEvent } from '@/types/audit';

// ---------------------------------------------------------------------------
// Audit helpers tests (PR-05, PR-21b rewrite)
//
// Verifies:
//   1. Legacy migration: seed records in audit-logs.json (text-record shape)
//      are converted to AuditEvent with requestId='legacy' on hydration.
//   2. recordAuditEvent picks up x-request-id from the request header and
//      attaches it to the persisted event.
//   3. recordAuditEvent attaches ip + user agent from request headers.
//   4. Snapshots (before/after) are cloned (no aliasing).
//
// PR-21b: the audit-log in-memory store is gone — durability comes from
// the Database repository. We seed once per Db (via `ensureDatabaseSeeded`)
// and test against the repo. The cookie-bound `getCurrentApiUser()` is
// mocked so tests stay hermetic.
// ---------------------------------------------------------------------------

vi.mock('@/lib/project-api-access', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/project-api-access')
  >('@/lib/project-api-access');
  return {
    ...actual,
    getCurrentApiUser: vi.fn(async () => null),
  };
});

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers,
  });
}

describe('audit-events repository — legacy migration', () => {
  it('converts text-record seed entries into AuditEvent shape with requestId="legacy"', async () => {
    const store = await getRepositories().auditEvents.list();
    expect(store.length).toBeGreaterThan(0);
    for (const event of store) {
      // Seed records are migrated to requestId='legacy' with null
      // before/after (lossy: old shape didn't carry snapshots). Runtime
      // appends from other tests in the same suite may have other
      // requestIds — but ALL seed entries should be 'legacy'.
      if (event.requestId !== 'legacy') continue;
      expect(event.before).toBeNull();
      expect(event.after).toBeNull();
      expect(typeof event.id).toBe('string');
      expect(typeof event.timestamp).toBe('string');
      expect(typeof event.action).toBe('string');
      expect(typeof event.resourceType).toBe('string');
      expect(typeof event.resourceId).toBe('string');
    }
  });

  it('preserves the original `action` text verbatim during migration', async () => {
    const store = await getRepositories().auditEvents.list();
    const log001 = store.find((event) => event.id === 'log-001');
    expect(log001).toBeDefined();
    expect(log001?.action).toBe('แก้ไข % Progress งาน 2.1');
    expect(log001?.resourceType).toBe('task');
    expect(log001?.actorId).toBe('user-002');
    expect(log001?.ipAddress).toBe('192.168.1.50');
    expect(log001?.userAgent).toBe('Win 11');
  });
});

describe('recordAuditEvent — request id propagation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('picks up x-request-id header and writes it into the event', async () => {
    const requestId = 'req-abc-123';
    const request = makeRequest({ 'x-request-id': requestId });

    const event = await recordAuditEvent(request, {
      action: 'edit_basic',
      resourceType: 'project',
      resourceId: 'proj-001',
      projectId: 'proj-001',
      before: null,
      after: { id: 'proj-001', status: 'in_progress' },
    });

    expect(event.requestId).toBe(requestId);

    const stored = (await getRepositories().auditEvents.list()).find(
      (entry) => entry.id === event.id,
    );
    expect(stored).toBeDefined();
    expect(stored?.requestId).toBe(requestId);
  });

  it('falls back to a synthetic request id when header is absent', async () => {
    const request = makeRequest();
    const event = await recordAuditEvent(request, {
      action: 'edit_basic',
      resourceType: 'project',
      resourceId: 'proj-002',
      projectId: 'proj-002',
    });

    expect(event.requestId).not.toBe('legacy');
    expect(event.requestId.length).toBeGreaterThan(0);
  });

  it('attaches ip address (x-forwarded-for first hop) and user agent', async () => {
    const request = makeRequest({
      'x-request-id': 'req-ip-test',
      'x-forwarded-for': '203.0.113.42, 10.0.0.1',
      'user-agent': 'TestRunner/1.0',
    });

    const event = await recordAuditEvent(request, {
      action: 'edit_basic',
      resourceType: 'project',
      resourceId: 'proj-003',
      projectId: 'proj-003',
    });

    expect(event.ipAddress).toBe('203.0.113.42');
    expect(event.userAgent).toBe('TestRunner/1.0');
  });

  it('snapshots before/after via structuredClone (no aliasing)', async () => {
    const request = makeRequest({ 'x-request-id': 'req-clone' });
    const after = { id: 'proj-004', status: 'in_progress', nested: { a: 1 } };

    const event = (await recordAuditEvent(request, {
      action: 'create_project',
      resourceType: 'project',
      resourceId: 'proj-004',
      projectId: 'proj-004',
      before: null,
      after,
    })) as AuditEvent;

    (after.nested as { a: number }).a = 999;

    const stored = (await getRepositories().auditEvents.list()).find(
      (entry) => entry.id === event.id,
    );
    expect(stored?.after).toBeDefined();
    expect((stored?.after as typeof after).nested.a).toBe(1);
  });
});

describe('getRequestId', () => {
  it('returns the x-request-id header when present', () => {
    const request = makeRequest({ 'x-request-id': 'req-xyz' });
    expect(getRequestId(request)).toBe('req-xyz');
  });

  it('returns null when no x-request-id header is present', () => {
    const request = makeRequest();
    expect(getRequestId(request)).toBeNull();
  });
});
