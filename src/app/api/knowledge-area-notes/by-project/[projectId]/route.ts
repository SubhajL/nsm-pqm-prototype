export const dynamic = 'force-dynamic';

import { recordAuditEvent } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories } from '@/lib/repositories';
import { requireItProject } from '@/lib/rid/it-project-guard';
import { isUniqueViolation } from '@/lib/state-conflict';
import { parseRequestBody } from '@/lib/validation';
import { DT6_AREAS, type Dt6Area, type KnowledgeAreaNote } from '@/types/knowledge-area-note';
import { createKnowledgeAreaNoteRequestSchema } from '@/types/knowledge-area-note.schema';

function isDt6Area(value: string): value is Dt6Area {
  return (DT6_AREAS as readonly string[]).includes(value);
}

/**
 * GET /api/knowledge-area-notes/by-project/[projectId]?area=...
 *
 * - Without `?area=`: returns every note for the project (full history).
 * - With `?area=`: returns only notes for that area (history per area).
 *
 * Returns 422 IT_ONLY_FEATURE for non-IT projects, 400 for an unknown
 * `?area=` value (out of DT6 vocabulary).
 */
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const guard = await requireItProject(params.projectId);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const areaParam = url.searchParams.get('area');
  if (areaParam !== null && !isDt6Area(areaParam)) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'VALIDATION_FAILED',
          message: `Unknown DT6 area "${areaParam}". Valid values: ${DT6_AREAS.join(', ')}.`,
        },
      },
      { status: 400 },
    );
  }

  const all = await getRepositories().knowledgeAreaNotes.listByProject(
    params.projectId,
  );
  const data = areaParam ? all.filter((n) => n.area === areaParam) : all;
  return Response.json({ status: 'success', data });
}

/**
 * POST /api/knowledge-area-notes/by-project/[projectId]
 *
 * Authoring is monotonic — the route computes `version: previousMax + 1`
 * for the `(projectId, area)` pair. Authz: `edit_basic`. Returns
 * 422 IT_ONLY_FEATURE on non-IT projects.
 */
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(createKnowledgeAreaNoteRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const forbidden = await requireProjectAccess(params.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(currentUser, params.projectId, 'edit_basic'))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const guard = await requireItProject(params.projectId);
  if (!guard.ok) return guard.response;

  const repos = getRepositories();

  // PR-34 — version stays server-assigned; a 23505 race against the new
  // unique index recomputes once, mirroring TOR / amendments.
  let created: KnowledgeAreaNote | null = null;
  for (let attempt = 0; attempt < 2 && created === null; attempt += 1) {
    const latest = await repos.knowledgeAreaNotes.findLatestByProjectArea(
      params.projectId,
      parsed.data.area,
    );
    const newNote: KnowledgeAreaNote = {
      id: `kn-${crypto.randomUUID()}`,
      projectId: params.projectId,
      area: parsed.data.area,
      version: (latest?.version ?? 0) + 1,
      content: parsed.data.content,
      authoredBy: currentUser?.id ?? 'unknown',
      authoredAt: new Date().toISOString(),
    };
    try {
      created = await repos.knowledgeAreaNotes.create(newNote);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  if (created === null) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'SEQUENCE_CONFLICT',
          message:
            'มีการบันทึกโน้ตพร้อมกันโดยผู้ใช้อื่น (concurrent note version) — โปรดลองอีกครั้ง (retry)',
        },
      },
      { status: 409 },
    );
  }
  await recordAuditEvent(request, {
    action: 'create_knowledge_area_note',
    resourceType: 'knowledge_area_note',
    resourceId: created.id,
    projectId: params.projectId,
    before: null,
    after: created,
    decisionReason: `author DT6 ${created.area} note v${created.version}`,
    authorityBasis: 'AUTHZ_MATRIX:edit_basic',
    actor: currentUser,
  });

  return Response.json({ status: 'success', data: created }, { status: 201 });
}
