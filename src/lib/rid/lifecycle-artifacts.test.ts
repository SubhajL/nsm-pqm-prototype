import { describe, expect, it } from 'vitest';

import {
  LIFECYCLE_STAGE_ARTIFACTS,
  canEnterStage,
} from '@/lib/rid/lifecycle-artifacts';
import type { DocumentFile } from '@/types/document';

// ---------------------------------------------------------------------------
// canEnterStage tests (PR-16, extended PR-25)
//
// Exercises the artifact-gate decision for each RID lifecycle stage. The MVP
// rule (post-PR-25) is:
//   - `construction` REQUIRES TWO artifacts — the SOP 8.2 construction
//     approval AND the new `pre_construction_clearance` document (EIA + land
//     acquisition cleared, see PR-25 compliance registers).
//   - Every other stage's required-count is zero, so the gate trivially
//     passes regardless of attached documents.
// ---------------------------------------------------------------------------

function makeDoc(id: string, name: string): DocumentFile {
  return {
    id,
    folderId: 'folder-1',
    name,
    type: 'pdf',
    version: 1,
    size: '1 KB',
    uploadedBy: 'user-001',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    status: 'approved',
    workflow: [],
  };
}

describe('LIFECYCLE_STAGE_ARTIFACTS — table shape', () => {
  it('has an entry for every RID lifecycle stage', () => {
    expect(Object.keys(LIFECYCLE_STAGE_ARTIFACTS).sort()).toEqual(
      [
        'construction',
        'handover',
        'land_acquisition',
        'om',
        'planning',
        'procurement',
        'survey_design',
      ].sort(),
    );
  });

  it('construction stage REQUIRES the SOP 8.2 approval document', () => {
    const constructionReqs = LIFECYCLE_STAGE_ARTIFACTS.construction;
    const sop82 = constructionReqs.find(
      (req) => req.key === 'sop_8_2_construction_approval',
    );

    expect(sop82).toBeDefined();
    expect(sop82?.required).toBe(true);
    expect(sop82?.sopReference).toMatch(/SOP 8\.2/);
  });

  // PR-25 — pre-construction clearance gate.
  it('construction stage REQUIRES the pre-construction clearance artifact (PR-25)', () => {
    const constructionReqs = LIFECYCLE_STAGE_ARTIFACTS.construction;
    const clearance = constructionReqs.find(
      (req) => req.key === 'pre_construction_clearance',
    );

    expect(clearance).toBeDefined();
    expect(clearance?.required).toBe(true);
    expect(clearance?.sopReference).toMatch(/PR-25/);
    expect(clearance?.label).toMatch(/EIA/);
  });

  it('construction stage now requires exactly TWO artifacts (PR-25)', () => {
    const required = LIFECYCLE_STAGE_ARTIFACTS.construction.filter(
      (r) => r.required,
    );
    expect(required.map((r) => r.key).sort()).toEqual([
      'pre_construction_clearance',
      'sop_8_2_construction_approval',
    ]);
  });

  it('planning stage has no required artifacts (initial state)', () => {
    const required = LIFECYCLE_STAGE_ARTIFACTS.planning.filter((r) => r.required);
    expect(required).toEqual([]);
  });
});

describe('canEnterStage — pass paths', () => {
  it('passes when entering a stage with no required artifacts (e.g. survey_design)', () => {
    expect(canEnterStage('survey_design', [], [])).toEqual({ ok: true });
    expect(canEnterStage('land_acquisition', [], [])).toEqual({ ok: true });
    expect(canEnterStage('procurement', [], [])).toEqual({ ok: true });
  });

  it('passes when entering construction with TWO linked + valid documents (SOP 8.2 + PR-25 clearance)', () => {
    // PR-25 adds a second required artifact; consumers must now attach two
    // distinct documents (one per requirement slot).
    const sop82Doc = makeDoc(
      'doc-001',
      'หนังสืออนุมัติเปิดโครงการก่อสร้าง — SOP 8.2.pdf',
    );
    const clearanceDoc = makeDoc(
      'doc-002',
      'หลักฐานเคลียร์เงื่อนไขก่อนก่อสร้าง — EIA + Land.pdf',
    );
    const result = canEnterStage(
      'construction',
      ['doc-001', 'doc-002'],
      [sop82Doc, clearanceDoc],
    );
    expect(result).toEqual({ ok: true });
  });
});

describe('canEnterStage — block paths', () => {
  it('blocks entering construction with NO linked documents and reports BOTH required artifacts as missing (PR-25)', () => {
    const result = canEnterStage('construction', [], []);

    expect(result.ok).toBe(false);
    if (result.ok) return; // type guard for TS

    expect(result.missing).toHaveLength(2);
    expect(result.missing.map((m) => m.key).sort()).toEqual([
      'pre_construction_clearance',
      'sop_8_2_construction_approval',
    ]);
    for (const m of result.missing) {
      expect(m.required).toBe(true);
    }
  });

  // PR-25 — single document is no longer enough; the second slot remains unsatisfied.
  it('blocks entering construction when only ONE valid document is linked (PR-25)', () => {
    const sop82Doc = makeDoc(
      'doc-001',
      'หนังสืออนุมัติเปิดโครงการก่อสร้าง — SOP 8.2.pdf',
    );
    const result = canEnterStage('construction', ['doc-001'], [sop82Doc]);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    // The requirement consumed first depends on insertion order; we just
    // assert exactly one slot remains unfilled.
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].required).toBe(true);
  });

  it('blocks entering construction when the linked doc id does not exist in the document store', () => {
    // The caller cites doc-999 but it isn't in the document store — both
    // requirements remain unmet because the cited evidence is invalid.
    const result = canEnterStage('construction', ['doc-999'], []);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const missingKeys = result.missing.map((m) => m.key);
    expect(missingKeys).toContain('sop_8_2_construction_approval');
    expect(missingKeys).toContain('pre_construction_clearance');
  });

  it('does NOT block entering land_acquisition even with zero documents (no required artifacts in MVP)', () => {
    expect(canEnterStage('land_acquisition', [], [])).toEqual({ ok: true });
  });
});

describe('canEnterStage — required-count shape (PR-25)', () => {
  it('construction requires exactly TWO artifacts after PR-25', () => {
    const requiredCount = LIFECYCLE_STAGE_ARTIFACTS.construction.filter(
      (r) => r.required,
    ).length;
    expect(requiredCount).toBe(2);
  });

  it('a single linked document leaves exactly ONE required slot unfilled (PR-25)', () => {
    // The MVP binding rule is permissive — one document per requirement
    // slot. Linking only ONE document satisfies only ONE slot; the other
    // requirement is reported as missing.
    const oneDoc = makeDoc('doc-only', 'one-doc.pdf');
    const result = canEnterStage('construction', ['doc-only'], [oneDoc]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PR-26 — Handover packet gate on the `om` stage.
//
// SOP 8.1 makes the handover packet a required artifact for transitioning
// from `construction`/`handover` into `om`. PR-26 surfaces this on the
// existing `om` stage's requirement array as `handover_packet_accepted`
// (`required: true`). One linked document is enough to satisfy it — the
// route layer cross-checks the acceptance state of the packet itself.
// ---------------------------------------------------------------------------

describe('LIFECYCLE_STAGE_ARTIFACTS — om stage (PR-26)', () => {
  it('om stage REQUIRES the handover packet (PR-26)', () => {
    const omReqs = LIFECYCLE_STAGE_ARTIFACTS.om;
    const handover = omReqs.find((r) => r.key === 'handover_packet_accepted');
    expect(handover).toBeDefined();
    expect(handover?.required).toBe(true);
    expect(handover?.sopReference).toMatch(/SOP 8\.1/);
    expect(handover?.sopReference).toMatch(/PR-26/);
  });

  it('blocks entering om without any linked document (PR-26)', () => {
    const result = canEnterStage('om', [], []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const missingKeys = result.missing.map((m) => m.key);
    expect(missingKeys).toContain('handover_packet_accepted');
  });

  it('passes entering om with ONE linked + valid document (PR-26)', () => {
    const handoverDoc = makeDoc(
      'doc-ho-001',
      'เอกสารส่งมอบ-รับมอบงาน — SOP 8.1.pdf',
    );
    const result = canEnterStage('om', ['doc-ho-001'], [handoverDoc]);
    expect(result).toEqual({ ok: true });
  });
});
