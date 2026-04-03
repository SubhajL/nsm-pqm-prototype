import { canAccessAdmin } from '@/lib/auth';
import { requireProjectAccess } from '@/lib/project-api-access';
import { getActiveUser } from '@/lib/project-access';
import { AUTH_COOKIE_USER_ID } from '@/lib/auth';
import { cookies } from 'next/headers';
import { ensureProjectDemoStateHydrated, persistProjectDemoState } from '@/lib/project-demo-state';
import { getWbsStore } from '@/lib/wbs-store';

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

const store = getWbsStore();

interface CreateWBSNodeRequest {
  name?: string;
  parentId?: string | null;
}

function getNextNodeCode(projectId: string, parentId: string | null) {
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
  await ensureProjectDemoStateHydrated();
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
  await ensureProjectDemoStateHydrated();
  const forbidden = requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = getActiveUser(cookies().get(AUTH_COOKIE_USER_ID)?.value);

  if (!currentUser) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      },
      { status: 401 },
    );
  }

  if (!canAccessAdmin(currentUser.role) && currentUser.role !== 'Project Manager') {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'FORBIDDEN',
          message: 'Only project managers can create WBS nodes',
        },
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as CreateWBSNodeRequest;
  const name = body.name?.trim();
  const parentId = body.parentId ?? null;

  if (!name) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'INVALID_WBS_NAME', message: 'กรุณาระบุชื่อ WBS' },
      },
      { status: 400 },
    );
  }

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
    code: getNextNodeCode(params.projectId, parentId),
    name,
    weight: 0,
    progress: 0,
    level: parentNode ? parentNode.level + 1 : 1,
    hasBOQ: false,
  };

  store.push(newNode);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: newNode }, { status: 201 });
}
