import type { ThemeConfig } from 'antd';

export const COLORS = {
  // Brand & status -----------------------------------------------------
  primary: '#1E3A5F',
  accentTeal: '#00B894',
  info: '#2D6BFF',
  warning: '#F39C12',
  error: '#E74C3C',
  success: '#27AE60',

  // Layout / shell -----------------------------------------------------
  bgLayout: '#F5F7FA',
  sidebarDark: '#14181e',
  textDark: '#2C3E50',
  white: '#ffffff',

  // Neutral grayscale (text & borders) ---------------------------------
  textMuted: '#8c8c8c',
  textDisabled: '#bfbfbf',
  neutralGray: '#d9d9d9',
  borderSoft: '#f0f0f0',
  borderLight: '#E8ECF1',

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
    borderRadius: 8,
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
