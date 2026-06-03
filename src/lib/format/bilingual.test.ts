import { describe, expect, it } from 'vitest';

import { bilingual } from './bilingual';

/**
 * Tier 2 follow-up — bilingual label helper.
 *
 * The shell renders bilingual labels in `Thai (English)` form across
 * tags, segmented options, table columns, exports, and notifications.
 * `bilingual(thai, english, suffix?)` centralises that template so a
 * future tweak (eg full-width parens, locale tag, ARIA marker) is a
 * one-file edit.
 */

describe('bilingual', () => {
  it('renders the base `Thai (English)` form', () => {
    expect(bilingual('วางแผน', 'Planning')).toBe('วางแผน (Planning)');
  });

  it('appends an optional suffix with a single space separator', () => {
    expect(bilingual('ทั้งหมด', 'All', '· 12')).toBe('ทั้งหมด (All) · 12');
  });

  it('treats an empty suffix as no suffix (still single-line output)', () => {
    expect(bilingual('เสร็จสิ้น', 'Completed', '')).toBe('เสร็จสิ้น (Completed)');
  });

  it('preserves leading / trailing whitespace inside the Thai or English fragments verbatim', () => {
    // The helper does NOT trim — callers control padding.
    expect(bilingual(' วางแผน ', 'Planning')).toBe(' วางแผน  (Planning)');
  });

  it('keeps the order Thai-then-English (the shell convention)', () => {
    expect(bilingual('On Schedule', 'ตามแผน')).toBe('On Schedule (ตามแผน)');
  });
});
