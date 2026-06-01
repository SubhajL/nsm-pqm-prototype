import { redirect } from 'next/navigation';

import { LoginScreen } from '@/components/auth/LoginScreen';
import { getCookieBoundUserForServerComponent } from '@/lib/project-api-access';

interface LoginPageProps {
  searchParams?: {
    next?: string;
    reason?: string;
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Phase 1 — DB-validate the cookie before bouncing to /dashboard.
  // Middleware no longer does this (cookie-only routing avoids
  // infinite-loop deadlocks for suspended users). A fresh DB lookup
  // here means the happy-path active user still gets bounced straight
  // to the dashboard, while suspended/deleted/role-changed users see
  // the login screen and can re-authenticate.
  //
  // The `reason` param (e.g. `?reason=role_changed` from the admin/
  // executive layouts) is set when an HTML layout has detected a
  // session drift and explicitly wants the user to re-authenticate.
  // In that case skip the active-redirect so the form is shown — the
  // `LoginScreen`'s on-submit `queryClient.clear()` will flush any
  // stale React Query data that was cached before the role/status
  // drift.
  const reason = typeof searchParams?.reason === 'string' ? searchParams.reason : null;
  const user = await getCookieBoundUserForServerComponent();
  if (!reason && user && user.status === 'active') {
    redirect('/dashboard');
  }
  const nextPath = typeof searchParams?.next === 'string' ? searchParams.next : null;
  return <LoginScreen nextPath={nextPath} />;
}
