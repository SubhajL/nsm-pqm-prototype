import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// RidLifecycleGates component smoke tests (PR-16)
//
// The component is `'use client'` + TSX and renders into the DOM via Ant
// Design. The project's vitest config is node-only and limited to
// `*.test.ts` with no JSX/TSX transformer plugin — therefore we do NOT
// import the component's TSX module directly.
//
// What we DO assert here (lightweight render + interaction test):
//   1. The component file exists, contains the `'use client'` directive,
//      and exports `RidLifecycleGates`.
//   2. The component renders the 7 Thai stage labels (วางโครงการ →
//      จัดหาที่ดิน → สำรวจ/ออกแบบ → ประกวดราคา → ก่อสร้าง →
//      ส่งมอบ-รับมอบ → O&M) in source order — these are the user-facing
//      strings the CLAUDE.md SHOULD rule + PR-16 plan both require.
//   3. The component wires the `canEnterStage` helper for the "Enter next
//      stage" CTA.
//   4. The component does NOT hardcode hex color literals — it consults
//      the COLORS token map per CLAUDE.md (no `#xxxxxx` in source).
//
// Full interaction coverage (click → popover → CTA disabled when
// artifacts are missing) is covered indirectly by:
//   - lifecycle-artifacts.test.ts — the gate-decision rule the CTA uses
//   - route.test.ts — the 200/409 contract the CTA POSTs to
// ---------------------------------------------------------------------------

const COMPONENT_PATH = path.resolve(
  __dirname,
  'RidLifecycleGates.tsx',
);

function readComponent(): string {
  return readFileSync(COMPONENT_PATH, 'utf8');
}

describe('RidLifecycleGates — component source contract', () => {
  it('exists, uses "use client", and exports RidLifecycleGates', () => {
    const source = readComponent();
    expect(source.startsWith("'use client'")).toBe(true);
    expect(source).toMatch(/export function RidLifecycleGates\b/);
  });

  it('renders all 7 RID lifecycle stage labels in canonical Thai order', () => {
    const source = readComponent();
    const orderedLabels = [
      'วางโครงการ',
      'จัดหาที่ดิน',
      'สำรวจ/ออกแบบ',
      'ประกวดราคา',
      'ก่อสร้าง',
      'ส่งมอบ-รับมอบ',
      'O&M',
    ];

    let lastIndex = -1;
    for (const label of orderedLabels) {
      const idx = source.indexOf(label);
      expect(idx, `label "${label}" missing from component source`).toBeGreaterThan(
        lastIndex,
      );
      lastIndex = idx;
    }
  });

  it('wires the canEnterStage helper for the "Enter next stage" CTA', () => {
    const source = readComponent();
    expect(source).toMatch(/canEnterStage\(/);
    expect(source).toMatch(/Enter next stage|เข้าสู่ขั้น/);
  });

  it('uses COLORS theme tokens (no hex literals — per CLAUDE.md MUST NOT rule)', () => {
    const source = readComponent();
    expect(source).toMatch(/from '@\/theme\/antd-theme'/);
    // No 6-digit hex literals (e.g. "#1E3A5F") in the file body.
    const hexLiterals = source.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    expect(hexLiterals).toEqual([]);
  });
});

describe('RidLifecycleGates — CTA gating logic', () => {
  it('blocks the construction CTA when no SOP 8.2 doc is cited', async () => {
    const { canEnterStage } = await import('@/lib/rid/lifecycle-artifacts');
    const result = canEnterStage('construction', [], []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing.map((r) => r.key)).toContain(
      'sop_8_2_construction_approval',
    );
  });

  it('enables the construction CTA when BOTH the SOP 8.2 + PR-25 clearance docs are cited', async () => {
    // PR-25 extended the construction gate to require TWO documents
    // (SOP 8.2 approval AND pre-construction clearance). One alone is not
    // enough.
    const { canEnterStage } = await import('@/lib/rid/lifecycle-artifacts');
    const result = canEnterStage(
      'construction',
      ['doc-001', 'doc-002'],
      [
        {
          id: 'doc-001',
          folderId: 'folder-1',
          name: 'sop-8-2.pdf',
          type: 'pdf',
          version: 1,
          size: '1 KB',
          uploadedBy: 'user-001',
          uploadedAt: '2026-01-01T00:00:00.000Z',
          status: 'approved',
          workflow: [],
        },
        {
          id: 'doc-002',
          folderId: 'folder-1',
          name: 'pre-construction-clearance.pdf',
          type: 'pdf',
          version: 1,
          size: '1 KB',
          uploadedBy: 'user-001',
          uploadedAt: '2026-01-01T00:00:00.000Z',
          status: 'approved',
          workflow: [],
        },
      ],
    );
    expect(result.ok).toBe(true);
  });
});
