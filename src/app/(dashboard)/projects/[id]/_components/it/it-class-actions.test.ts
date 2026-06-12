import { describe, expect, it } from 'vitest';

import type { KnowledgeAreaNote } from '@/types/knowledge-area-note';

import {
  canManageItClass,
  getLegalNextSowStates,
  isItOnlyFeatureError,
  latestNote,
  sprintHealthVisual,
} from './it-class-actions';

describe('getLegalNextSowStates', () => {
  it('follows the DT6 SOW graph from each non-terminal state', () => {
    expect(getLegalNextSowStates('draft')).toEqual(['agreed']);
    expect(getLegalNextSowStates('agreed')).toEqual(['in_delivery']);
    expect(getLegalNextSowStates('in_delivery')).toEqual(['uat']);
    expect(getLegalNextSowStates('uat')).toEqual(['accepted', 'rejected']);
  });

  it('treats accepted as terminal and rejected as rework-to-delivery', () => {
    expect(getLegalNextSowStates('accepted')).toEqual([]);
    expect(getLegalNextSowStates('rejected')).toEqual(['in_delivery']);
  });

  it('never includes the self-transition', () => {
    for (const state of [
      'draft',
      'agreed',
      'in_delivery',
      'uat',
      'accepted',
      'rejected',
    ] as const) {
      expect(getLegalNextSowStates(state)).not.toContain(state);
    }
  });
});

describe('canManageItClass', () => {
  it('allows System Admin and Project Manager only', () => {
    expect(canManageItClass('System Admin')).toBe(true);
    expect(canManageItClass('Project Manager')).toBe(true);
    expect(canManageItClass('Engineer')).toBe(false);
    expect(canManageItClass('Consultant')).toBe(false);
    expect(canManageItClass(null)).toBe(false);
    expect(canManageItClass(undefined)).toBe(false);
  });
});

describe('latestNote', () => {
  const note = (version: number): KnowledgeAreaNote =>
    ({ id: `n${version}`, version }) as KnowledgeAreaNote;

  it('returns null for empty or missing lists', () => {
    expect(latestNote([])).toBeNull();
    expect(latestNote(undefined)).toBeNull();
  });

  it('returns the highest-version note regardless of order', () => {
    expect(latestNote([note(2), note(5), note(3)])?.version).toBe(5);
  });
});

describe('isItOnlyFeatureError', () => {
  it('matches the IT-only guard by code or 422 status', () => {
    expect(isItOnlyFeatureError({ code: 'IT_ONLY_FEATURE' })).toBe(true);
    expect(isItOnlyFeatureError({ status: 422 })).toBe(true);
    expect(isItOnlyFeatureError({ code: 'NOT_FOUND', status: 404 })).toBe(false);
    expect(isItOnlyFeatureError(null)).toBe(false);
  });
});

describe('sprintHealthVisual', () => {
  it('maps each health band to a bilingual label + tag color', () => {
    expect(sprintHealthVisual('on_track')).toEqual({
      label: 'ทันกำหนด (On Track)',
      color: 'success',
    });
    expect(sprintHealthVisual('at_risk')).toEqual({
      label: 'เสี่ยง (At Risk)',
      color: 'warning',
    });
    expect(sprintHealthVisual('off_track')).toEqual({
      label: 'ล่าช้า (Off Track)',
      color: 'error',
    });
  });
});
