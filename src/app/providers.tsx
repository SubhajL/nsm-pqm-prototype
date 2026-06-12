'use client';

import { ConfigProvider, theme as antdAlgorithm } from 'antd';
import '@/lib/dayjs-buddhist';
import { thaiBuddhistLocale } from '@/lib/antd-thai-locale';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import {
  ThemePreferenceProvider,
  useThemePreference,
} from '@/hooks/useThemePreference';
import { antdTheme } from '@/theme/antd-theme';
import { DARK_COLORS } from '@/theme/dark-theme';

/**
 * Sprint 4 (E1) — Theme-aware ConfigProvider.
 *
 * Light tokens live in `antdTheme` (PR-A1 lock). For dark mode we
 * compose AntD's `darkAlgorithm` with overrides from `DARK_COLORS`
 * so the brand identity carries across both modes. Tokens not
 * overridden here fall through to AntD's algorithm defaults.
 */
function ThemedConfigProvider({ children }: { children: React.ReactNode }) {
  const { resolved } = useThemePreference();

  const themeConfig = useMemo(() => {
    if (resolved === 'light') {
      return antdTheme;
    }
    return {
      ...antdTheme,
      algorithm: antdAlgorithm.darkAlgorithm,
      token: {
        ...antdTheme.token,
        colorPrimary: DARK_COLORS.primary,
        colorSuccess: DARK_COLORS.success,
        colorWarning: DARK_COLORS.warning,
        colorError: DARK_COLORS.error,
        colorInfo: DARK_COLORS.info,
        colorBgLayout: DARK_COLORS.bgLayout,
        colorTextSecondary: DARK_COLORS.textMuted,
      },
      components: {
        ...antdTheme.components,
        Layout: {
          ...(antdTheme.components?.Layout ?? {}),
          siderBg: DARK_COLORS.sidebarDark,
          headerBg: DARK_COLORS.surfaceMuted,
        },
        Menu: {
          ...(antdTheme.components?.Menu ?? {}),
          darkItemBg: DARK_COLORS.sidebarDark,
          // Sprint 4 (E2) — bolder selected-state on the sidebar.
          // The teal-tint background sits at 20% alpha so it reads in
          // both modes without overwhelming the row.
          darkItemSelectedBg: 'rgba(38, 212, 170, 0.20)',
        },
        Table: {
          ...(antdTheme.components?.Table ?? {}),
          headerBg: DARK_COLORS.tableHeaderBg,
          rowHoverBg: DARK_COLORS.surfaceSubtle,
        },
      },
    };
  }, [resolved]);

  return (
    <ConfigProvider locale={thaiBuddhistLocale} theme={themeConfig}>
      {children}
    </ConfigProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <ThemePreferenceProvider>
        <ThemedConfigProvider>{children}</ThemedConfigProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}
