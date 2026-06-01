import { describe, expect, it } from 'vitest';

import {
  shouldBlockNavigation,
  UNSAVED_CHANGES_PROMPT,
} from './unsaved-changes-guard';

describe('shouldBlockNavigation', () => {
  it('does not block when form is clean', () => {
    expect(shouldBlockNavigation({ dirty: false, submitting: false })).toBe(false);
    expect(shouldBlockNavigation({ dirty: false, submitting: true })).toBe(false);
  });

  it('blocks when dirty and not submitting', () => {
    expect(shouldBlockNavigation({ dirty: true, submitting: false })).toBe(true);
  });

  it('does not block during an active submit', () => {
    expect(shouldBlockNavigation({ dirty: true, submitting: true })).toBe(false);
  });
});

describe('UNSAVED_CHANGES_PROMPT', () => {
  it('is bilingual', () => {
    expect(UNSAVED_CHANGES_PROMPT).toMatch(/ออกจากหน้านี้/);
    expect(UNSAVED_CHANGES_PROMPT).toMatch(/Leave page/);
  });
});
