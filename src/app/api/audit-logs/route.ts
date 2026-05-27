import { getAuditEventStore } from '@/lib/audit-log-store';
import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import { getUserStore } from '@/lib/user-store';
import type { AuditEvent } from '@/types/audit';

/**
 * Map the new structured `resourceType` back to the human-readable
 * `module` labels the legacy admin UI displays. These match the keys in
 * `MODULE_COLORS` from `src/types/admin.ts`. Anything not in this map
 * falls through to a capitalized version of the resourceType.
 */
const RESOURCE_TYPE_TO_LEGACY_MODULE: Record<string, string> = {
  task: 'Task',
  gantt_task: 'Task',
  wbs: 'Task',
  boq: 'Task',
  daily_report: 'Daily Report',
  session: 'Login',
  document_file: 'Document',
  document_folder: 'Document',
  document: 'Document',
  risk: 'Risk',
  quality_inspection: 'Quality',
  quality: 'Quality',
  change_request: 'Approval',
  approval: 'Approval',
  issue: 'Issue',
  project_membership: 'Team',
  team: 'Team',
  project: 'Approval',
  user: 'Admin',
  org_unit: 'Admin',
  admin: 'Admin',
};

function legacyModuleFor(resourceType: string): string {
  const mapped = RESOURCE_TYPE_TO_LEGACY_MODULE[resourceType.toLowerCase()];
  if (mapped) return mapped;
  // Fallback: Title-case the first segment so unknown resource types still
  // show something meaningful in the UI.
  const firstSegment = resourceType.split('_')[0] ?? resourceType;
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}

/**
 * Augment the structured `AuditEvent` with legacy alias fields
 * (`userName`, `ip`, `os`, `module`) so the existing admin UI built
 * against the old `AuditLog` shape continues to render correctly. The
 * full structured fields remain on the same object — clients can
 * progressively migrate to reading `actorId`/`actorRole`/`resourceType`
 * instead of the aliases.
 */
function withLegacyAliases(event: AuditEvent, userNamesById: Map<string, string>) {
  return {
    ...event,
    userId: event.actorId ?? 'system',
    userName: event.actorId ? userNamesById.get(event.actorId) ?? event.actorId : 'System',
    ip: event.ipAddress ?? '-',
    os: event.userAgent ?? '-',
    module: legacyModuleFor(event.resourceType),
  };
}

/**
 * GET /api/audit-logs
 *
 * Returns the immutable AuditEvent stream (PR-05). Items are sorted
 * newest-first by timestamp.
 *
 * For back-compat with the legacy admin audit UI, each item is also
 * augmented with `userName`, `ip`, `os`, and `module` alias fields
 * derived from the new structured fields. New consumers should read the
 * structured fields directly.
 *
 * Query filters (all optional, AND-combined):
 *   - `module`     legacy alias for `resourceType` (case-insensitive); kept
 *                  for back-compat with admin UI built against the old
 *                  shape. Falls back to `resourceType` if no match.
 *   - `resourceType` exact match on `AuditEvent.resourceType`
 *   - `action`     exact match on `AuditEvent.action`
 *   - `projectId`  exact match on `AuditEvent.projectId`
 *   - `actorId`    exact match on `AuditEvent.actorId`
 *   - `search`     substring match across actorId, userName, action,
 *                  resourceType, ipAddress (lower-cased)
 *   - `startDate`  ISO date — keep events with timestamp >= startDate
 *   - `endDate`    ISO date — keep events with timestamp <= endDate+T23:59:59
 */
export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const store: AuditEvent[] = [...getAuditEventStore()];

  const userNamesById = new Map(getUserStore().map((user) => [user.id, user.name]));

  const { searchParams } = new URL(request.url);
  const moduleFilter = searchParams.get('module');
  const resourceType = searchParams.get('resourceType')?.toLowerCase();
  const action = searchParams.get('action');
  const projectId = searchParams.get('projectId');
  const actorId = searchParams.get('actorId');
  const search = searchParams.get('search')?.toLowerCase();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let filtered = [...store];

  if (resourceType) {
    filtered = filtered.filter((event) => event.resourceType.toLowerCase() === resourceType);
  }

  if (moduleFilter) {
    // Legacy module filter — match against the mapped legacy label so the
    // existing admin UI's "Module" dropdown keeps working with the
    // post-migration data.
    filtered = filtered.filter(
      (event) => legacyModuleFor(event.resourceType) === moduleFilter,
    );
  }

  if (action) {
    filtered = filtered.filter((event) => event.action === action);
  }

  if (projectId) {
    filtered = filtered.filter((event) => event.projectId === projectId);
  }

  if (actorId) {
    filtered = filtered.filter((event) => event.actorId === actorId);
  }

  if (search) {
    filtered = filtered.filter((event) => {
      const userName = event.actorId ? userNamesById.get(event.actorId) ?? '' : '';
      return (
        (event.actorId ?? '').toLowerCase().includes(search) ||
        userName.toLowerCase().includes(search) ||
        event.action.toLowerCase().includes(search) ||
        event.resourceType.toLowerCase().includes(search) ||
        (event.ipAddress ?? '').toLowerCase().includes(search)
      );
    });
  }

  if (startDate) {
    filtered = filtered.filter((event) => event.timestamp >= startDate);
  }

  if (endDate) {
    const endDateEnd = endDate + 'T23:59:59';
    filtered = filtered.filter((event) => event.timestamp <= endDateEnd);
  }

  // Sort newest first
  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const serialized = filtered.map((event) => withLegacyAliases(event, userNamesById));

  return Response.json({ status: 'success', data: serialized });
}
