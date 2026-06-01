import { redirect } from 'next/navigation';

import { canAccessAdmin } from '@/lib/auth';
import { getCookieBoundUserForServerComponent } from '@/lib/project-api-access';

/**
 * Phase 1 — Server-Component layout for `/admin/*`.
 *
 * Server-side authoritative role/status check. The middleware now
 * trusts the `pqm_user_role` cookie for HTML routing, which is fine
 * for fast routing but can drift if an admin changes a user's role
 * mid-session — the demoted user's cached role cookie still points
 * at "System Admin" until their next login. This layout enforces the
 * canonical DB-backed check before any admin page renders, closing
 * the React-Query-cache visibility window Codex flagged.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCookieBoundUserForServerComponent();
  if (!user) {
    redirect('/login?next=/admin');
  }
  if (user.status !== 'active') {
    // Suspended / deleted mid-session — force re-login so the client
    // QueryClient cache (which still holds privileged data they had
    // access to before) is cleared by `LoginScreen`'s on-submit
    // `queryClient.clear()`.
    redirect('/login?reason=suspended');
  }
  if (!canAccessAdmin(user.role)) {
    // Same rationale for a role demotion mid-session.
    redirect('/login?reason=role_changed&next=/admin');
  }
  return <>{children}</>;
}
