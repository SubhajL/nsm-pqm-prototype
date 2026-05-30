/**
 * WCAG 2.x contrast helpers.
 *
 * Pure functions (no React, no DOM) so they can be invoked from tests,
 * build-time scripts, and design-token audits. The math is per WCAG 2.x
 * Success Criterion 1.4.3 (contrast minimum) and 1.4.11 (non-text
 * contrast). All inputs are sRGB hex strings.
 *
 * Used by:
 * - `palette-contrast.test.ts` — locks every non-exempt token in
 *   `COLORS` at ≥ AA contrast against its intended background, so a
 *   future tweak that quietly drops a token below 4.5:1 fails CI.
 * - `auditPaletteContrast()` — exposes per-token ratios for one-off
 *   audits during a redesign.
 */

const HEX3 = /^[0-9a-f]{3}$/i;
const HEX6 = /^[0-9a-f]{6}$/i;

function parseHex(hex: string): [number, number, number] {
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex;
  if (HEX3.test(cleaned)) {
    const [r, g, b] = cleaned.split('') as [string, string, string];
    return [
      Number.parseInt(`${r}${r}`, 16),
      Number.parseInt(`${g}${g}`, 16),
      Number.parseInt(`${b}${b}`, 16),
    ];
  }
  if (HEX6.test(cleaned)) {
    return [
      Number.parseInt(cleaned.slice(0, 2), 16),
      Number.parseInt(cleaned.slice(2, 4), 16),
      Number.parseInt(cleaned.slice(4, 6), 16),
    ];
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

function linearise(channel: number): number {
  const v = channel / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * WCAG relative luminance of an sRGB color. 0 = black, 1 = white.
 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (
    0.2126 * linearise(r) +
    0.7152 * linearise(g) +
    0.0722 * linearise(b)
  );
}

/**
 * WCAG contrast ratio between two sRGB hex colors. Symmetric; values
 * range from 1 (identical) to 21 (black on white).
 */
export function getContrastRatio(a: string, b: string): number {
  const la = getRelativeLuminance(a);
  const lb = getRelativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface WcagOptions {
  /**
   * Set true when the text is `≥ 18 pt (~24 px)` or `≥ 14 pt (~18.66 px) bold`
   * per WCAG SC 1.4.3 — relaxes the minimum ratio from 4.5 to 3.0.
   */
  isLargeText?: boolean;
  /**
   * Set true when the assessed color is a non-text UI component or a
   * graphical object required to understand content (WCAG SC 1.4.11) —
   * minimum ratio is 3.0 instead of 4.5.
   */
  isNonText?: boolean;
}

/**
 * Whether the foreground/background pair meets WCAG 2.x AA.
 * Defaults to the strict 4.5:1 minimum for normal body text.
 */
export function meetsWcagAA(
  foreground: string,
  background: string,
  options: WcagOptions = {},
): boolean {
  const threshold = options.isLargeText || options.isNonText ? 3 : 4.5;
  return getContrastRatio(foreground, background) >= threshold;
}

/* ---------- Palette audit ----------------------------------------------- */

export interface PaletteAuditEntry {
  /** Foreground hex evaluated for the token. */
  fg: string;
  /** WCAG contrast ratio against the supplied background, rounded to 2dp. */
  ratio: number;
  /** Whether the pair satisfies the chosen AA threshold. */
  passes: boolean;
  /** Threshold that was applied (4.5 for normal, 3 for large/non-text). */
  threshold: number;
}

export type PaletteInput = Record<string, string | ({ fg: string } & WcagOptions)>;

export type PaletteAuditResult<P extends PaletteInput> = {
  [K in keyof P]: PaletteAuditEntry;
};

/**
 * Computes per-token contrast and AA pass/fail against a single
 * background. Use for one-off audits during a redesign; the project's
 * locked invariants live in `palette-contrast.test.ts`.
 */
function normaliseEntry(
  raw: string | ({ fg: string } & WcagOptions),
): { fg: string } & WcagOptions {
  return typeof raw === 'string' ? { fg: raw } : raw;
}

export function auditPaletteContrast<P extends PaletteInput>(
  palette: P,
  background: string,
): PaletteAuditResult<P> {
  const out = {} as PaletteAuditResult<P>;
  for (const key of Object.keys(palette) as Array<keyof P>) {
    const entry = normaliseEntry(palette[key]);
    const threshold = entry.isLargeText || entry.isNonText ? 3 : 4.5;
    const ratio = getContrastRatio(entry.fg, background);
    out[key] = {
      fg: entry.fg,
      ratio: Math.round(ratio * 100) / 100,
      passes: ratio >= threshold,
      threshold,
    };
  }
  return out;
}
