'use client';

import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import { antdTheme } from '@/theme/antd-theme';

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
      <ConfigProvider theme={antdTheme}>{children}</ConfigProvider>
    </QueryClientProvider>
  );
}
