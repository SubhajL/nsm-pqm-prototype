import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getActiveUser } from '@/lib/project-access';
import { cookies } from 'next/headers';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import { createWbsNodeRequestSchema } from '@/types/wbs.schema';

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
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const filtered = store.filter((n) => n.projectId === params.projectId);

  return Response.json({ status: 'success', data: filtered });
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store = await getRepositories().wbs.list();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createWbsNodeRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  if (!canPerformProjectAction(currentUser, params.projectId, 'edit_wbs')) {
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

  store.push(newNode);
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
