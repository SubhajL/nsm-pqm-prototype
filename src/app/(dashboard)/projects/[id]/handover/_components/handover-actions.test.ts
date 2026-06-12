import { describe, expect, it } from 'vitest';

import type { AsBuiltDrawing } from '@/types/as-built-drawing';
import type { AssetRegistration } from '@/types/asset-registration';
import type { OmManualEntry } from '@/types/om-manual';

import {
  canManageHandover,
  completenessFromRecords,
  getLegalNextHandoverStates,
  missingArtifactLabel,
  requiresCompleteness,
} from './handover-actions';

describe('getLegalNextHandoverStates', () => {
  it('follows the SOP 8.1 graph from each non-terminal state', () => {
    expect(getLegalNextHandoverStates('draft')).toEqual(['submitted']);
    expect(getLegalNextHandoverStates('submitted')).toEqual(['committee_review']);
    expect(getLegalNextHandoverStates('committee_review')).toEqual([
      'accepted',
      'rejected',
    ]);
  });

  it('treats accepted as terminal and rejected as revise-to-draft', () => {
    expect(getLegalNextHandoverStates('accepted')).toEqual([]);
    expect(getLegalNextHandoverStates('rejected')).toEqual(['draft']);
  });

  it('never includes the self-transition', () => {
    for (const state of [
      'draft',
      'submitted',
      'committee_review',
      'accepted',
      'rejected',
    ] as const) {
      expect(getLegalNextHandoverStates(state)).not.toContain(state);
    }
  });
});

describe('canManageHandover', () => {
  it('allows System Admin and Project Manager only', () => {
    expect(canManageHandover('System Admin')).toBe(true);
    expect(canManageHandover('Project Manager')).toBe(true);
    expect(canManageHandover('Engineer')).toBe(false);
    expect(canManageHandover('Executive')).toBe(false);
    expect(canManageHandover(null)).toBe(false);
    expect(canManageHandover(undefined)).toBe(false);
  });
});

describe('completenessFromRecords', () => {
  const drawing = { id: 'd1' } as AsBuiltDrawing;
  const asset = { id: 'a1' } as AssetRegistration;
  const om = (category: OmManualEntry['category']): OmManualEntry =>
    ({ id: `om-${category}`, category }) as OmManualEntry;

  it('reports every artifact missing for an empty packet', () => {
    const result = completenessFromRecords([], [], []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual([
        'as_built_drawings',
        'om_manual_operations',
        'om_manual_maintenance',
        'om_manual_safety',
        'om_manual_spare_parts',
        'asset_registrations',
      ]);
    }
  });

  it('is complete with one drawing, all four manual categories, one asset', () => {
    const result = completenessFromRecords(
      [drawing],
      [om('operations'), om('maintenance'), om('safety'), om('spare_parts')],
      [asset],
    );
    expect(result).toEqual({ ok: true });
  });

  it('flags only the missing manual categories', () => {
    const result = completenessFromRecords(
      [drawing],
      [om('operations'), om('operations'), om('safety')],
      [asset],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual([
        'om_manual_maintenance',
        'om_manual_spare_parts',
      ]);
    }
  });
});

describe('requiresCompleteness', () => {
  it('gates the forward path but exempts the revise loop', () => {
    expect(requiresCompleteness('submitted')).toBe(true);
    expect(requiresCompleteness('committee_review')).toBe(true);
    expect(requiresCompleteness('accepted')).toBe(true);
    expect(requiresCompleteness('rejected')).toBe(false);
    expect(requiresCompleteness('draft')).toBe(false);
  });
});

describe('missingArtifactLabel', () => {
  it('maps every completeness key to a bilingual label', () => {
    expect(missingArtifactLabel('as_built_drawings')).toContain('แบบก่อสร้างจริง');
    expect(missingArtifactLabel('as_built_drawings')).toContain('As-built');
    expect(missingArtifactLabel('om_manual_safety')).toContain('ความปลอดภัย');
    expect(missingArtifactLabel('asset_registrations')).toContain('ทะเบียนทรัพย์สิน');
  });

  it('falls back to the raw key for unknown values', () => {
    expect(missingArtifactLabel('something_else')).toBe('something_else');
  });
});
