/**
 * Sprint 4 (E1) — Dark-mode token bag.
 *
 * Mirrors the key shape of `src/theme/antd-theme.ts::COLORS`. Values are
 * chosen so every token used as normal body text on its intended dark
 * background satisfies WCAG-AA (≥ 4.5:1). The locked-in checks live in
 * `palette-contrast.test.ts` — extending those tests is mandatory when
 * a new dark-mode text token is added.
 *
 * Brand status colors stay close to the light-mode values; reading-load
 * variants (`*Text`) are LIGHTENED so they pass AA on the dark canvas.
 */

import { COLORS } from './antd-theme';

export const DARK_COLORS = {
  // Brand & status — same brand identity, slightly desaturated for dark
  // background harmony but visually recognisable as the same hue.
  // NOTE: `primary` is a FILL-ONLY token in dark mode. At 2.82:1 on
  // `bgLayout` it is below WCAG AA for text (4.5:1) and below the 3:1
  // non-text UI floor. Use it for AntD's `colorPrimary` (button fills,
  // tinted bg accents) only — never as foreground text or icon color.
  primary: '#3B5F8C',
  accentTeal: '#26D4AA',
  // `info` lightened from #1D5EE6 → #5B8DEF so it reads on dark surfaces.
  info: '#5B8DEF',
  warning: '#F39C12',
  error: '#FF6B5C',
  success: '#3DD685',

  // Layout / shell — the canonical dark surface trio. `bgLayout` is the
  // page background; `surfaceSoft` is the elevated card surface;
  // `tableHeaderBg` lives slightly above so headers still read.
  bgLayout: '#0F141B',
  sidebarDark: '#0A0D12', // even darker than the legacy sidebar
  textDark: '#E8ECF1', // role: primary body text on dark background
  white: '#ffffff', // unchanged

  // Neutral grayscale (text + borders) on dark background.
  // `textMuted` aims ≥ 4.5:1 on `bgLayout` (≈ 7.6:1).
  textMuted: '#A8B0BB',
  textDisabled: '#6F7785',
  neutralGray: '#3A414E',
  borderSoft: '#252B35',
  borderLight: '#2F3640',

  // AA-compliant text variants — lightened so they pass on the dark
  // `bgLayout` background instead of light.
  accentTealText: '#48E5BC', // ≈ 7.4:1 on bgLayout (#0F141B)
  warningText: '#FFCC66', //   ≈ 9.1:1 on bgLayout
  successText: '#5BE89D', //   ≈ 8.5:1 on bgLayout
  errorText: '#FF8A7C', //     ≈ 6.0:1 on bgLayout

  // Muted surface backgrounds — incremental elevation from `bgLayout`
  // upward. Cards/panels render on `surfaceMuted`; subtle headers on
  // `surfaceSoft`; table headers on `tableHeaderBg`.
  surfaceMuted: '#1A1F28',
  surfaceSubtle: '#1F2530',
  surfaceSoft: '#252B35',
  surfaceCool: '#1B2230',
  surfaceCoolAlt: '#1B2230',
  tableHeaderBg: '#2A323D',

  // Status tints (light-tint backgrounds in dark mode are subtle alpha
  // washes of the brand color so they don't fight the surface).
  successBg: 'rgba(39, 174, 96, 0.12)',
  successBorder: 'rgba(39, 174, 96, 0.40)',
  errorBg: 'rgba(231, 76, 60, 0.12)',
  errorBgAlt: 'rgba(231, 76, 60, 0.12)',
  errorBorder: 'rgba(231, 76, 60, 0.40)',
  warningBg: 'rgba(243, 156, 18, 0.12)',
  warningBorder: 'rgba(243, 156, 18, 0.40)',
  infoBg: 'rgba(29, 94, 230, 0.18)',
  tealLight: 'rgba(0, 184, 148, 0.18)',

  // Risk matrix gradient — same hues, slightly desaturated.
  riskMedium: '#F1C40F',
  riskHigh: '#E67E22',

  // Gantt visualisation — baseline bar uses the same `borderLight`
  // semantic in dark mode (slightly elevated surface band).
  baselineBar: '#2F3640',

  // Misc semantic accents — keep light values where they read fine on
  // the dark canvas (saturated mid-greens / oranges have ≥ 3:1).
  weatherCloud: '#A8B0BB',
  chartGreenAlt: '#52c41a',
  chartActualCost: '#FF8A6B',
} as const;

/**
 * Static check: `DARK_COLORS` must expose the same key set as `COLORS`.
 * Compile-time assertion only — no runtime value ships. If the two
 * shapes diverge, the `Assert<…>` line fails to typecheck.
 *
 * The tuple wrap `[K]` keeps the conditional non-distributive so the
 * union-of-literal keys produced by `as const` does not collapse the
 * comparison to `boolean`.
 */
type Assert<T extends true> = T;
type _MirrorKeysMatch = [keyof typeof DARK_COLORS] extends [keyof typeof COLORS]
  ? [keyof typeof COLORS] extends [keyof typeof DARK_COLORS]
    ? true
    : false
  : false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _MirrorOk = Assert<_MirrorKeysMatch>;
