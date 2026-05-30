import { describe, expect, it } from 'vitest';

import tailwindConfig from '../../tailwind.config';

import { COLORS } from './antd-theme';
import { SPACING, SPACING_TOKENS, TYPE_SCALE, TYPE_SCALE_TOKENS } from './scales';

/**
 * PR-A1 drift guard: tailwind.config.ts mirrors `TYPE_SCALE` / `SPACING`
 * / `COLORS` for class-based styling. If the source of truth in
 * `src/theme/*` changes but the Tailwind mirror is forgotten, AntD
 * tokens and Tailwind classes silently diverge — these tests fail
 * before that drift can land.
 */

interface NormalisedTailwindFontSize {
  size: string;
  lineHeight: string;
}

function normaliseFontSize(value: unknown): NormalisedTailwindFontSize {
  if (Array.isArray(value)) {
    const [size, opts] = value as [string, { lineHeight?: string } | undefined];
    return { size, lineHeight: opts?.lineHeight ?? '' };
  }
  return { size: String(value), lineHeight: '' };
}

describe('tailwind.config.ts mirrors TYPE_SCALE', () => {
  const tailwindFontSize = tailwindConfig.theme?.extend?.fontSize ?? {};

  it.each(TYPE_SCALE_TOKENS)(
    'has the `%s` font-size entry matching scales.ts',
    (token) => {
      const expected = TYPE_SCALE[token];
      const actual = normaliseFontSize(
        (tailwindFontSize as Record<string, unknown>)[token],
      );
      expect(actual.size).toBe(expected.size);
      expect(actual.lineHeight).toBe(expected.lineHeight);
    },
  );
});

describe('tailwind.config.ts mirrors SPACING (via tk-* aliases)', () => {
  const tailwindSpacing = tailwindConfig.theme?.extend?.spacing ?? {};

  it.each(SPACING_TOKENS)('has the `tk-%s` spacing alias', (token) => {
    const actual = (tailwindSpacing as Record<string, unknown>)[`tk-${token}`];
    expect(actual).toBe(`${SPACING[token]}px`);
  });
});

describe('tailwind.config.ts mirrors COLORS for raised + variant tokens', () => {
  // Only the tokens the redesign explicitly raised / added in PR-A1
  // are pinned here — the full color palette is not duplicated 1:1
  // (Tailwind uses kebab-case aliases, not all of COLORS need a class).
  const tailwindColors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>;

  it.each([
    ['text-muted', 'textMuted'],
    ['info', 'info'],
    ['accent-teal-text', 'accentTealText'],
    ['warning-text', 'warningText'],
    ['success-text', 'successText'],
    ['error-text', 'errorText'],
  ] as const)(
    'tailwind `%s` mirrors `COLORS.%s`',
    (tailwindKey, colorKey) => {
      expect(tailwindColors[tailwindKey]?.toLowerCase()).toBe(
        COLORS[colorKey].toLowerCase(),
      );
    },
  );
});
