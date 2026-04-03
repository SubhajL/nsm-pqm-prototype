# 2026-03-15 22:54:34 +0700

## Plan Draft A

### Overview
Add a lightweight mock authentication layer that behaves consistently across routing and UI: a login page, cookie-backed session, current-user store, role-based sidebar filtering, protected `/admin` and `/executive` routes, and per-user draft ownership for the new-project form. Keep the implementation prototype-friendly by using existing mock users and avoiding external auth providers.

### Files to Change
- `src/app/page.tsx` — redirect to `/login` or `/dashboard` based on session
- `src/app/login/page.tsx` — new mock login screen
- `src/app/api/auth/login/route.ts` — set auth cookies from selected mock user
- `src/app/api/auth/logout/route.ts` — clear auth cookies
- `src/app/api/auth/session/route.ts` — return current logged-in user
- `src/lib/auth.ts` — shared cookie names, role checks, redirect helpers
- `src/stores/useAuthStore.ts` — current-user client state
- `src/components/auth/AuthBootstrap.tsx` — hydrate store from session route
- `src/app/providers.tsx` — mount auth bootstrap
- `src/components/layout/Header.tsx` — show current user and logout
- `src/components/layout/Sidebar.tsx` — filter nav items by role
- `src/app/(dashboard)/projects/new/page.tsx` — scope drafts to current user
- `middleware.ts` — protect authenticated routes and role-gate `/admin` and `/executive`

### Implementation Steps
1. TDD sequence:
   1) Add/stub auth helper and route tests only if a harness exists
   2) Run failing validation command
   3) Implement cookie/session primitives
   4) Wire login page and client store
   5) Add middleware guards and role-filtered navigation
   6) Scope drafts to current user
   7) Run lint/build/typecheck
2. `src/lib/auth.ts`
   - Define cookie names, allowed roles per route group, and helpers to parse session cookies.
   - Centralize role checks so middleware and UI stay consistent.
3. `src/app/api/auth/*`
   - Create login, logout, and session endpoints backed by `src/data/users.json`.
   - Fail closed on unknown user IDs.
4. `src/stores/useAuthStore.ts` + `AuthBootstrap`
   - Hold the current user for UI rendering and hydrate it from `/api/auth/session`.
5. `src/app/login/page.tsx`
   - Provide a mock-user picker and sign-in action that writes cookies through the login API.
6. `middleware.ts`
   - Redirect unauthenticated users to `/login`.
   - Redirect authenticated but unauthorized users away from `/admin` and `/executive`.
7. `Header.tsx` + `Sidebar.tsx`
   - Display current user/role, add logout, and hide admin/executive nav items when role is not allowed.
8. `projects/new/page.tsx`
   - Change draft keys to include the logged-in user ID.
   - Only load/discard drafts owned by the current user.

### Test Coverage
- `auth session bootstrap`
  - hydrates current user from session endpoint
- `middleware auth guard`
  - redirects unauthenticated routes to login
- `middleware role guard`
  - blocks unauthorized `/admin` and `/executive`
- `user-scoped project draft`
  - isolates saved drafts by user ID

### Decision Completeness
- Goal:
  - Make login/session/role behavior real enough for a live prototype demo.
- Non-goals:
  - External identity providers, password auth, backend persistence, and API-wide authorization.
- Success criteria:
  - Unauthenticated users land on `/login`.
  - Logging in as different mock roles changes visible navigation.
  - `/admin` only works for `System Admin`.
  - `/executive` works for `Executive` and `System Admin`.
  - Save Draft only recalls drafts for the logged-in user.
- Public interfaces:
  - New routes: `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`
  - New cookies for session identity and role
- Edge cases / failure modes:
  - Missing/invalid cookie: fail closed to `/login`
  - Unknown user ID submitted to login API: reject
  - Draft exists for another user: do not load it
- Rollout & monitoring:
  - No feature flag; prototype-only rollout
  - Smoke test login with at least three roles
- Acceptance checks:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - manual browser check for `/login`, `/dashboard`, `/admin`, `/executive`, `/projects/new`

### Dependencies
- Existing mock user catalog in `src/data/users.json`
- Next.js middleware and route handlers

### Validation
- Sign in as `System Admin`, `Executive`, and `Project Manager`
- Verify route access and sidebar visibility
- Save a draft as one user, switch users, and confirm it does not appear

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `src/app/login/page.tsx` | `/login` route render | App Router file convention | `src/data/users.json` |
| `src/app/api/auth/login/route.ts` | login form submit | App Router route handler | `src/data/users.json` |
| `src/app/api/auth/logout/route.ts` | header logout action | App Router route handler | N/A |
| `src/app/api/auth/session/route.ts` | app bootstrap fetch | App Router route handler | `src/data/users.json` |
| `src/stores/useAuthStore.ts` | header/sidebar/login client state | imported by bootstrap/header/sidebar/page | N/A |
| `middleware.ts` | every page request | Next.js middleware runtime | session cookies |
| `projects/new` draft scoping | new project page mount/save | `src/app/(dashboard)/projects/new/page.tsx` | browser localStorage |

## Plan Draft B

### Overview
Implement a smaller client-only auth model using `localStorage` and client redirects, with no middleware. This reduces moving parts but weakens route protection because unauthorized pages can still briefly render and deep links are not truly protected.

### Files to Change
- `src/stores/useAuthStore.ts`
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/projects/new/page.tsx`

### Implementation Steps
1. Add persisted auth store using `localStorage`.
2. Build login page that writes selected mock user into the store.
3. Redirect from root and dashboard layout in client code.
4. Filter sidebar by role and scope drafts by current user.

### Test Coverage
- `client login redirect`
  - sends unauthenticated users to login
- `sidebar role filtering`
  - hides unauthorized nav entries
- `draft ownership`
  - isolates stored drafts by user

### Decision Completeness
- Goal:
  - Fastest possible role-aware prototype flow
- Non-goals:
  - True server-side protection
- Success criteria:
  - UI changes by selected user role
  - login survives reloads
- Public interfaces:
  - New `/login` page
  - persisted browser state only
- Edge cases / failure modes:
  - Browser storage cleared: logged out
  - Deep links before hydration: fail open briefly
- Rollout & monitoring:
  - simplest rollout, weakest guard story
- Acceptance checks:
  - manual login/logout smoke

### Dependencies
- Zustand persistence only

### Validation
- Reload after login, confirm role persists
- Navigate to admin with a non-admin user and confirm client redirect

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `useAuthStore` | client render only | imported by login/layout/header/sidebar | browser localStorage |
| `/login` page | App Router | file convention | `src/data/users.json` |
| draft scoping | new project page | page component | browser localStorage |

## Comparative Analysis & Synthesis

### Draft A strengths
- Real route protection before page render
- Cleaner separation between session, UI, and route rules
- Better demo story for admin/executive access

### Draft A gaps
- More files and moving parts
- Still mock-only, so API-wide auth remains partial

### Draft B strengths
- Less code
- Faster to wire for a pure UI prototype

### Draft B gaps
- Weak protection model
- Role enforcement is only cosmetic/client-side
- Worse handling of direct URL access

### Choice
Use Draft A. The user explicitly asked for a role/login flow, and a cookie-backed session with middleware is the smallest implementation that makes route access feel real in a demo.

## Unified Execution Plan

### Overview
Implement a cookie-backed mock auth flow using existing mock users, then wire that session into the client UI and route layer. This will add a real `/login` page, server-readable session cookies, role-aware navigation, guarded `/admin` and `/executive` routes, and user-scoped local drafts for the new-project form.

### Files to Change
- `src/lib/auth.ts`
- `src/stores/useAuthStore.ts`
- `src/components/auth/AuthBootstrap.tsx`
- `src/app/providers.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/app/(dashboard)/projects/new/page.tsx`
- `middleware.ts`

### Implementation Steps
1. TDD sequence:
   1) Add new auth modules/routes with minimal stubs
   2) Run `npm run build` or `npm run typecheck` to observe missing exports/wiring
   3) Implement cookie/session helpers and login/session/logout routes
   4) Implement login page and auth store/bootstrap
   5) Wire root redirect, header, and sidebar
   6) Add middleware route guards
   7) Scope drafts by current user
   8) Run `npm run lint && npm run build && npm run typecheck`
2. `getSessionCookies` and role helpers in `src/lib/auth.ts`
   - Parse role and user ID from cookies and centralize allowed-route logic.
3. `login`, `logout`, `session` API routes
   - Validate user IDs against mock users and set/clear cookies.
4. `useAuthStore` and `AuthBootstrap`
   - Keep current user available to client components after refresh.
5. `/login`
   - Show mock users, their roles, and sign-in action.
6. `app/page.tsx`
   - Redirect to `/dashboard` or `/login` from the server side.
7. `Header.tsx` and `Sidebar.tsx`
   - Use current user data for display, logout, and role-filtered navigation.
8. `middleware.ts`
   - Protect all dashboard/project/notification/admin/executive routes.
9. `projects/new/page.tsx`
   - Namespace draft storage by current user and refuse foreign drafts.

### Test Coverage
- `login route accepts valid mock user`
  - writes session cookies and returns user
- `session route resolves current user`
  - returns null for missing cookies
- `middleware protects dashboard routes`
  - redirects unauthenticated to login
- `middleware protects admin/executive by role`
  - redirects unauthorized authenticated users to dashboard
- `sidebar filters role-only nav`
  - only shows admin/executive for allowed roles
- `new project draft ownership`
  - only loads drafts for current user ID

### Decision Completeness
- Goal:
  - Deliver a believable mock login/role system for demo flows.
- Non-goals:
  - Passwords, real identity provider, server DB sessions, API-wide RBAC for every endpoint.
- Success criteria:
  - `/` goes to `/login` when logged out.
  - login as `System Admin` shows admin + executive nav.
  - login as `Executive` shows executive nav, not admin.
  - login as `Project Manager` hides both admin and executive nav.
  - direct navigation to `/admin` or `/executive` obeys role guard.
  - drafts on `/projects/new` are scoped to the current user.
- Public interfaces:
  - new route `/login`
  - new APIs `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`
  - session cookies: user ID and role
- Edge cases / failure modes:
  - invalid login user ID: fail closed with 400
  - tampered role cookie: middleware denies restricted routes unless role matches allowed set
  - stale cookie for deleted user: session route returns null and bootstrap clears user
  - draft from other user/browser: not shown to current user
- Rollout & monitoring:
  - prototype-only rollout, no flag
  - smoke all role paths manually
- Acceptance checks:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - manual login as three roles

### Dependencies
- `src/data/users.json`
- Next.js App Router route handlers and middleware
- Zustand client store

### Validation
- Login page loads at `/login`
- Successful login sets current user and redirects
- Logout clears session and returns to login
- Admin/executive access follows role rules
- New-project draft is only recalled for the same logged-in user

### Wiring Verification
| Component | Entry Point | Registration Location | Schema/Table |
|-----------|-------------|----------------------|--------------|
| `src/app/login/page.tsx` | browser navigation to `/login` | App Router page file | `src/data/users.json` |
| `src/app/api/auth/login/route.ts` | login form submit | App Router route handler | `src/data/users.json` |
| `src/app/api/auth/logout/route.ts` | header logout click | App Router route handler | N/A |
| `src/app/api/auth/session/route.ts` | `AuthBootstrap` fetch | App Router route handler | `src/data/users.json` |
| `src/stores/useAuthStore.ts` | header/sidebar/login/new-project client renders | imported by UI components | N/A |
| `src/components/auth/AuthBootstrap.tsx` | provider mount | mounted in `src/app/providers.tsx` | session cookies |
| `middleware.ts` | page request pipeline | Next.js root middleware | session cookies |
| `src/components/layout/Sidebar.tsx` | dashboard shell render | mounted in `src/app/(dashboard)/layout.tsx` | current user role |
| `src/components/layout/Header.tsx` | dashboard shell render | mounted in `src/app/(dashboard)/layout.tsx` | current user data |
| `src/app/(dashboard)/projects/new/page.tsx` | project create page render/save/load | App Router page file | browser localStorage namespaced by user ID |

## 2026-03-15 22:54:34 +0700 — Implementation Summary
- Goal: Implement a real mock login flow with cookie-backed session state, role-based route guards, role-filtered navigation, and user-scoped new-project drafts.
- What changed:
  - `src/types/admin.ts`: introduced `UserRole` and typed `User.role`.
  - `src/lib/auth.ts`: added shared auth cookie names, protected-path detection, and role-check helpers for admin/executive access.
  - `src/stores/useAuthStore.ts`: added current-user/auth-ready client store.
  - `src/components/auth/AuthBootstrap.tsx`: fetches `/api/auth/session` on app bootstrap and hydrates the auth store.
  - `src/app/providers.tsx`: mounted `AuthBootstrap` so the shell can render the current user after refresh.
  - `src/app/page.tsx`: now redirects to `/login` when no auth cookie is present, otherwise `/dashboard`.
  - `src/app/login/page.tsx` and `src/components/auth/LoginScreen.tsx`: added the login page with mock-user selection, role preview, and sign-in flow.
  - `src/app/api/auth/login/route.ts`: validates a selected active mock user and sets auth cookies.
  - `src/app/api/auth/logout/route.ts`: clears auth cookies.
  - `src/app/api/auth/session/route.ts`: resolves the current user from cookies.
  - `middleware.ts`: protects authenticated routes and enforces role access for `/admin` and `/executive`.
  - `src/components/layout/Header.tsx`: displays the current user and adds logout.
  - `src/components/layout/Sidebar.tsx`: filters executive/admin menu items by role.
  - `src/app/(dashboard)/projects/new/page.tsx`: scopes draft save/load/discard to the current user ID.
- TDD evidence:
  - Added/changed tests: no automated tests were added because this repo still has no focused auth/page interaction test harness.
  - RED: `npm run build` initially failed with `useSearchParams() should be wrapped in a suspense boundary at page "/login"` after the first login-page implementation.
  - GREEN: `npm run lint`, `npm run build`, and `npm run typecheck` all passed after splitting `/login` into a server wrapper and client screen.
- Tests run:
  - `npm run lint` -> passed, with pre-existing `react-hooks/exhaustive-deps` warnings in unrelated dashboard pages.
  - `npm run build` -> passed.
  - `npm run typecheck` -> passed after the successful build.
- Wiring verification evidence:
  - Login UI submits to `src/app/api/auth/login/route.ts`, which writes cookies consumed by `middleware.ts` and `src/app/api/auth/session/route.ts`.
  - `AuthBootstrap` is mounted by `src/app/providers.tsx`, so header/sidebar receive the current user via `useAuthStore`.
  - `src/components/layout/Sidebar.tsx` and `src/components/layout/Header.tsx` now depend on `useAuthStore` rather than hardcoded user identity.
  - `src/app/(dashboard)/projects/new/page.tsx` uses the current user ID to namespace `localStorage` draft keys.
- Behavior changes and risk notes:
  - Unauthenticated users are redirected to `/login` before protected pages render.
  - `/admin` is restricted to `System Admin`; `/executive` is restricted to `Executive` and `System Admin`.
  - Auth remains mock/demo-only: selected user identity comes from `src/data/users.json`; there is no password or backend persistence.
  - Most non-auth mock API routes remain open; this change secures route access and shell behavior, not full API RBAC.
- Follow-ups / known gaps:
  - The next logical step would be API-side authorization for sensitive mock routes if you want stronger demo realism.
  - The login page currently uses mock-user selection rather than credentials or SSO.

## 2026-03-15 23:11:00 +0700 — API RBAC Follow-up
- Goal: Extend the mock auth system to enforce API-side authentication and role-based access for sensitive endpoints, not just page navigation.
- What changed:
  - `middleware.ts`: now also matches `/api/:path*` and enforces server-side auth for API requests.
  - `middleware.ts`: returns JSON `401` for unauthenticated API access and JSON `403` for unauthorized role access.
  - `middleware.ts`: requires authentication for all non-auth API routes, restricts `/api/users`, `/api/org-structure`, and `/api/audit-logs` to `System Admin`, and restricts `/api/evaluation/[projectId]` to `Executive` or `System Admin`.
  - `src/app/api/auth/session/route.ts`: now resolves the current user from `userId` against the active mock user catalog instead of trusting the role cookie.
- TDD evidence:
  - No focused automated API tests were added because the repo still has no dedicated API test harness.
  - RED: `npm run typecheck` initially failed again due the pre-existing `.next/types` timing issue before build completed.
  - GREEN: `npm run lint`, `npm run build`, and a post-build `npm run typecheck` all passed.
- Tests run:
  - `npm run lint` -> passed, with pre-existing unrelated dashboard warnings.
  - `npm run build` -> passed.
  - `npm run typecheck` -> passed after build completed.
- Wiring verification evidence:
  - All page and API requests now flow through `middleware.ts` via the expanded matcher including `/api/:path*`.
  - Login/logout/session routes remain excluded from API auth enforcement via the `/api/auth/` bypass.
  - Session identity for both UI and API guards is now derived from the mock user catalog using the user ID cookie.
- Behavior changes and risk notes:
  - Direct browser/API access to protected mock endpoints now fails closed with JSON errors instead of returning data.
  - Sensitive admin data APIs can no longer be called by non-admin logged-in users.
  - Executive evaluation API now requires executive/admin role, matching page-level access.
- Follow-ups / known gaps:
  - Project-domain write APIs are still authenticated but not fine-grained by project role; if needed, the next step is per-action RBAC for create/update operations.
