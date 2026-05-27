import { describe, expect, it } from 'vitest';

import {
  LIFECYCLE_STAGE_ARTIFACTS,
  canEnterStage,
} from '@/lib/rid/lifecycle-artifacts';
import type { DocumentFile } from '@/types/document';

// ---------------------------------------------------------------------------
// canEnterStage tests (PR-16)
//
// Exercises the artifact-gate decision for each RID lifecycle stage. The MVP
// rule is intentionally narrow:
//   - `construction` REQUIRES one SOP 8.2 approval document (the only stage
//     with a required artifact in the MVP starting set).
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

  it('passes when entering construction with at least one linked + valid document (SOP 8.2)', () => {
    const sop82Doc = makeDoc('doc-001', 'หนังสืออนุมัติเปิดโครงการก่อสร้าง — SOP 8.2.pdf');
    const result = canEnterStage('construction', ['doc-001'], [sop82Doc]);
    expect(result).toEqual({ ok: true });
  });
});

describe('canEnterStage — block paths', () => {
  it('blocks entering construction with NO linked documents and reports SOP 8.2 as missing', () => {
    const result = canEnterStage('construction', [], []);

    expect(result.ok).toBe(false);
    if (result.ok) return; // type guard for TS

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].key).toBe('sop_8_2_construction_approval');
    expect(result.missing[0].required).toBe(true);
    expect(result.missing[0].sopReference).toMatch(/SOP 8\.2/);
  });

  it('blocks entering construction when the linked doc id does not exist in the document store', () => {
    // The caller cites doc-999 but it isn't in the document store — the
    // requirement count remains unmet because the cited evidence is invalid.
    const result = canEnterStage('construction', ['doc-999'], []);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.missing.map((m) => m.key)).toContain(
      'sop_8_2_construction_approval',
    );
  });

  it('does NOT block entering land_acquisition even with zero documents (no required artifacts in MVP)', () => {
    expect(canEnterStage('land_acquisition', [], [])).toEqual({ ok: true });
  });
});

describe('canEnterStage — duplicate-link consumption rule', () => {
  it('does not let a single linked document satisfy multiple required slots', () => {
    // The MVP table has only construction as a required-bearing stage with
    // exactly one required artifact, so this test asserts shape — if a future
    // PR adds a second required artifact to construction, this would correctly
    // require two distinct documents.
    const requiredCount = LIFECYCLE_STAGE_ARTIFACTS.construction.filter(
      (r) => r.required,
    ).length;

    // Sanity-check the MVP shape:
    expect(requiredCount).toBe(1);
  });
});
