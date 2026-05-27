import { appendAuditLog } from '@/lib/audit-log-store';
import {
  ensureProjectDemoStateHydrated,
  persistProjectDemoState,
} from '@/lib/project-demo-state';
import { getCurrentApiUser } from '@/lib/project-api-access';
import { addOrgUnit, deleteOrgUnit, getOrgStructureStore, updateOrgUnit } from '@/lib/org-structure-store';
import { getUserStore } from '@/lib/user-store';
import { parseRequestBody } from '@/lib/validation';
import type { OrgUnit } from '@/types/admin';
import {
  createOrgUnitRequestSchema,
  deleteOrgUnitRequestSchema,
  updateOrgUnitRequestSchema,
} from '@/types/admin.schema';

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();

  const units = getOrgStructureStore().map((unit) => ({
    ...unit,
    userCount: getUserStore().filter((user) => user.departmentId === unit.id).length,
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

  const nextUnit: OrgUnit = {
    ...body,
    id: `dept-${crypto.randomUUID()}`,
    userCount: 0,
  };

  addOrgUnit(nextUnit);
  appendAuditLog(getCurrentApiUser(), 'Admin', `เพิ่มหน่วยงาน ${nextUnit.name}`);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: nextUnit }, { status: 201 });
}

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateOrgUnitRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const updatedUnit = updateOrgUnit(body.id, body.updates);

  if (!updatedUnit) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Org unit not found' } },
      { status: 404 },
    );
  }

  appendAuditLog(getCurrentApiUser(), 'Admin', `แก้ไขหน่วยงาน ${updatedUnit.name}`);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: updatedUnit });
}

export async function DELETE(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await ensureProjectDemoStateHydrated();
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteOrgUnitRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const store = getOrgStructureStore();

  if (store.some((unit) => unit.parentId === body.id)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'HAS_CHILDREN', message: 'ไม่สามารถลบหน่วยงานที่มีหน่วยงานย่อยได้' },
      },
      { status: 400 },
    );
  }

  if (getUserStore().some((user) => user.departmentId === body.id)) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'HAS_USERS', message: 'ไม่สามารถลบหน่วยงานที่ยังมีผู้ใช้งานได้' },
      },
      { status: 400 },
    );
  }

  const deletedUnit = deleteOrgUnit(body.id);

  if (!deletedUnit) {
    return Response.json(
      { status: 'error', error: { code: 'NOT_FOUND', message: 'Org unit not found' } },
      { status: 404 },
    );
  }

  appendAuditLog(getCurrentApiUser(), 'Admin', `ลบหน่วยงาน ${deletedUnit.name}`);
  await persistProjectDemoState();

  return Response.json({ status: 'success', data: deletedUnit });
}
