export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { Issue } from '@/types/risk';
import {
  createIssueRequestSchema,
  deleteIssueRequestSchema,
  updateIssueRequestSchema,
  updateIssueStatusRequestSchema,
} from '@/types/risk.schema';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store = await getRepositories().issues.list();
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let filtered = store.filter((i) => i.projectId === params.projectId);

  if (status) {
    filtered = filtered.filter((i) => i.status === status);
  }

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.issues.list();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createIssueRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!(await canPerformProjectAction(await getCurrentApiUser(), params.projectId, 'edit_issue'))) {
    return forbiddenResponse('edit_issue');
  }

  const newIssue: Issue = {
    id: `ISS-${String(store.length + 1).padStart(3, '0')}`,
    projectId: params.projectId,
    title: body.title.trim(),
    severity: body.severity ?? 'medium',
    status: body.status ?? 'open',
    assignee: body.assignee.trim(),
    linkedWbs: body.linkedWbs?.trim() || '-',
    slaHours: Number(body.slaHours ?? 48),
    resolution: body.resolution?.trim(),
    progress: body.progress,
    tags: body.tags ?? [],
    createdAt: body.createdAt ?? new Date().toISOString().split('T')[0],
    closedAt: null,
  };

  await repos.issues.create(newIssue);
  await recordAuditEvent(request, {
    action: 'edit_issue',
    resourceType: 'issue',
    resourceId: newIssue.id,
    projectId: params.projectId,
    before: null,
    after: newIssue,
    decisionReason: `create (severity=${newIssue.severity})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_issue',
  });

  return Response.json({ status: 'success', data: newIssue }, { status: 201 });
}

/**
 * Issue PATCH accepts two body shapes:
 *   - Legacy status-only: `{ issueId, status }` (kept for back-compat with
 *     the existing UpdateIssueStatus hook). When body has an `issueId` key
 *     we take this branch.
 *   - Full edit (PR-L): `{ id, title?, severity?, status?, assignee?,
 *     linkedWbs?, slaHours?, resolution?, progress?, tags? }`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);

  // Legacy status-only PATCH (preserved for the existing
  // useUpdateIssueStatus hook).
  if (
    typeof rawBody === 'object' &&
    rawBody !== null &&
    'issueId' in (rawBody as Record<string, unknown>)
  ) {
    const parsed = parseRequestBody(updateIssueStatusRequestSchema, rawBody);
    if (!parsed.success) return parsed.response;
    const { issueId, status: newStatus } = parsed.data;

    const forbidden = await requireProjectAccess(params.projectId);
    if (forbidden) return forbidden;

    if (!(await canPerformProjectAction(await getCurrentApiUser(), params.projectId, 'edit_issue'))) {
      return forbiddenResponse('edit_issue');
    }

    const existing = await repos.issues.findById(issueId);
    if (!existing || existing.projectId !== params.projectId) {
      return Response.json(
        { status: 'error', error: { code: 'NOT_FOUND', message: 'Issue not found' } },
        { status: 404 },
      );
    }

    const beforeIssue = { ...existing };
    const updated = await repos.issues.update(issueId, {
      status: newStatus,
      closedAt:
        newStatus === 'closed' ? new Date().toISOString().split('T')[0] : existing.closedAt,
    });
    const after = updated ?? existing;
    await recordAuditEvent(request, {
      action: 'edit_issue',
      resourceType: 'issue',
      resourceId: after.id,
      projectId: params.projectId,
      before: beforeIssue,
      after,
      decisionReason: `status ${beforeIssue.status} → ${newStatus}`,
      authorityBasis: 'AUTHZ_MATRIX:edit_issue',
    });

    return Response.json({ status: 'success', data: after });
  }

  // PR-L — full-edit PATCH.
  const parsed = parseRequestBody(updateIssueRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!(await canPerformProjectAction(await getCurrentApiUser(), params.projectId, 'edit_issue'))) {
    return forbiddenResponse('edit_issue');
  }

  const existing = await repos.issues.findById(body.id);
  if (!existing || existing.projectId !== params.projectId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Issue not found' } },
      { status: 404 },
    );
  }

  const before = { ...existing };
  const patch: Partial<Issue> = {
    title: body.title !== undefined ? body.title.trim() : existing.title,
    severity: body.severity ?? existing.severity,
    status: body.status ?? existing.status,
    assignee: body.assignee !== undefined ? body.assignee.trim() : existing.assignee,
    linkedWbs:
      body.linkedWbs !== undefined ? body.linkedWbs.trim() || '-' : existing.linkedWbs,
    slaHours: body.slaHours ?? existing.slaHours,
    resolution: body.resolution !== undefined ? body.resolution.trim() : existing.resolution,
    progress: body.progress ?? existing.progress,
    tags: body.tags ?? existing.tags,
    closedAt:
      (body.status ?? existing.status) === 'closed' && existing.closedAt === null
        ? new Date().toISOString().split('T')[0]
        : existing.closedAt,
  };

  const updated = await repos.issues.update(body.id, patch);
  if (!updated) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Issue not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_issue',
    resourceType: 'issue',
    resourceId: updated.id,
    projectId: params.projectId,
    before,
    after: updated,
    decisionReason: 'update',
    authorityBasis: 'AUTHZ_MATRIX:edit_issue',
  });

  return Response.json({ status: 'success', data: updated });
}

/** PR-L — DELETE an issue by id. */
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteIssueRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { id } = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  if (!(await canPerformProjectAction(await getCurrentApiUser(), params.projectId, 'edit_issue'))) {
    return forbiddenResponse('edit_issue');
  }

  const existing = await repos.issues.findById(id);
  if (!existing || existing.projectId !== params.projectId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Issue not found' } },
      { status: 404 },
    );
  }

  await repos.issues.delete(id);
  await recordAuditEvent(request, {
    action: 'edit_issue',
    resourceType: 'issue',
    resourceId: existing.id,
    projectId: params.projectId,
    before: existing,
    after: null,
    decisionReason: 'delete',
    authorityBasis: 'AUTHZ_MATRIX:edit_issue',
  });

  return Response.json({ status: 'success', data: existing });
}
