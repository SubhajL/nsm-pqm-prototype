export const dynamic = 'force-dynamic';

import { requireAdminUser } from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import type { AuditEvent } from '@/types/audit';

/**
 * GET /api/audit-logs/export
 *
 * Admin-only download endpoint for ก.พ.ร./auditor review. Returns the
 * full AuditEvent stream (with optional date/project filters) as either
 * JSON or CSV.
 *
 * Authorization: gated by `requireAdminUser()` at the top of the GET
 * handler (Phase 1). Middleware no longer enforces role/status at the
 * edge — it only checks cookie presence. The DB-backed guard here is
 * the canonical admin check.
 *
 * Query parameters:
 *   - `format`     'json' (default) | 'csv'
 *   - `from`       ISO timestamp lower bound (inclusive)
 *   - `to`         ISO timestamp upper bound (inclusive — full day)
 *   - `projectId`  filter to a single project (null events excluded)
 */
const CSV_COLUMNS: Array<keyof AuditEvent> = [
  'id',
  'timestamp',
  'requestId',
  'actorId',
  'actorRole',
  'action',
  'resourceType',
  'resourceId',
  'projectId',
  'before',
  'after',
  'decisionReason',
  'authorityBasis',
  'ipAddress',
  'userAgent',
];

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  // RFC 4180: quote always, escape inner quotes by doubling.
  return `"${str.replace(/"/g, '""')}"`;
}

function eventsToCsv(events: AuditEvent[]): string {
  const header = CSV_COLUMNS.map((column) => `"${column}"`).join(',');
  const rows = events.map((event) =>
    CSV_COLUMNS.map((column) => escapeCsvCell(event[column])).join(','),
  );
  return [header, ...rows].join('\r\n');
}

function buildFilename(format: 'json' | 'csv'): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `audit-events-${stamp}.${format}`;
}

export async function GET(request: Request) {
  const guard = await requireAdminUser();
  if (guard) return guard;
  const { searchParams } = new URL(request.url);
  const formatParam = (searchParams.get('format') ?? 'json').toLowerCase();
  const format: 'json' | 'csv' = formatParam === 'csv' ? 'csv' : 'json';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const projectId = searchParams.get('projectId');

  let events: AuditEvent[] = [...(await getRepositories().auditEvents.list())];

  if (from) {
    events = events.filter((event) => event.timestamp >= from);
  }
  if (to) {
    const upper = to.length === 10 ? `${to}T23:59:59` : to;
    events = events.filter((event) => event.timestamp <= upper);
  }
  if (projectId) {
    events = events.filter((event) => event.projectId === projectId);
  }

  // Sort newest-first to match the GET /api/audit-logs ordering.
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const filename = buildFilename(format);

  if (format === 'csv') {
    const csv = eventsToCsv(events);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(JSON.stringify(events, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
