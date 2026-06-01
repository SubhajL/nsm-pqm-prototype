export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import { wouldCreateCycle } from '@/lib/gantt/dependency-graph';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { GanttData, GanttLink } from '@/types/gantt';
import {
  createGanttDependencyRequestSchema,
  deleteGanttDependencyRequestSchema,
  updateGanttDependencyRequestSchema,
} from '@/types/gantt.schema';

/**
 * PR-3.5 — Dedicated dependency CRUD endpoints.
 *
 * Dependencies live as `links` inside `GanttData`. The legacy
 * `POST/PATCH /api/gantt/[projectId]` already accepts a `predecessors[]`
 * payload that replaces a task's incoming links wholesale; that path
 * stays for back-compat with the existing task edit form. THIS route is
 * the new, focused surface the dependency UI consumes when the user
 * adds/edits/removes a single link without otherwise touching the task.
 */

function notFound(message: string) {
  return Response.json(
    { status: 'error', error: { code: 'NOT_FOUND', message } },
    { status: 404 },
  );
}

function conflict(message: string) {
  return Response.json(
    { status: 'error', error: { code: 'DEPENDENCY_CYCLE', message } },
    { status: 409 },
  );
}

async function ensureCanManageGantt(projectId: string) {
  const user = await getCurrentApiUser();
  if (!(await canPerformProjectAction(user, projectId, 'edit_schedule'))) {
    return forbiddenResponse('edit_schedule');
  }
  return null;
}

function nextLinkId(store: GanttData): number {
  return (
    store.links.reduce((max, link) => Math.max(max, Number(link.id) || 0), 0) + 1
  );
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createGanttDependencyRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  if (body.predecessorId === body.successorId) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'task cannot depend on itself' },
      },
      { status: 400 },
    );
  }

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;
  const cannot = await ensureCanManageGantt(params.projectId);
  if (cannot) return cannot;

  const repos = getRepositories();
  const store = await repos.gantt.getProjectData(params.projectId);

  const predecessor = store.data.find((task) => task.id === body.predecessorId);
  const successor = store.data.find((task) => task.id === body.successorId);
  if (!predecessor) return notFound('predecessor task not found');
  if (!successor) return notFound('successor task not found');

  // PR-3.5 (Codex MEDIUM fix) — Match the legacy task route's rule:
  // project-type summary rows cannot participate in dependency links.
  if (predecessor.type === 'project') {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message: 'project summary rows cannot be predecessors',
        },
      },
      { status: 400 },
    );
  }
  if (successor.type === 'project') {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message: 'project summary rows cannot be successors',
        },
      },
      { status: 400 },
    );
  }

  if (
    wouldCreateCycle(store.links, {
      predecessorId: body.predecessorId,
      successorId: body.successorId,
    })
  ) {
    return conflict('การกำหนด dependency นี้จะสร้างวงจร (Would create a cycle)');
  }

  const newLink: GanttLink = {
    id: nextLinkId(store),
    source: body.predecessorId,
    target: body.successorId,
    type: body.type ?? 'FS',
    lagDays: body.lagDays ?? 0,
  };

  const finalData: GanttData = {
    data: store.data,
    links: [...store.links, newLink],
  };
  await repos.gantt.replaceProjectData(params.projectId, finalData);

  await recordAuditEvent(request, {
    action: 'edit_schedule',
    resourceType: 'gantt_dependency',
    resourceId: String(newLink.id),
    projectId: params.projectId,
    before: null,
    after: newLink,
    decisionReason: 'create',
    authorityBasis: 'AUTHZ_MATRIX:edit_schedule',
  });

  return Response.json({ status: 'success', data: newLink }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateGanttDependencyRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;
  const cannot = await ensureCanManageGantt(params.projectId);
  if (cannot) return cannot;

  const repos = getRepositories();
  const store = await repos.gantt.getProjectData(params.projectId);
  const existing = store.links.find((link) => link.id === body.id);
  if (!existing) return notFound('dependency not found');

  const before = { ...existing };
  const updated: GanttLink = {
    ...existing,
    type: body.type ?? existing.type,
    lagDays: body.lagDays ?? existing.lagDays,
  };

  const finalData: GanttData = {
    data: store.data,
    links: store.links.map((link) => (link.id === body.id ? updated : link)),
  };
  await repos.gantt.replaceProjectData(params.projectId, finalData);

  await recordAuditEvent(request, {
    action: 'edit_schedule',
    resourceType: 'gantt_dependency',
    resourceId: String(updated.id),
    projectId: params.projectId,
    before,
    after: updated,
    decisionReason: 'update',
    authorityBasis: 'AUTHZ_MATRIX:edit_schedule',
  });

  return Response.json({ status: 'success', data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteGanttDependencyRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { id } = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;
  const cannot = await ensureCanManageGantt(params.projectId);
  if (cannot) return cannot;

  const repos = getRepositories();
  const store = await repos.gantt.getProjectData(params.projectId);
  const existing = store.links.find((link) => link.id === id);
  if (!existing) return notFound('dependency not found');

  const finalData: GanttData = {
    data: store.data,
    links: store.links.filter((link) => link.id !== id),
  };
  await repos.gantt.replaceProjectData(params.projectId, finalData);

  await recordAuditEvent(request, {
    action: 'edit_schedule',
    resourceType: 'gantt_dependency',
    resourceId: String(existing.id),
    projectId: params.projectId,
    before: existing,
    after: null,
    decisionReason: 'delete',
    authorityBasis: 'AUTHZ_MATRIX:edit_schedule',
  });

  return Response.json({ status: 'success', data: existing });
}
