import { describe, expect, it } from 'vitest';

import { COLORS } from './antd-theme';
import { getContrastRatio } from './contrast';

/**
 * PR-A1 — palette WCAG-AA lock-in test.
 *
 * Every token below is asserted to satisfy WCAG 2.x AA against the
 * background(s) it is INTENDED to be rendered on. Tokens that are
 * themselves background fills, decorative gradient cells, or
 * disabled-state placeholders are explicitly exempt with a comment.
 *
 * If a future tweak drops a non-exempt token below 4.5:1 (normal text)
 * or 3:1 (non-text UI / large text), CI must turn red. Raise the token
 * value rather than silencing the test.
 */

const WHITE = '#ffffff';
const BG_LAYOUT = COLORS.bgLayout;

/** Tokens rendered AS NORMAL BODY TEXT on the surface backgrounds. */
const NORMAL_TEXT_ON_LIGHT: Array<{ token: keyof typeof COLORS; bg: string }> = [
  { token: 'primary', bg: WHITE },
  { token: 'primary', bg: BG_LAYOUT },
  { token: 'textDark', bg: WHITE },
  { token: 'textDark', bg: BG_LAYOUT },
  { token: 'textMuted', bg: WHITE }, // PR-A1: raised from #8c8c8c → #595959
  { token: 'info', bg: WHITE },
  { token: 'info', bg: BG_LAYOUT }, // PR-A1: darkened from #2D6BFF → #1D5EE6 to pass here too
  { token: 'accentTealText', bg: WHITE },
  { token: 'warningText', bg: WHITE },
  { token: 'successText', bg: WHITE },
  { token: 'errorText', bg: WHITE },
];

/** Tokens rendered AS WHITE TEXT (or near-white) on a dark background. */
const NORMAL_TEXT_ON_DARK: Array<{ token: keyof typeof COLORS; bg: string }> = [
  { token: 'white', bg: COLORS.sidebarDark },
  { token: 'white', bg: COLORS.primary },
];

describe('COLORS palette — WCAG-AA on light backgrounds', () => {
  it.each(NORMAL_TEXT_ON_LIGHT)(
    '`$token` on `$bg` ≥ 4.5:1 (AA normal text)',
    ({ token, bg }) => {
      const ratio = getContrastRatio(COLORS[token], bg);
      expect(
        ratio,
        `${token} (${COLORS[token]}) on ${bg}: got ratio ${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('COLORS palette — WCAG-AA on dark backgrounds', () => {
  it.each(NORMAL_TEXT_ON_DARK)(
    '`$token` on `$bg` ≥ 4.5:1 (AA normal text)',
    ({ token, bg }) => {
      const ratio = getContrastRatio(COLORS[token], bg);
      expect(
        ratio,
        `${token} (${COLORS[token]}) on ${bg}: got ratio ${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});

/**
 * Brand status colors (`accentTeal`, `warning`, `success`, `error`) are
 * INTENTIONALLY exempt from the normal-text AA rule because they encode
 * the project's visual identity and currently render below 4.5:1 on
 * white. They are documented as suitable only for:
 *   - Large/heavy text (`≥ 18 pt` or `≥ 14 pt bold`, where AA relaxes to 3:1)
 *   - Filled chips/tags where the foreground is white-on-color
 *   - Tinted backgrounds (`successBg`, `warningBg`, etc.) where the
 *     darker `*Text` variants above carry the actual reading load
 *
 * The corresponding `*Text` variants exist for any "status color
 * rendered as text on white" call site.
 */
describe('COLORS palette — documented brand-color exemptions', () => {
  const brandExempt = ['accentTeal', 'warning', 'success', 'error'] as const;
  it.each(brandExempt)(
    '`%s` is documented as a brand color, not a normal-text foreground',
    (token) => {
      // We only assert the token exists. The actual exemption is
      // policy + CLAUDE.md docs; the test exists so a maintainer who
      // tries to delete the exemption block notices the relationship.
      expect(COLORS[token]).toMatch(/^#[0-9a-fA-F]{6}$/);
    },
  );
});
