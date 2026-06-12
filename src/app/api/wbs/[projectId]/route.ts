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
import {
  createWbsNodeRequestSchema,
  deleteWbsNodeRequestSchema,
  updateWbsNodeRequestSchema,
} from '@/types/wbs.schema';

interface WBSNode {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  weight: number;
  progress: number;
  level: number;
  hasBOQ: boolean;
}

function getNextNodeCode(store: WBSNode[], projectId: string, parentId: string | null) {
  const siblings = store.filter(
    (node) => node.projectId === projectId && node.parentId === parentId,
  );
  const nextIndex = siblings.length + 1;

  if (!parentId) {
    return `${nextIndex}.0`;
  }

  const parentNode = store.find((node) => node.id === parentId);

  if (!parentNode) {
    return `${nextIndex}.0`;
  }

  if (parentNode.code.endsWith('.0')) {
    return `${parentNode.code.slice(0, -1)}${nextIndex}`;
  }

  return `${parentNode.code}.${nextIndex}`;
}

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store = await getRepositories().wbs.list();
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const filtered = store.filter((n) => n.projectId === params.projectId);

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.wbs.list();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createWbsNodeRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();

  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_wbs'))) {
    return forbiddenResponse('edit_wbs');
  }

  const name = body.name.trim();
  const parentId = body.parentId ?? null;

  const parentNode = parentId
    ? store.find(
        (node) => node.projectId === params.projectId && node.id === parentId,
      )
    : null;

  if (parentId && !parentNode) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INVALID_PARENT', message: 'ไม่พบ WBS แม่ที่เลือก' },
      },
      { status: 400 },
    );
  }

  const newNode: WBSNode = {
    id: `wbs-${params.projectId}-${crypto.randomUUID().slice(0, 8)}`,
    projectId: params.projectId,
    parentId,
    code: getNextNodeCode(store, params.projectId, parentId),
    name,
    weight: 0,
    progress: 0,
    level: parentNode ? parentNode.level + 1 : 1,
    hasBOQ: false,
  };

  await repos.wbs.create(newNode);
  await recordAuditEvent(request, {
    action: 'edit_wbs',
    resourceType: 'wbs',
    resourceId: newNode.id,
    projectId: params.projectId,
    before: null,
    after: newNode,
    decisionReason: 'create',
    authorityBasis: 'AUTHZ_MATRIX:edit_wbs',
  });

  return Response.json({ status: 'success', data: newNode }, { status: 201 });
}

/**
 * PR-C2 — PATCH a WBS node's editable fields (name/weight/progress).
 * The handler refuses cross-project edits.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateWbsNodeRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_wbs'))) {
    return forbiddenResponse('edit_wbs');
  }

  const existing = await repos.wbs.findById(body.id);
  if (!existing || existing.projectId !== params.projectId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'WBS node not found' } },
      { status: 404 },
    );
  }

  const before = { ...existing };
  const patch: Partial<WBSNode> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.weight !== undefined) patch.weight = body.weight;
  if (body.progress !== undefined) patch.progress = body.progress;

  const updated = await repos.wbs.update(body.id, patch);
  if (!updated) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'WBS node not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_wbs',
    resourceType: 'wbs',
    resourceId: updated.id,
    projectId: params.projectId,
    before,
    after: updated,
    decisionReason: 'update',
    authorityBasis: 'AUTHZ_MATRIX:edit_wbs',
  });

  return Response.json({ status: 'success', data: updated });
}

/**
 * PR-C2 — DELETE a WBS node and cascade to descendants + their BOQ items.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteWbsNodeRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const { id } = parsed.data;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (!(await canPerformProjectAction(currentUser, params.projectId, 'edit_wbs'))) {
    return forbiddenResponse('edit_wbs');
  }

  const allNodes = await repos.wbs.list();
  const target = allNodes.find((node) => node.id === id);
  if (!target || target.projectId !== params.projectId) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'WBS node not found' } },
      { status: 404 },
    );
  }

  // Walk descendants breadth-first.
  const toDelete = new Set<string>([target.id]);
  let frontier: string[] = [target.id];
  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const node of allNodes) {
      if (node.parentId !== null && frontier.includes(node.parentId)) {
        toDelete.add(node.id);
        nextFrontier.push(node.id);
      }
    }
    frontier = nextFrontier;
  }

  const deletionList = Array.from(toDelete);
  for (const nodeId of deletionList) {
    const boqRows = await repos.boq.listByWbs(nodeId);
    for (const item of boqRows) {
      await repos.boq.delete(item.id);
    }
  }
  for (const nodeId of deletionList) {
    await repos.wbs.delete(nodeId);
  }

  await recordAuditEvent(request, {
    action: 'edit_wbs',
    resourceType: 'wbs',
    resourceId: target.id,
    projectId: params.projectId,
    before: target,
    after: null,
    decisionReason: `delete (cascade ${toDelete.size} node${toDelete.size === 1 ? '' : 's'})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_wbs',
  });

  return Response.json({ status: 'success', data: target });
}
