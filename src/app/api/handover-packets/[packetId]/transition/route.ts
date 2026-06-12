export const dynamic = 'force-dynamic';

import { withTransactionalAudit } from '@/lib/audit-helpers';
import {
  canPerformProjectAction,
  forbiddenResponse,
  getCurrentApiUser,
  requireProjectAccess,
} from '@/lib/project-api-access';
import { getRepositories, type RepositoryRegistry } from '@/lib/repositories';
import {
  canTransitionHandover,
  computeWarrantyWindow,
  isHandoverComplete,
} from '@/lib/rid/handover-helpers';
import { parseRequestBody } from '@/lib/validation';
import { STATE_CONFLICT, stateConflictResponse } from '@/lib/state-conflict';
import type {
  HandoverPacket,
  HandoverState,
} from '@/types/handover-packet';
import type { OmManualCategory } from '@/types/om-manual';
import { transitionHandoverPacketRequestSchema } from '@/types/handover-packet.schema';

/**
 * Target states that require the artifact-completeness gate.
 *
 * The SOP 8.1 minimum is that the packet must be substantively complete
 * BEFORE the committee can review it (and trivially before acceptance).
 * `rejected` is allowed without completeness — the committee can reject
 * incomplete packets to send them back for revision — and `draft` is
 * always allowed (rejected → draft revise loop).
 */
const REQUIRES_COMPLETENESS: ReadonlySet<HandoverState> = new Set<HandoverState>(
  ['submitted', 'committee_review', 'accepted'],
);

/**
 * Tally the per-handover artifact counts for the completeness gate.
 *
 * Reads each child register once and reduces to the shape the pure
 * `isHandoverComplete` helper expects.
 */
async function tallyArtifacts(
  packetId: string,
  repos: RepositoryRegistry,
): Promise<{
  asBuiltCount: number;
  omManualCategoriesPresent: Set<OmManualCategory>;
  assetCount: number;
}> {
  const [asBuilt, omEntries, assets] = await Promise.all([
    repos.asBuiltDrawings.listByHandoverPacket(packetId),
    repos.omManualEntries.listByHandoverPacket(packetId),
    repos.assetRegistrations.listByHandoverPacket(packetId),
  ]);
  return {
    asBuiltCount: asBuilt.length,
    omManualCategoriesPresent: new Set(omEntries.map((e) => e.category)),
    assetCount: assets.length,
  };
}

/**
 * POST /api/handover-packets/[packetId]/transition
 *
 * Body: `{ targetState: HandoverState }`. Decision pipeline:
 *
 *   1. Zod body shape — 400 on malformed input.
 *   2. Packet lookup — 404 if id is unknown.
 *   3. Project visibility + `edit_basic` authz — 401/403 if blocked.
 *   4. Pure state machine — 409 INVALID_TRANSITION with a
 *      human-readable reason if (from, to) is illegal.
 *   5. Completeness gate (for `submitted` | `committee_review` |
 *      `accepted` targets) — 409 INCOMPLETE_HANDOVER with `missing`
 *      array when the artifact set is incomplete.
 *   6. Derive submittedAt / acceptedAt / warranty window per target.
 *   7. Persist + emit audit event with before/after.
 */
export async function POST(
  request: Request,
  { params }: { params: { packetId: string } },
) {
  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = parseRequestBody(transitionHandoverPacketRequestSchema, rawBody);
  if (!parsed.success) return parsed.response;

  const repos = getRepositories();
  const packet = await repos.handoverPackets.findById(params.packetId);
  if (!packet) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Handover packet ${params.packetId} not found`,
        },
      },
      { status: 404 },
    );
  }

  const forbidden = await requireProjectAccess(packet.projectId);
  if (forbidden) return forbidden;

  const currentUser = await getCurrentApiUser();
  if (
    !(await canPerformProjectAction(
      currentUser,
      packet.projectId,
      'edit_basic',
    ))
  ) {
    return forbiddenResponse('edit_basic');
  }

  const { targetState } = parsed.data;
  const decision = canTransitionHandover(packet.state, targetState);
  if (!decision.ok) {
    return Response.json(
      {
        status: 'error',
        error: {
          code: 'INVALID_TRANSITION',
          message: `Transition "${packet.state}" → "${targetState}" is not allowed.`,
          reason: decision.reason,
        },
      },
      { status: 409 },
    );
  }

  // Completeness gate — only the forward path (submitted →
  // committee_review → accepted) needs the full artifact set. The
  // rejected and rejected → draft loop is intentionally exempt so
  // the committee can recycle incomplete packets.
  if (REQUIRES_COMPLETENESS.has(targetState)) {
    const tally = await tallyArtifacts(packet.id, repos);
    const completeness = isHandoverComplete(tally);
    if (!completeness.ok) {
      return Response.json(
        {
          status: 'error',
          error: {
            code: 'INCOMPLETE_HANDOVER',
            message: `Handover packet is missing the artifact set required for "${targetState}" (SOP 8.1).`,
            missing: completeness.missing,
          },
        },
        { status: 409 },
      );
    }
  }

  // Derive the side-effects that come with each target state.
  const now = new Date().toISOString();
  const patch: Partial<HandoverPacket> = { state: targetState };

  if (targetState === 'submitted' && packet.submittedAt === null) {
    patch.submittedAt = now;
  }

  if (targetState === 'accepted') {
    patch.acceptedAt = now;
    patch.acceptedBy = currentUser?.id ?? null;

    // Warranty window derivation — only when a contract is linked and
    // `warrantyMonths` is set on it. Helper returns null when no
    // warranty is stipulated, in which case both ends stay null.
    if (packet.contractId) {
      const contract = await repos.awardedContracts.findById(packet.contractId);
      const window = contract
        ? computeWarrantyWindow(now, contract.warrantyMonths)
        : null;
      if (window) {
        patch.warrantyStartDate = window.start;
        patch.warrantyEndDate = window.end;
      }
    }
  }

  const before = {
    state: packet.state,
    submittedAt: packet.submittedAt,
    acceptedAt: packet.acceptedAt,
  };

  // Wrap the update + audit append in a single transaction so a crash
  // between the two can't leave the gov't audit trail out of sync
  // with the persisted state.
  const updated = await withTransactionalAudit(request, async (txRepos, appendAudit) => {
    // PR-34 — compare-and-swap: only while still in the pre-checked state.
    const result = await txRepos.handoverPackets.updateIfState(packet.id, packet.state, patch);
    if (!result) throw STATE_CONFLICT;
    await appendAudit({
      action: 'transition_handover_packet',
      resourceType: 'handover_packet',
      resourceId: packet.id,
      projectId: packet.projectId,
      before,
      after: {
        state: result?.state,
        submittedAt: result?.submittedAt,
        acceptedAt: result?.acceptedAt,
        warrantyStartDate: result?.warrantyStartDate,
        warrantyEndDate: result?.warrantyEndDate,
      },
      decisionReason: `${packet.state} → ${targetState}`,
      authorityBasis: 'AUTHZ_MATRIX:edit_basic',
      actor: currentUser,
    });
    return result;
  }).catch((err: unknown) => {
    if (err === STATE_CONFLICT) return null;
    throw err;
  });

  if (!updated) {
    return stateConflictResponse('ชุดส่งมอบ (Handover packet)');
  }

  return Response.json({ status: 'success', data: updated });
}
