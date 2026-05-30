import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetAuditEventStoreForTests,
  appendAuditEvent,
  getAuditEventStore,
} from '@/lib/audit-log-store';
import { getRequestId, recordAuditEvent } from '@/lib/audit-helpers';
import type { AuditEvent } from '@/types/audit';

// ---------------------------------------------------------------------------
// Audit helpers tests (PR-05)
//
// Verifies:
//   1. Legacy migration: seed records in audit-logs.json (text-record shape)
//      are converted to AuditEvent with requestId='legacy' on hydration.
//   2. Append-only invariant: no exported mutator updates/removes past
//      events; new ones append; the read view is a snapshot/copy.
//   3. recordAuditEvent picks up x-request-id from the request header and
//      attaches it to the persisted event.
//   4. recordAuditEvent attaches ip + user agent from request headers.
//
// Post-PR-21: blob snapshot retired. We mock the cookie-bound
// `getCurrentApiUser()` so tests stay hermetic.
// ---------------------------------------------------------------------------

vi.mock('@/lib/project-api-access', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/project-api-access')
  >('@/lib/project-api-access');
  return {
    ...actual,
    getCurrentApiUser: vi.fn(() => null),
  };
});

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers,
  });
}

describe('audit-log-store — legacy migration', () => {
  beforeEach(() => {
    __resetAuditEventStoreForTests();
  });

  it('converts text-record seed entries into AuditEvent shape with requestId="legacy"', () => {
    const store = getAuditEventStore();
    expect(store.length).toBeGreaterThan(0);
    for (const event of store) {
      expect(event).toMatchObject({
        requestId: 'legacy',
        before: null,
        after: null,
      });
      expect(typeof event.id).toBe('string');
      expect(typeof event.timestamp).toBe('string');
      expect(typeof event.action).toBe('string');
      expect(typeof event.resourceType).toBe('string');
      expect(typeof event.resourceId).toBe('string');
    }
  });

  it('preserves the original `action` text verbatim during migration', () => {
    const store = getAuditEventStore();
    // The seed has Thai action text; just assert one specific known seed
    // record migrated correctly.
    const log001 = store.find((event) => event.id === 'log-001');
    expect(log001).toBeDefined();
    expect(log001?.action).toBe('แก้ไข % Progress งาน 2.1');
    expect(log001?.resourceType).toBe('task');
    expect(log001?.actorId).toBe('user-002');
    expect(log001?.ipAddress).toBe('192.168.1.50');
    expect(log001?.userAgent).toBe('Win 11');
  });

  it('preserves "system" actorId as null', () => {
    // Append a synthetic seed-like event to verify direct shape semantics.
    const event = appendAuditEvent({
      requestId: 'legacy',
      actorId: null,
      actorRole: null,
      action: 'system_action',
      resourceType: 'system',
      resourceId: 'system',
      projectId: null,
      before: null,
      after: null,
      decisionReason: null,
      authorityBasis: null,
      ipAddress: null,
      userAgent: null,
    });
    expect(event.actorId).toBeNull();
  });
});

describe('audit-log-store — append-only invariant', () => {
  beforeEach(() => {
    __resetAuditEventStoreForTests();
  });

  it('append returns a new event with auto-generated id + timestamp', () => {
    const event = appendAuditEvent({
      requestId: 'req-1',
      actorId: 'user-001',
      actorRole: 'System Admin',
      action: 'edit_basic',
      resourceType: 'project',
      resourceId: 'proj-001',
      projectId: 'proj-001',
      before: { status: 'planning' },
      after: { status: 'in_progress' },
      decisionReason: null,
      authorityBasis: null,
      ipAddress: null,
      userAgent: null,
    });

    expect(event.id).toMatch(/^evt-/);
    expect(event.timestamp).toBeDefined();
    expect(new Date(event.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('exports no helper that updates a persisted event in-place', async () => {
    const storeModule = await import('@/lib/audit-log-store');
    // Only the documented test reset + append should mutate state. The
    // public surface MUST NOT include update/delete helpers.
    expect(Object.keys(storeModule)).not.toContain('updateAuditEvent');
    expect(Object.keys(storeModule)).not.toContain('removeAuditEvent');
    expect(Object.keys(storeModule)).not.toContain('deleteAuditEvent');
  });

  it('once appended, an event is never silently removed from the store', () => {
    const before = getAuditEventStore().length;
    appendAuditEvent({
      requestId: 'req-test',
      actorId: 'user-x',
      actorRole: 'Engineer',
      action: 'edit_wbs',
      resourceType: 'wbs',
      resourceId: 'wbs-1',
      projectId: 'proj-001',
      before: null,
      after: { id: 'wbs-1' },
      decisionReason: null,
      authorityBasis: null,
      ipAddress: null,
      userAgent: null,
    });
    const after = getAuditEventStore().length;
    expect(after).toBe(before + 1);
    // Append again, count grows monotonically.
    appendAuditEvent({
      requestId: 'req-test-2',
      actorId: 'user-x',
      actorRole: 'Engineer',
      action: 'edit_wbs',
      resourceType: 'wbs',
      resourceId: 'wbs-2',
      projectId: 'proj-001',
      before: null,
      after: { id: 'wbs-2' },
      decisionReason: null,
      authorityBasis: null,
      ipAddress: null,
      userAgent: null,
    });
    expect(getAuditEventStore().length).toBe(after + 1);
  });
});

describe('recordAuditEvent — request id propagation', () => {
  beforeEach(() => {
    __resetAuditEventStoreForTests();
  });

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

    // And the event is in the store (single emit per call).
    const stored = getAuditEventStore().find((entry) => entry.id === event.id);
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

    // Synthetic fallback is non-empty and clearly distinguishable from 'legacy'.
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

    // Mutate the original — the persisted snapshot must NOT change.
    (after.nested as { a: number }).a = 999;

    const stored = getAuditEventStore().find((entry) => entry.id === event.id);
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
