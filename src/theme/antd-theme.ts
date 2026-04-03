import type { ThemeConfig } from 'antd';

export const COLORS = {
  primary: '#1E3A5F',
  accentTeal: '#00B894',
  info: '#2D6BFF',
  warning: '#F39C12',
  error: '#E74C3C',
  success: '#27AE60',
  bgLayout: '#F5F7FA',
  sidebarDark: '#14181e',
  textDark: '#2C3E50',
  borderLight: '#E8ECF1',
} as const;

export const PROJECT_STATUS_COLORS = {
  planning: COLORS.info,
  inProgress: COLORS.info,
  onSchedule: COLORS.accentTeal,
  watch: COLORS.warning,
  delayed: COLORS.error,
  completed: COLORS.success,
  onHold: '#8C8C8C',
  draft: '#BFBFBF',
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
  pv: COLORS.info,       // Planned Value — blue dashed
  ev: COLORS.success,    // Earned Value — green solid
  ac: '#E17055',         // Actual Cost — orange solid
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
      headerBg: '#ffffff',
      headerHeight: 60,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: COLORS.primary,
      darkItemColor: 'rgba(255,255,255,0.65)',
      darkItemHoverColor: '#ffffff',
      darkItemSelectedBg: 'rgba(0,184,148,0.15)',
      darkItemSelectedColor: COLORS.accentTeal,
    },
    Card: {
      borderRadiusLG: 8,
    },
    Table: {
      headerBg: '#f0f2f5',
      rowHoverBg: '#f5f7fa',
    },
  },
};
