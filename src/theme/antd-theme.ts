import type { ThemeConfig } from 'antd';

import { TYPE_SCALE, pxFromRem } from './scales';

export const COLORS = {
  // Brand & status -----------------------------------------------------
  // The four status colors below are tuned for visual identity; they
  // currently sit BELOW WCAG-AA 4.5:1 on white and are reserved for
  // filled chips (white-on-color), tinted backgrounds, or large/heavy
  // headings. For any "status color rendered as normal body text on
  // white" use case, reach for the matching `*Text` variant defined
  // further down. See `palette-contrast.test.ts` and CLAUDE.md.
  primary: '#1E3A5F',
  accentTeal: '#00B894',
  // `info` darkened in PR-A1 from #2D6BFF (≈ 4.51:1 on white, but only
  // 4.20:1 on bgLayout — fails AA) → #1D5EE6 (5.53:1 / 5.16:1) so the
  // same token can carry text on both backgrounds.
  info: '#1D5EE6',
  warning: '#F39C12',
  error: '#E74C3C',
  success: '#27AE60',

  // Layout / shell -----------------------------------------------------
  bgLayout: '#F5F7FA',
  sidebarDark: '#14181e',
  textDark: '#2C3E50',
  white: '#ffffff',

  // Neutral grayscale (text & borders) ---------------------------------
  // `textMuted` was bumped from #8C8C8C (≈ 3.36:1 on white) to #595959
  // (≈ 6.69:1) in PR-A1 to satisfy WCAG-AA SC 1.4.3 for normal text.
  textMuted: '#595959',
  textDisabled: '#bfbfbf',
  neutralGray: '#d9d9d9',
  borderSoft: '#f0f0f0',
  borderLight: '#E8ECF1',

  // AA-compliant text variants of the four brand status colors.
  // Use these whenever the color carries reading load on a white or
  // light-tint background. Each is ≥ 4.5:1 on white.
  accentTealText: '#00755C', // ≈ 5.68:1 on white
  warningText: '#A05E00', //   ≈ 5.13:1 on white
  successText: '#1B7A45', //   ≈ 5.36:1 on white
  errorText: '#B7341C', //     ≈ 5.96:1 on white

  // Muted surface backgrounds ------------------------------------------
  surfaceMuted: '#fafafa',
  surfaceSubtle: '#FAFBFC',
  surfaceSoft: '#f5f5f5',
  surfaceCool: '#f8f9fb',
  surfaceCoolAlt: '#f8f9fa',
  tableHeaderBg: '#f0f2f5',

  // Status tints (light backgrounds & borders) -------------------------
  successBg: '#f6ffed',
  successBorder: '#b7eb8f',
  errorBg: '#fff2f0',
  errorBgAlt: '#fff1f0',
  errorBorder: '#ffccc7',
  warningBg: '#fff7e6',
  warningBorder: '#ffd591',
  infoBg: '#f0f7ff',
  tealLight: '#E8F4F1',

  // Risk matrix gradient -----------------------------------------------
  riskMedium: '#F1C40F',
  riskHigh: '#E67E22',

  // Gantt visualisation -------------------------------------------------
  baselineBar: '#E8ECF1',

  // Misc semantic accents ----------------------------------------------
  weatherCloud: '#95A5A6',
  chartGreenAlt: '#52c41a',
  chartActualCost: '#E17055',
} as const;

export const PROJECT_STATUS_COLORS = {
  planning: COLORS.info,
  inProgress: COLORS.info,
  onSchedule: COLORS.accentTeal,
  watch: COLORS.warning,
  delayed: COLORS.error,
  completed: COLORS.success,
  onHold: '#8C8C8C',
  draft: COLORS.textDisabled,
  cancelled: COLORS.error,
} as const;

export const CHART_COLORS = {
  primary: COLORS.primary,
  teal: COLORS.accentTeal,
  info: COLORS.info,
  warning: COLORS.warning,
  error: COLORS.error,
  success: COLORS.success,
  planning: PROJECT_STATUS_COLORS.planning,
  watch: PROJECT_STATUS_COLORS.watch,
  delayed: PROJECT_STATUS_COLORS.delayed,
  completed: PROJECT_STATUS_COLORS.completed,
  pv: COLORS.info,                   // Planned Value — blue dashed
  ev: COLORS.success,                // Earned Value — green solid
  ac: COLORS.chartActualCost,        // Actual Cost — orange solid
} as const;

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: COLORS.primary,
    colorSuccess: COLORS.success,
    colorWarning: COLORS.warning,
    colorError: COLORS.error,
    colorInfo: COLORS.info,
    colorBgLayout: COLORS.bgLayout,
    colorTextSecondary: COLORS.textMuted,
    borderRadius: 8,
    // Type tokens sourced from `scales.ts` so AntD components and any
    // direct CSS share the same scale. `base` (14 px) is the Thai body
    // floor per Punsongserm & Suvakunta 2024; see scales.ts JSDoc.
    fontSize: pxFromRem(TYPE_SCALE.base.size),
    fontSizeSM: pxFromRem(TYPE_SCALE.sm.size),
    fontSizeLG: pxFromRem(TYPE_SCALE.lg.size),
    fontSizeXL: pxFromRem(TYPE_SCALE.xl.size),
    fontSizeHeading1: pxFromRem(TYPE_SCALE['5xl'].size),
    fontSizeHeading2: pxFromRem(TYPE_SCALE['4xl'].size),
    fontSizeHeading3: pxFromRem(TYPE_SCALE['3xl'].size),
    fontSizeHeading4: pxFromRem(TYPE_SCALE['2xl'].size),
    fontSizeHeading5: pxFromRem(TYPE_SCALE.xl.size),
    fontFamily:
      "'Noto Sans Thai', 'Thonburi', 'Sukhumvit Set', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif",
  },
  components: {
    Layout: {
      siderBg: COLORS.primary,
      headerBg: COLORS.white,
      headerHeight: 60,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: COLORS.primary,
      darkItemColor: 'rgba(255,255,255,0.65)',
      darkItemHoverColor: COLORS.white,
      darkItemSelectedBg: 'rgba(0,184,148,0.15)',
      darkItemSelectedColor: COLORS.accentTeal,
    },
    Card: {
      borderRadiusLG: 8,
    },
    Table: {
      headerBg: COLORS.tableHeaderBg,
      rowHoverBg: COLORS.bgLayout,
    },
  },
};
