import { redirect } from 'next/navigation';

import { canAccessExecutive } from '@/lib/auth';
import { getCookieBoundUserForServerComponent } from '@/lib/project-api-access';

/**
 * Phase 1 — Server-Component layout for `/executive/*`. Server-side
 * authoritative role/status check; same rationale as the admin layout.
 */
export default async function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCookieBoundUserForServerComponent();
  if (!user) {
    redirect('/login?next=/executive');
  }
  if (user.status !== 'active') {
    redirect('/login?reason=suspended');
  }
  if (!canAccessExecutive(user.role)) {
    redirect('/login?reason=role_changed&next=/executive');
  }
  return <>{children}</>;
}
