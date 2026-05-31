/**
 * RID lifecycle-stage artifact requirements.
 *
 * **Status (PR-16):** The full required-artifact set per stage is PENDING RID
 * stakeholder review. The values below are a reasonable MVP starting point
 * — only the artifacts cited as SOP-mandated (most notably SOP 8.2's
 * construction-approval doc) are marked `required: true`. Everything else
 * is `required: false` and surfaces in the UI as a recommended (but
 * non-blocking) checklist item.
 *
 * The artifact LABELS are stable Thai-first user-facing strings; the
 * `sopReference` ties each row back to the originating RID SOP for traceability.
 *
 * This module is the single source of truth for what the lifecycle gate
 * component (`RidLifecycleGates.tsx`) and the lifecycle PATCH route
 * (`/api/projects/[id]/lifecycle`) both consult — keep wire shape and UI
 * labels in lockstep here.
 *
 * See:
 *   - `RidLifecycleStage` enum in `@/types/rid/vocabulary`
 *   - MVP plan §PR-16
 */

import type { DocumentFile } from '@/types/document';
import type { RidLifecycleStage } from '@/types/rid/vocabulary';

export interface StageArtifactRequirement {
  stage: RidLifecycleStage;
  /**
   * Stable client-side key for matching this requirement against attached
   * documents and rendering it in the UI. Lower-snake-case Latin. Unique
   * within a stage.
   */
  key: string;
  /** Artifact label in Thai for display; English/SOP reference in parens. */
  label: string;
  /**
   * Whether at least one linked document must satisfy this requirement
   * before the project may ENTER the stage. `false` items render as
   * recommended but do NOT block stage entry (per MVP stakeholder
   * decision — the full required set is still pending review).
   */
  required: boolean;
  /**
   * Optional RID SOP citation (e.g.
   * `"SOP 8.2 — การขออนุมัติเปิดโครงการก่อสร้าง"`). `null` when no SOP
   * directly mandates the artifact and it's included as good practice
   * only.
   */
  sopReference: string | null;
}

/**
 * Per-stage artifact requirement catalogue. Index is by the stage the
 * artifacts gate ENTRY into — i.e. `LIFECYCLE_STAGE_ARTIFACTS.construction`
 * lists the docs that must exist before a project transitions FROM
 * `procurement` INTO `construction`.
 *
 * Required-flag rationale per stage:
 *   - `planning` — no required artifacts; this is the initial state for
 *     every project, so an entry gate would be meaningless.
 *   - `land_acquisition` — none required for MVP (top-3 RID delay driver
 *     per Tiyarathtagarn; the actual artifact set needs RID stakeholder
 *     confirmation before we enforce blocking).
 *   - `survey_design` — none required for MVP.
 *   - `procurement` — none required for MVP.
 *   - `construction` — **SOP 8.2 approval document REQUIRED** (per RID
 *     SOP 8.2 การขออนุมัติเปิดโครงการก่อสร้าง). This is the one stage
 *     where MVP enforces blocking.
 *   - `handover` — none required for MVP (the SOP 8.1 handover packet is
 *     listed as recommended; will become required after PR-26 surfaces
 *     the as-built register).
 *   - `om` — none required for MVP (warranty start + asset registration
 *     becomes required after PR-26).
 */
export const LIFECYCLE_STAGE_ARTIFACTS: Record<RidLifecycleStage, StageArtifactRequirement[]> = {
  planning: [
    {
      stage: 'planning',
      key: 'feasibility_study',
      label: 'รายงานความเป็นไปได้ของโครงการ (Feasibility Study)',
      required: false,
      sopReference: null,
    },
    {
      stage: 'planning',
      key: 'project_charter',
      label: 'เอกสารกรอบโครงการ (Project Charter)',
      required: false,
      sopReference: null,
    },
  ],
  land_acquisition: [
    {
      stage: 'land_acquisition',
      key: 'land_deeds',
      label: 'สำเนาโฉนดที่ดิน / เอกสารสิทธิ์ (Land Deeds)',
      required: false,
      sopReference: null,
    },
    {
      stage: 'land_acquisition',
      key: 'compensation_records',
      label: 'บันทึกการชดเชยที่ดินและทรัพย์สิน (Compensation Records)',
      required: false,
      sopReference: null,
    },
  ],
  survey_design: [
    {
      stage: 'survey_design',
      key: 'survey_report',
      label: 'รายงานการสำรวจพื้นที่ (Survey Report)',
      required: false,
      sopReference: null,
    },
    {
      stage: 'survey_design',
      key: 'design_drawings',
      label: 'แบบรูปและรายการประกอบแบบ (Design Drawings)',
      required: false,
      sopReference: null,
    },
    {
      stage: 'survey_design',
      key: 'geotechnical_report',
      label: 'รายงานการเจาะสำรวจดิน (Geotechnical Report)',
      required: false,
      sopReference: null,
    },
  ],
  procurement: [
    {
      stage: 'procurement',
      key: 'tor_document',
      label: 'ขอบเขตของงาน (TOR — Terms of Reference)',
      required: false,
      sopReference: null,
    },
    {
      stage: 'procurement',
      key: 'contract_award_notice',
      label: 'ประกาศผู้ชนะการเสนอราคา (Contract Award Notice)',
      required: false,
      sopReference: null,
    },
  ],
  construction: [
    {
      stage: 'construction',
      key: 'sop_8_2_construction_approval',
      label: 'หนังสืออนุมัติเปิดโครงการก่อสร้าง (SOP 8.2 Construction Approval)',
      required: true,
      sopReference: 'SOP 8.2 — การขออนุมัติเปิดโครงการก่อสร้าง',
    },
    {
      // PR-25 — Pre-construction clearance gate. Pairs with the four
      // compliance registers (permits, environmental assessments, public
      // hearings, land acquisition). One linked clearance document must
      // demonstrate that EIA + land acquisition are settled before
      // construction starts.
      stage: 'construction',
      key: 'pre_construction_clearance',
      label:
        'หลักฐานเคลียร์เงื่อนไขก่อนก่อสร้าง (EIA + การได้มาซึ่งที่ดิน) (Pre-construction clearance: EIA + Land Acquisition)',
      required: true,
      sopReference: 'PR-25 — Pre-construction conditions gate',
    },
  ],
  handover: [
    {
      stage: 'handover',
      key: 'sop_8_1_handover_packet',
      label: 'เอกสารส่งมอบ-รับมอบงาน (SOP 8.1 Handover Packet)',
      required: false,
      sopReference: 'SOP 8.1 — การส่งมอบ-รับมอบ',
    },
    {
      stage: 'handover',
      key: 'as_built_drawings',
      label: 'แบบก่อสร้างจริง (As-Built Drawings)',
      required: false,
      sopReference: 'SOP 8.1 — การส่งมอบ-รับมอบ',
    },
  ],
  om: [
    {
      stage: 'om',
      key: 'om_manual',
      label: 'คู่มือการใช้งานและบำรุงรักษา (O&M Manual)',
      required: false,
      sopReference: null,
    },
    {
      stage: 'om',
      key: 'asset_registration',
      label: 'การลงทะเบียนทรัพย์สิน (Asset Registration)',
      required: false,
      sopReference: null,
    },
  ],
};

/**
 * Result of `canEnterStage()`. Discriminated by `ok` so callers can switch
 * exhaustively without optional-chaining the `missing` field.
 */
export type CanEnterStageResult =
  | { ok: true }
  | { ok: false; missing: StageArtifactRequirement[] };

/**
 * Decide whether a project may enter `targetStage` given the documents
 * the caller is citing as evidence.
 *
 * Contract:
 *   - Every requirement in `LIFECYCLE_STAGE_ARTIFACTS[targetStage]` that has
 *     `required: true` must be satisfied by at least one `DocumentFile`
 *     whose `id` appears in `linkedDocIds`.
 *   - The caller is responsible for resolving the requirement-to-document
 *     binding — the MVP convention is "the document's `name` contains the
 *     requirement label fragment OR the project links it explicitly via
 *     the route body". The implementation is intentionally permissive: as
 *     long as at least one document is linked for each required artifact
 *     slot, we accept it. Stricter binding (e.g. document type metadata)
 *     is deferred until the artifact-requirement set is RID-confirmed.
 *
 * Returns `{ ok: true }` when all required artifacts are present, otherwise
 * `{ ok: false, missing }` where `missing` is the list of required
 * requirements that lack any matching document. Non-required requirements
 * never block — they only inform the UI.
 */
export function canEnterStage(
  targetStage: RidLifecycleStage,
  linkedDocIds: string[],
  documents: DocumentFile[],
): CanEnterStageResult {
  const requirements = LIFECYCLE_STAGE_ARTIFACTS[targetStage];
  const requiredOnly = requirements.filter((req) => req.required);

  // Build a set of valid document ids the caller has actually attached.
  const docIdSet = new Set(documents.map((doc) => doc.id));
  const attachedAndValid = linkedDocIds.filter((id) => docIdSet.has(id));

  // MVP binding rule: each required requirement needs at least one attached
  // document. Stricter per-requirement type binding will arrive once the RID
  // stakeholder review pins down the exact mapping.
  //
  // We "consume" one document per requirement so duplicate links don't
  // satisfy multiple requirements with a single file.
  const remainingDocs = [...attachedAndValid];
  const missing: StageArtifactRequirement[] = [];

  for (const requirement of requiredOnly) {
    const consumed = remainingDocs.shift();
    if (!consumed) {
      missing.push(requirement);
    }
  }

  if (missing.length === 0) {
    return { ok: true };
  }

  return { ok: false, missing };
}
