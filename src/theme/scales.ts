/**
 * Design-system scale tokens — type, line-height, and spacing.
 *
 * Source of truth for the project's size language. Inline `fontSize: NN`
 * and `margin: NN` magic numbers are an anti-pattern (UX redesign plan
 * gap G14); new code should reference these tokens instead.
 *
 * **Thai body-size floor.** Per Punsongserm & Suvakunta 2024 (peer-reviewed
 * Thai typography research), Thai body text should respect a minimum
 * glyph size derived from a 1.3 mm Bo Baimai (บ) loop height. Mapped to
 * web (96 DPI baseline, Noto Sans Thai metrics), this translates to a
 * conservative **14 px body floor** for dense Thai text. Smaller sizes
 * (e.g. captions at 12 px) are reserved for short Latin tokens or
 * decorative chips that do not carry meaning on their own.
 *
 * See {@link withThaiMinSize} for the runtime guard helper and
 * `CLAUDE.md` → Design System Tokens for the policy.
 */

/* ---------- Type scale --------------------------------------------------- */

export interface TypeScaleEntry {
  /** `rem`-based font size; rendered at the default 16 px root. */
  size: `${number}rem`;
  /** Line-height in `rem`; never smaller than `size` (no descender clipping). */
  lineHeight: `${number}rem`;
}

export const TYPE_SCALE = {
  xs: { size: '0.75rem', lineHeight: '1rem' }, //   12 px / 16 px — captions, badges
  sm: { size: '0.8125rem', lineHeight: '1.125rem' }, // 13 px / 18 px — secondary text
  base: { size: '0.875rem', lineHeight: '1.375rem' }, // 14 px / 22 px — body (AntD default; Thai floor)
  lg: { size: '1rem', lineHeight: '1.5rem' }, //    16 px / 24 px — preferred Thai body
  xl: { size: '1.125rem', lineHeight: '1.625rem' }, // 18 px / 26 px — section sub-headings
  '2xl': { size: '1.25rem', lineHeight: '1.75rem' }, // 20 px / 28 px — section headings
  '3xl': { size: '1.5rem', lineHeight: '2rem' }, //  24 px / 32 px — H3
  '4xl': { size: '2rem', lineHeight: '2.5rem' }, //  32 px / 40 px — page titles (H2)
  '5xl': { size: '2.5rem', lineHeight: '3rem' }, //  40 px / 48 px — display
} as const satisfies Record<string, TypeScaleEntry>;

export type TypeScaleToken = keyof typeof TYPE_SCALE;

export const TYPE_SCALE_TOKENS: readonly TypeScaleToken[] = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
] as const;

/* ---------- Spacing scale ------------------------------------------------ */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24, // matches AntD default Row/Col gutter
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const satisfies Record<string, number>;

export type SpacingToken = keyof typeof SPACING;

export const SPACING_TOKENS: readonly SpacingToken[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
] as const;

/* ---------- Thai body floor --------------------------------------------- */

/**
 * Minimum recommended body font size for dense Thai text. Values below
 * this should either route through {@link withThaiMinSize} or be
 * justified inline (caption / decorative).
 */
export const THAI_BODY_SIZE_FLOOR_PX = 14;

/**
 * Clamp a target body size to the Thai legibility floor. No-op for sizes
 * at or above the floor.
 *
 * Use at call sites that compute font-size from variable data (e.g. a
 * density-driven table row), not for static labels — static labels
 * should reference a `TYPE_SCALE` token directly.
 */
export function withThaiMinSize(targetPx: number): number {
  return targetPx < THAI_BODY_SIZE_FLOOR_PX ? THAI_BODY_SIZE_FLOOR_PX : targetPx;
}

/* ---------- Unit helpers ------------------------------------------------- */

/**
 * Converts a `rem` string to its CSS pixel value at the browser-default
 * 16 px root font-size. Used by tests + by call sites that need to feed
 * `rem` tokens into px-based APIs (AntD's `token.fontSize` is `number`
 * in px, not `rem`).
 */
export function pxFromRem(rem: `${number}rem`): number {
  const numeric = Number.parseFloat(rem);
  return Math.round(numeric * 16 * 1000) / 1000;
}
