import { recordAuditEvent } from '@/lib/audit-helpers';
import { ensureProjectDemoStateHydrated } from '@/lib/project-demo-state';
import type { RidOrgUnitTreeNode } from '@/lib/org-structure-store';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import type { OrgUnit, OrgUnitWithUserCount } from '@/types/admin';
import {
  createOrgUnitRequestSchema,
  deleteOrgUnitRequestSchema,
  updateOrgUnitRequestSchema,
} from '@/types/admin.schema';

/**
 * Decorated tree-node shape returned when `?asTree=true` is requested: every
 * node carries the derived `userCount` so the admin UI can render badges
 * without a second pass over the user store.
 */
interface OrgUnitTreeNodeWithUserCount {
  unit: OrgUnitWithUserCount;
  children: OrgUnitTreeNodeWithUserCount[];
}

function decorateTreeWithUserCount(
  node: RidOrgUnitTreeNode,
  countsById: Map<string, number>,
): OrgUnitTreeNodeWithUserCount {
  return {
    unit: { ...node.unit, userCount: countsById.get(node.unit.id) ?? 0 },
    children: node.children.map((child) => decorateTreeWithUserCount(child, countsById)),
  };
}

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();

  const { searchParams } = new URL(request.url);
  const asTree = searchParams.get('asTree') === 'true';

  const repos = getRepositories();
  const users = await repos.users.list();
  const countsById = new Map<string, number>();
  for (const user of users) {
    countsById.set(user.departmentId, (countsById.get(user.departmentId) ?? 0) + 1);
  }

  if (asTree) {
    const root = await repos.orgStructure.getRoot();
    const tree = root ? await repos.orgStructure.getTreeFor(root.id) : null;
    const decorated = tree ? decorateTreeWithUserCount(tree, countsById) : null;
    return Response.json({ status: 'success', data: decorated });
  }

  const units: OrgUnitWithUserCount[] = (await repos.orgStructure.list()).map((unit) => ({
    ...unit,
    userCount: countsById.get(unit.id) ?? 0,
  }));

  return Response.json({ status: 'success', data: units });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createOrgUnitRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  // The Zod discriminated union guarantees `body` is already a valid
  // RidOrgUnit shape (sans `id`); the cast just plugs in the freshly minted
  // id without re-narrowing the discriminator.
  const nextUnit = {
    ...body,
    id: `dept-${crypto.randomUUID()}`,
  } as OrgUnit;

  await getRepositories().orgStructure.create(nextUnit);
  await recordAuditEvent(request, {
    action: 'edit_org_structure',
    resourceType: 'org_unit',
    resourceId: nextUnit.id,
    projectId: null,
    before: null,
    after: nextUnit,
    decisionReason: `create ${nextUnit.name}`,
    authorityBasis: 'ADMIN:edit_org_structure',
  });

  return Response.json({ status: 'success', data: nextUnit }, { status: 201 });
}

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateOrgUnitRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const repos = getRepositories();
  const beforeUnit = await repos.orgStructure.findById(body.id);
  const updatedUnit = await repos.orgStructure.update(body.id, body.updates);

  if (!updatedUnit) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Org unit not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_org_structure',
    resourceType: 'org_unit',
    resourceId: updatedUnit.id,
    projectId: null,
    before: beforeUnit ?? null,
    after: updatedUnit,
    decisionReason: `update ${updatedUnit.name}`,
    authorityBasis: 'ADMIN:edit_org_structure',
  });

  return Response.json({ status: 'success', data: updatedUnit });
}

export async function DELETE(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteOrgUnitRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const repos = getRepositories();

  if (await repos.orgStructure.hasChildren(body.id)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'HAS_CHILDREN', message: 'ไม่สามารถลบหน่วยงานที่มีหน่วยงานย่อยได้' },
      },
      { status: 400 },
    );
  }

  if ((await repos.users.listByDepartment(body.id)).length > 0) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'HAS_USERS', message: 'ไม่สามารถลบหน่วยงานที่ยังมีผู้ใช้งานได้' },
      },
      { status: 400 },
    );
  }

  const deletedUnit = await repos.orgStructure.delete(body.id);

  if (!deletedUnit) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Org unit not found' } },
      { status: 404 },
    );
  }

  await recordAuditEvent(request, {
    action: 'edit_org_structure',
    resourceType: 'org_unit',
    resourceId: deletedUnit.id,
    projectId: null,
    before: deletedUnit,
    after: null,
    decisionReason: `delete ${deletedUnit.name}`,
    authorityBasis: 'ADMIN:edit_org_structure',
  });

  return Response.json({ status: 'success', data: deletedUnit });
}
