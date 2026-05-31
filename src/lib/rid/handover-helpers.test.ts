/**
 * PR-26 — Pure handover helpers test matrix.
 *
 * Exercises three pure functions:
 *   - `canTransitionHandover` — state-machine adjacency check.
 *   - `computeWarrantyWindow`  — warranty-window derivation from
 *     contract.warrantyMonths + accepted timestamp.
 *   - `isHandoverComplete`     — SOP 8.1 minimum-artifact-set gate.
 *
 * Everything in this module is pure (no clock, no I/O) so the matrix
 * runs sub-millisecond.
 */

import { describe, expect, it } from 'vitest';

import {
  HANDOVER_STATES,
  type HandoverState,
} from '@/types/handover-packet';
import type { OmManualCategory } from '@/types/om-manual';

import {
  canTransitionHandover,
  computeWarrantyWindow,
  isHandoverComplete,
} from './handover-helpers';

describe('canTransitionHandover', () => {
  const allowed: Array<[HandoverState, HandoverState]> = [
    ['draft', 'submitted'],
    ['submitted', 'committee_review'],
    ['committee_review', 'accepted'],
    ['committee_review', 'rejected'],
    ['rejected', 'draft'],
  ];

  it.each(allowed)('allows %s -> %s', (from, to) => {
    const result = canTransitionHandover(from, to);
    expect(result.ok).toBe(true);
  });

  it('rejects self-transitions for every state', () => {
    for (const state of HANDOVER_STATES) {
      const result = canTransitionHandover(state, state);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/self-transition/i);
    }
  });

  it('rejects skipping committee_review (submitted -> accepted)', () => {
    const result = canTransitionHandover('submitted', 'accepted');
    expect(result.ok).toBe(false);
  });

  it('rejects skipping committee_review (submitted -> rejected)', () => {
    const result = canTransitionHandover('submitted', 'rejected');
    expect(result.ok).toBe(false);
  });

  it('rejects skipping submission (draft -> committee_review)', () => {
    const result = canTransitionHandover('draft', 'committee_review');
    expect(result.ok).toBe(false);
  });

  it('treats accepted as a terminal state', () => {
    for (const to of HANDOVER_STATES) {
      if (to === 'accepted') continue;
      const result = canTransitionHandover('accepted', to);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/terminal/i);
    }
  });

  it('allows rejected -> draft (revise) but rejects rejected -> submitted (skip revise)', () => {
    expect(canTransitionHandover('rejected', 'draft').ok).toBe(true);
    expect(canTransitionHandover('rejected', 'submitted').ok).toBe(false);
  });

  it('rejects backward transitions (committee_review -> draft)', () => {
    expect(canTransitionHandover('committee_review', 'draft').ok).toBe(false);
  });
});

describe('computeWarrantyWindow', () => {
  it('returns null when warrantyMonths is null', () => {
    expect(computeWarrantyWindow('2026-06-15', null)).toBeNull();
  });

  it('returns null when warrantyMonths is zero', () => {
    // Zero-month warranty is meaningless — treat as "no warranty stipulated".
    expect(computeWarrantyWindow('2026-06-15', 0)).toBeNull();
  });

  it('derives a 12-month window for warrantyMonths=12', () => {
    const result = computeWarrantyWindow('2026-06-15', 12);
    expect(result).not.toBeNull();
    expect(result?.start).toBe('2026-06-15');
    expect(result?.end).toBe('2027-06-15');
  });

  it('derives a 24-month window for warrantyMonths=24', () => {
    const result = computeWarrantyWindow('2026-01-31', 24);
    expect(result?.end).toBe('2028-01-31');
  });

  it('handles month roll-over from end-of-month inputs (e.g. Jan 31 + 1 month → Feb 28)', () => {
    // 2027 is not a leap year. Adding 1 month to 2027-01-31 should land on
    // 2027-02-28 (the last day of February), not roll forward to March.
    const result = computeWarrantyWindow('2027-01-31', 1);
    expect(result?.end).toBe('2027-02-28');
  });

  it('handles leap-year February correctly (Jan 31 2024 + 1 month → Feb 29)', () => {
    const result = computeWarrantyWindow('2024-01-31', 1);
    expect(result?.end).toBe('2024-02-29');
  });

  it('preserves an ISO timestamp prefix when acceptedAt carries a time component', () => {
    // Real `acceptedAt` values are ISO timestamps; the warranty start/end
    // are dates only.
    const result = computeWarrantyWindow('2026-06-15T10:30:00.000Z', 12);
    expect(result?.start).toBe('2026-06-15');
    expect(result?.end).toBe('2027-06-15');
  });
});

describe('isHandoverComplete', () => {
  function asSet(...cats: OmManualCategory[]): Set<OmManualCategory> {
    return new Set(cats);
  }

  it('is complete when at least one of every artifact set is present', () => {
    const result = isHandoverComplete({
      asBuiltCount: 1,
      omManualCategoriesPresent: asSet(
        'operations',
        'maintenance',
        'safety',
        'spare_parts',
      ),
      assetCount: 1,
    });
    expect(result.ok).toBe(true);
  });

  it('reports as_built when no drawings are filed', () => {
    const result = isHandoverComplete({
      asBuiltCount: 0,
      omManualCategoriesPresent: asSet(
        'operations',
        'maintenance',
        'safety',
        'spare_parts',
      ),
      assetCount: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('as_built_drawings');
  });

  it('reports asset_registrations when none are filed', () => {
    const result = isHandoverComplete({
      asBuiltCount: 1,
      omManualCategoriesPresent: asSet(
        'operations',
        'maintenance',
        'safety',
        'spare_parts',
      ),
      assetCount: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toContain('asset_registrations');
  });

  it('reports a specific om_manual category when it is missing', () => {
    const result = isHandoverComplete({
      asBuiltCount: 1,
      omManualCategoriesPresent: asSet('operations', 'maintenance', 'safety'),
      assetCount: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Spare parts entry missing — surfaced as a stable key.
    expect(result.missing).toContain('om_manual_spare_parts');
  });

  it('reports every missing om_manual category individually', () => {
    const result = isHandoverComplete({
      asBuiltCount: 1,
      omManualCategoriesPresent: asSet(),
      assetCount: 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(
      expect.arrayContaining([
        'om_manual_operations',
        'om_manual_maintenance',
        'om_manual_safety',
        'om_manual_spare_parts',
      ]),
    );
  });

  it('reports all three artifact families when the packet is empty', () => {
    const result = isHandoverComplete({
      asBuiltCount: 0,
      omManualCategoriesPresent: asSet(),
      assetCount: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // 1 + 4 + 1 = 6 missing keys for an empty packet.
    expect(result.missing).toHaveLength(6);
  });

  it('treats negative or fractional counts as zero (defensive)', () => {
    const result = isHandoverComplete({
      asBuiltCount: -1,
      omManualCategoriesPresent: asSet(
        'operations',
        'maintenance',
        'safety',
        'spare_parts',
      ),
      assetCount: 0.5,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(
      expect.arrayContaining(['as_built_drawings', 'asset_registrations']),
    );
  });
});
