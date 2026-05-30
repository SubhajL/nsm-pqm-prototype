export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  getVisibleProjectIdsForCurrentUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import {
  applyAutoNcrIssues,
  applyItpStatusSync,
  applyRemoveAutoNcrIssuesForInspection,
} from '@/lib/quality-consistency';
import { getRepositories } from '@/lib/repositories';
import { parseRequestBody } from '@/lib/validation';
import {
  createInspectionRequestSchema,
  deleteInspectionRequestSchema,
  updateInspectionRequestSchema,
} from '@/types/quality.schema';

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const store = await getRepositories().qualityInspections.getData();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let itpItems = [...store.itpItems];
  let inspectionRecords = [...store.inspectionRecords];

  if (projectId) {
    const forbidden = await requireProjectAccess(projectId);
    if (forbidden) return forbidden;

    itpItems = itpItems.filter((item) => item.projectId === projectId);
    inspectionRecords = inspectionRecords.filter(
      (record) => record.projectId === projectId,
    );
  } else {
    const visibleProjectIds = await getVisibleProjectIdsForCurrentUser();
    itpItems = itpItems.filter((item) => visibleProjectIds.has(item.projectId));
    inspectionRecords = inspectionRecords.filter((record) => visibleProjectIds.has(record.projectId));
  }

  return Response.json({
    status: 'success',
    data: { itpItems, inspectionRecords },
  });
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.qualityInspections.getData();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createInspectionRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const forbidden = await requireProjectAccess(body.projectId);
  if (forbidden) return forbidden;

  if (
    !(await canPerformProjectAction(
      await getCurrentApiUser(),
      body.projectId,
      'edit_quality_inspection',
    ))
  ) {
    return forbiddenResponse('edit_quality_inspection');
  }

  const itpItem = store.itpItems.find(
    (item) => item.projectId === body.projectId && item.id === body.itpId,
  );

  if (!itpItem) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'ไม่พบรายการ ITP ที่เลือก' },
      },
      { status: 400 },
    );
  }

  const overallResult = body.overallResult ?? 'pass';
  const failReason =
    overallResult === 'conditional'
      ? body.failReason?.trim() || 'พบรายการที่ไม่ผ่าน ต้องแก้ไขก่อนดำเนินการต่อ'
      : '';

  const newRecord = {
    id: `insp-${String(store.inspectionRecords.length + 1).padStart(3, '0')}`,
    projectId: body.projectId,
    itpId: itpItem.id,
    title: body.title.trim(),
    date: body.date,
    time: body.time,
    inspectors: body.inspectors?.filter(Boolean) ?? [],
    wbsLink: body.wbsLink.trim(),
    standards: body.standards?.filter(Boolean) ?? [itpItem.standard],
    checklist: [
      {
        id: `cl-${crypto.randomUUID().slice(0, 8)}`,
        item: 'ตรวจเอกสารอ้างอิง',
        criteria: itpItem.standard,
        result: 'pass' as const,
        note: 'เอกสารถูกต้อง',
      },
      {
        id: `cl-${crypto.randomUUID().slice(0, 8)}`,
        item: itpItem.item,
        criteria: 'เป็นไปตามเกณฑ์การตรวจ',
        result: overallResult === 'pass' ? 'pass' as const : 'fail' as const,
        note: overallResult === 'pass' ? 'ผ่านการตรวจ' : failReason,
      },
      {
        id: `cl-${crypto.randomUUID().slice(0, 8)}`,
        item: 'บันทึกรูปถ่ายและพยานหลักฐาน',
        criteria: 'มีหลักฐานครบถ้วน',
        result: 'pass' as const,
        note: 'แนบหลักฐานครบ',
      },
    ],
    overallResult,
    failReason,
    autoNCR: overallResult === 'conditional',
    workflowStatus: 'draft' as const,
  };

  await repos.qualityInspections.createInspection(newRecord);
  await applyItpStatusSync(repos);
  const issueStoreNow = await repos.issues.list();
  await applyAutoNcrIssues(repos, issueStoreNow, [newRecord]);
  await recordAuditEvent(request, {
    action: 'edit_quality_inspection',
    resourceType: 'quality_inspection',
    resourceId: newRecord.id,
    projectId: newRecord.projectId,
    before: null,
    after: newRecord,
    decisionReason: newRecord.autoNCR ? 'auto-NCR (conditional)' : `create (${newRecord.overallResult})`,
    authorityBasis: 'AUTHZ_MATRIX:edit_quality_inspection',
  });

  return Response.json({ status: 'success', data: newRecord }, { status: 201 });
}

const VALID_TRANSITIONS: Record<string, string> = {
  'draft→confirmed': 'confirmed',
  'confirmed→signed': 'signed',
};

export async function PATCH(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.qualityInspections.getData();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(updateInspectionRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const record = store.inspectionRecords.find((r) => r.id === body.id);

  if (!record) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Inspection record not found' },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(record.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();

  if (!(await canPerformProjectAction(currentUser, record.projectId, 'edit_quality_inspection'))) {
    return forbiddenResponse('edit_quality_inspection');
  }

  const beforeRecord = structuredClone(record);

  // --- Resolve checklist item as pass ---
  if (body.checklistItemId && body.resolveAsPass) {
    const item = record.checklist.find((c) => c.id === body.checklistItemId);

    if (!item) {
      return Response.json(
        {
          status: 'error',
          error: { code: 'NOT_FOUND', message: 'Checklist item not found' },
        },
        { status: 404 },
      );
    }

    const nextChecklist = record.checklist.map((entry) =>
      entry.id === body.checklistItemId
        ? {
            ...entry,
            result: 'pass' as const,
            note: `${entry.note} → แก้ไขแล้ว โดย ${currentUser?.name ?? 'วิศวกร'}`,
          }
        : entry,
    );

    const allPass = nextChecklist.every((c) => c.result === 'pass');
    const patch: Parameters<typeof repos.qualityInspections.updateInspection>[1] = {
      checklist: nextChecklist,
    };
    if (allPass) {
      patch.overallResult = 'pass';
      patch.failReason = '';
      patch.autoNCR = false;
    }
    const updated =
      (await repos.qualityInspections.updateInspection(record.id, patch)) ?? record;

    if (allPass) {
      const issueStoreNow = await repos.issues.list();
      await applyRemoveAutoNcrIssuesForInspection(repos, issueStoreNow, record.id);
    }

    await applyItpStatusSync(repos);
    await recordAuditEvent(request, {
      action: 'edit_quality_inspection',
      resourceType: 'quality_inspection',
      resourceId: record.id,
      projectId: record.projectId,
      before: beforeRecord,
      after: updated,
      decisionReason: `resolve checklist ${body.checklistItemId} as pass`,
      authorityBasis: 'AUTHZ_MATRIX:edit_quality_inspection',
      actor: currentUser,
    });

    return Response.json({ status: 'success', data: updated });
  }

  // --- Workflow status transition ---
  if (!body.workflowStatus) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'BAD_REQUEST', message: 'workflowStatus or checklistItemId is required' },
      },
      { status: 400 },
    );
  }

  // Block workflow transitions if there are still failed items
  if (body.workflowStatus === 'confirmed' || body.workflowStatus === 'signed') {
    const hasFails = record.checklist.some((c) => c.result === 'fail');
    if (hasFails) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'BAD_REQUEST',
            message: 'ไม่สามารถยืนยันหรือลงนามได้ — ยังมีรายการที่ไม่ผ่าน ต้องแก้ไขก่อน',
          },
        },
        { status: 400 },
      );
    }
  }

  const currentStatus = record.workflowStatus ?? 'draft';
  const transitionKey = `${currentStatus}→${body.workflowStatus}`;

  if (!VALID_TRANSITIONS[transitionKey]) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'BAD_REQUEST',
          message: `ไม่สามารถเปลี่ยนสถานะจาก "${currentStatus}" เป็น "${body.workflowStatus}" ได้`,
        },
      },
      { status: 400 },
    );
  }

  const updated =
    (await repos.qualityInspections.updateInspection(record.id, {
      workflowStatus: body.workflowStatus,
    })) ?? record;
  await recordAuditEvent(request, {
    action: 'edit_quality_inspection',
    resourceType: 'quality_inspection',
    resourceId: record.id,
    projectId: record.projectId,
    before: beforeRecord,
    after: updated,
    decisionReason: `workflow ${currentStatus} → ${body.workflowStatus}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_quality_inspection',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: updated });
}

export async function DELETE(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const repos = getRepositories();
  const store = await repos.qualityInspections.getData();

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(deleteInspectionRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const record = store.inspectionRecords.find((entry) => entry.id === body.id);

  if (!record) {
    return Response.json(
      {
        status: 'error',
        error: { code: 'NOT_FOUND', message: 'Inspection record not found' },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(record.projectId);
  if (forbidden) return forbidden;

  if (
    !(await canPerformProjectAction(
      await getCurrentApiUser(),
      record.projectId,
      'edit_quality_inspection',
    ))
  ) {
    return forbiddenResponse('edit_quality_inspection');
  }

  const deletedRecord = structuredClone(record);
  await repos.qualityInspections.deleteInspection(record.id);
  const issueStoreNow = await repos.issues.list();
  await applyRemoveAutoNcrIssuesForInspection(repos, issueStoreNow, record.id);
  await applyItpStatusSync(repos);
  await recordAuditEvent(request, {
    action: 'edit_quality_inspection',
    resourceType: 'quality_inspection',
    resourceId: deletedRecord.id,
    projectId: deletedRecord.projectId,
    before: deletedRecord,
    after: null,
    decisionReason: 'delete',
    authorityBasis: 'AUTHZ_MATRIX:edit_quality_inspection',
  });

  return Response.json({ status: 'success', data: { id: record.id } });
}
