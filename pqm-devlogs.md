Phase 5 status — 3 of 4 done

  ┌─────────────┬───────────────────────────────────────────────────────┐
  │     PR      │                        Status                         │
  ├─────────────┼───────────────────────────────────────────────────────┤
  │ PR-18 (#21) │ ✅ Repository abstraction                             │
  ├─────────────┼───────────────────────────────────────────────────────┤
  │ PR-19 (#22) │ ✅ Postgres schema + DatabaseRepositories (not wired) │
  ├─────────────┼───────────────────────────────────────────────────────┤
  │ PR-20 (#23) │ ✅ Dual-write soak (PERSISTENCE_BACKEND=dual)         │
  ├─────────────┼───────────────────────────────────────────────────────┤
  │ PR-21       │ 🟡 Cutover: flip reads to DB + delete InMemory/stores │
  └─────────────┴───────────────────────────────────────────────────────┘

  PR-21 (the highest-risk PR in the entire MVP plan)

  What it does:
  1. Flips PERSISTENCE_BACKEND semantics: db becomes the new default (or stays opt-in
  until the user is ready)
  2. Adds a real DB cutover path that swaps getRepositories() to return Database impls
  directly (no dual-write wrapper)
  3. Deletes the 18 src/lib/*-store.ts files (their job is done — Database is now
  authoritative)
  4. Deletes src/lib/project-demo-state.ts (the blob-snapshot infrastructure)
  5. Updates CLAUDE.md to remove all blob-state references and document the DB-first
  reality
  6. Migration: backfill DB from final blob snapshot, then announce cutover

  Risk: HIGH. This is the most invasive PR in the plan. Rollback mechanism: re-set
  PERSISTENCE_BACKEND=in_memory won't work after the InMemory files are deleted — true
  rollback requires git revert.

  Per the MVP plan: PR-21 should land only after the dual-write soak window has run
  cleanly. Per the operator README I just merged: "≥1 week of clean soak with zero
  dual_write_secondary_failed events + clean parity check."

  Options

  ┌────────────────────────────────────────────┬───────────────────────────────────┐
  │                   Option                   │         What it gets you          │
  ├────────────────────────────────────────────┼───────────────────────────────────┤
  │                                            │ Get it done; but no actual soak   │
  │ A. Launch PR-21 now                        │ data exists yet so the cutover is │
  │                                            │  a code change without            │
  │                                            │ operational validation            │
  ├────────────────────────────────────────────┼───────────────────────────────────┤
  │ B. Pause; you set PERSISTENCE_BACKEND=dual │ Honors the MVP plan's safety      │
  │  + DATABASE_URL on a Vercel preview, let   │ design                            │
  │ it soak, then launch PR-21                 │                                   │
  ├────────────────────────────────────────────┼───────────────────────────────────┤
  │ C. Skip ahead to Phase 7 RID workflows     │ Maximizes demo velocity; risk of  │
  │ (PR-22 page splits or PR-23 งวดงาน) —      │ PR-21 contention with future      │
  │ return to PR-21 after soak                 │ feature PRs                       │
  ├────────────────────────────────────────────┼───────────────────────────────────┤
  │ D. PR-22 (page splits) now — independent   │ Reduces blast radius of future    │
  │ of DB cutover, unblocks RID workflows      │ PRs                               │
  └────────────────────────────────────────────┴───────────────────────────────────┘

  My recommendation: D, then B. PR-22 (page splits) has nothing to do with DB —
  unblocks faster RID feature work and shrinks the diff size of every future PR that
  touches a 1,400-line page file. Then you can set up dual-write soak on Vercel preview
   while RID workflow PRs proceed in parallel.

  End-of-turn summary. PR-20 (dual-write) admin-merged; 459 tests green. Phase 5 is 3/4
   done; PR-21 cutover is the highest-risk remaining PR and the MVP plan says soak
  first. Awaiting your direction on next move.


  Demo vs. Production Tech Stack — Full Comparison
  
    Three columns because production has two realistic paths
  
    - Demo: what we have now / next steps. Goal: bid-quality demo at $0.
    - Prod (Cloud): Vercel + managed services. Fast to deploy, ~$130/mo. PDPA-borderline
    for sensitive govt data.
    - Prod (On-prem / GDCC): agency datacenter or Thai Government Data Center & Cloud.
    Slower setup, ~$100–150/mo VM + labor. PDPA-compliant. Likely required for production
     NSM/RID rollout.
  
    Layer-by-layer with costs
  
    ┌───────────────┬──────────────────────┬───────────────┬────────────────────────┐
    │     Layer     │         Demo         │ Prod (Cloud)  │  Prod (On-prem/GDCC)   │
    ├───────────────┼──────────────────────┼───────────────┼────────────────────────┤
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: UI
    Demo: AntD 5 + Tailwind
    Prod (Cloud): Same
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: Charts
    Demo: ECharts + echarts-for-react
    Prod (Cloud): Same
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: Drag-drop
    Demo: @dnd-kit
    Prod (Cloud): Same
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: Forms
    Demo: AntD Form built-in
    Prod (Cloud): Same
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: State
    Demo: TanStack Query 5 + Zustand 5
    Prod (Cloud): Same
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: Date/Buddhist
    Demo: dayjs + dayjs/locale/th
    Prod (Cloud): Same (+ next-intl if EN needed)
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: Validation
    Demo: Zod (PR-04)
    Prod (Cloud): Same
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: Tests
    Demo: Vitest + Playwright + pglite
    Prod (Cloud): Same in CI
    Prod (On-prem/GDCC): Same in CI
    ────────────────────────────────────────
    Layer: Backend runtime
    Demo: Next.js API routes on Vercel
    Prod (Cloud): Same on Vercel
    Prod (On-prem/GDCC): next start in Docker on Node 22, behind Caddy or nginx
    ────────────────────────────────────────
    Layer: Database
    Demo: Neon free (0.5 GB) — $0
    Prod (Cloud): Neon Scale ($69) or Vercel Postgres Pro ($20+usage)
    Prod (On-prem/GDCC): Self-hosted Postgres 16 on agency VM + PgBouncer + streaming
      replica — $0 (hardware sunk)
    ────────────────────────────────────────
    Layer: ORM
    Demo: Drizzle + postgres-js + pglite (tests)
    Prod (Cloud): Same
    Prod (On-prem/GDCC): Same
    ────────────────────────────────────────
    Layer: File storage
    Demo: Vercel Blob free (100MB) — $0
    Prod (Cloud): Vercel Blob ($0.20/GB) or Cloudflare R2 ($0.015/GB) ≈ $1–$5
    Prod (On-prem/GDCC): MinIO (S3-compatible, self-host) — $0
    ────────────────────────────────────────
    Layer: Virus scan
    Demo: Stub (PR-06 interface ready) — $0
    Prod (Cloud): Cloudmersive API — $30 or ClamAV on a $7 VM
    Prod (On-prem/GDCC): ClamAV self-host — $0
    ────────────────────────────────────────
    Layer: Auth
    Demo: Demo pqm_user_id cookie (insecure, prototype-only) — $0
    Prod (Cloud): NextAuth.js + Keycloak self-host on $7 VM
    Prod (On-prem/GDCC): Keycloak OR agency SSO (M365/Entra/ThaiID) — $0
    ────────────────────────────────────────
    Layer: Audit/observability
    Demo: PR-05 structured events in Postgres — $0
    Prod (Cloud): + Sentry free (5k errors) + Axiom free (1GB) — $0
    Prod (On-prem/GDCC): + self-host Glitchtip (open-source Sentry) + ELK or Loki — $0
    ────────────────────────────────────────
    Layer: Hosting
    Demo: Vercel Hobby — $0
    Prod (Cloud): Vercel Pro — $20 + usage
    Prod (On-prem/GDCC): GDCC medium VM (4 vCPU/8 GB) — ฿3–5k (~$90–150) OR existing
      agency VM — $0
    ────────────────────────────────────────
    Layer: CI/CD
    Demo: GitHub Actions free (currently broken — task #21)
    Prod (Cloud): Same — needs runner fix
    Prod (On-prem/GDCC): Self-host GitHub Runner OR Jenkins — $0
    ────────────────────────────────────────
    Layer: DNS / Domain
    Demo: *.vercel.app — $0
    Prod (Cloud): Custom .com via Cloudflare — $1
    Prod (On-prem/GDCC): .go.th via THNIC — ฿25/mo (~$1)
    ────────────────────────────────────────
    Layer: Email/notify
    Demo: In-app only — $0
    Prod (Cloud): Resend free tier (3k/mo) → $20
    Prod (On-prem/GDCC): Agency SMTP (M365) — $0 OR LINE Notify (free, common in Thai
    gov)
    ────────────────────────────────────────
    Layer: CDN
    Demo: Vercel edge built-in — $0
    Prod (Cloud): Same OR Cloudflare free tier
    Prod (On-prem/GDCC): Cloudflare free in front of on-prem
    ────────────────────────────────────────
    Layer: RID integrations (e-GP/GFMIS/PFMS-SP2/PBMS)
    Demo: PR-30b discovery + fixtures — $0
    Prod (Cloud): API integration code
    Prod (On-prem/GDCC): Same (govt APIs are free)
  
    Total cost summaries
  
    ┌───────────────────────────────┬────────────────────────────────────────────────┐
    │             Path              │                  Monthly cost                  │
    ├───────────────────────────────┼────────────────────────────────────────────────┤
    │ Demo (where we are now)       │ $0                                             │
    ├───────────────────────────────┼────────────────────────────────────────────────┤
    │ Prod — Cloud-managed (Vercel  │ ~$128/mo                                       │
    │ Pro + Neon)                   │                                                │
    ├───────────────────────────────┼────────────────────────────────────────────────┤
    │ Prod — On-prem / GDCC (agency │ $90–$150/mo VM + sysadmin labor (or $0 if      │
    │  datacenter)                  │ agency hardware already exists)                │
    └───────────────────────────────┴────────────────────────────────────────────────┘
  
    Transition friction — what's already done
  
    Thanks to the disciplined MVP plan, most layers swap implementations without code
    rewrites. Key abstractions already shipped:
  
    ┌──────────────┬────────────────────────────────────────┬────────────────────────┐
    │    Layer     │       Already-built abstraction        │     Effort to swap     │
    ├──────────────┼────────────────────────────────────────┼────────────────────────┤
    │              │ Repository pattern (PR-18) +           │ 0.5 day — change       │
    │ Persistence  │ dual-write (PR-20) + Drizzle portable  │ DATABASE_URL env, run  │
    │              │ schema (PR-19)                         │ migrations             │
    ├──────────────┼────────────────────────────────────────┼────────────────────────┤
    │              │                                        │ 0.5 day — implement    │
    │ File storage │ persistMockUpload abstraction (PR-06)  │ S3/MinIO/R2 adapter,   │
    │              │                                        │ swap import            │
    ├──────────────┼────────────────────────────────────────┼────────────────────────┤
    │ Virus scan   │ VirusScanHook interface (PR-06)        │ 0.5 day — implement    │
    │              │                                        │ ClamAV adapter         │
    ├──────────────┼────────────────────────────────────────┼────────────────────────┤
    │              │ Structured AuditEvent +                │ 0.5 day — add async    │
    │ Audit pipe   │ recordAuditEvent helper (PR-05)        │ hook to forward to     │
    │              │                                        │ SIEM                   │
    ├──────────────┼────────────────────────────────────────┼────────────────────────┤
    │ Authz        │ canPerformProjectAction matrix (PR-03) │ 0 day — works as-is;   │
    │              │                                        │ role names compatible  │
    ├──────────────┼────────────────────────────────────────┼────────────────────────┤
    │ Validation   │ Zod schemas at API boundary (PR-04)    │ 0 day — works as-is    │
    ├──────────────┼────────────────────────────────────────┼────────────────────────┤
    │ Document     │ All upload paths through PR-06         │ 0 day — abstraction is │
    │ security     │ hardened helper                        │  the swap point        │
    └──────────────┴────────────────────────────────────────┴────────────────────────┘
  
    Transition friction — what's still hard
  
    Layer: Authentication
    Current state: Demo cookie userId (pqm_user_id) hardcoded throughout middleware +
      project-api-access
    Effort to productionize: 2–3 days: replace middleware with NextAuth/Auth.js OIDC
      client, wire to Keycloak or agency IdP, JIT user provisioning  hook
    ────────────────────────────────────────
    Layer: Hosting → on-prem
    Current state: Vercel-specific deploy
    Effort to productionize: 2–3 days first time: Dockerfile with output: 'standalone',
      reverse proxy config, process manager, persistent volume for blob storage swap, env
  
      var wiring
    ────────────────────────────────────────
    Layer: NotificationSender
    Current state: None — no email/LINE abstraction exists
    Effort to productionize: 1 day: introduce NotificationSender interface + adapters
      (stub/Resend/SES/LINE/agency SMTP)
    ────────────────────────────────────────
    Layer: First production data migration
    Current state: If demo data must be preserved vs. re-seeded
    Effort to productionize: 0.5–1 day: pg_dump from Neon → pg_restore to target
  
    Recommended path
  
    Phase A (now → MVP demo): Stay on Demo stack. $0/mo.
  
    Phase B (bid demo → soft launch): Cloud-managed prod via Vercel Pro + Neon Scale +
    Cloudflare R2 + Sentry. ~$128/mo. Lets you onboard real users while on-prem is being
    arranged. Auth still demo unless real users require it.
  
    Phase C (production rollout): Migrate to on-prem / GDCC. Same Postgres dialect →
    pg_dump/pg_restore. Swap Vercel Blob → MinIO. Add real auth (NextAuth + Keycloak or
    agency SSO). ~$90–150/mo VM (often free on existing agency hardware).
  
    Total Phase A→C effort beyond what's already built: ~8–10 dev days. That's the payoff
     of the strangler-fig design.
  
    Things to add post-MVP to reduce Phase B/C friction
  
    These aren't urgent but should land before production go-live:
  
    1. NotificationSender interface + stub adapter — enables email/LINE/in-app swap.
    Small PR, ~1 day.
    2. AuthAdapter interface — wraps current cookie auth and the future NextAuth
    implementation behind one boundary. Enables incremental migration. ~0.5 day.
    3. Dockerfile + next.config.mjs output: 'standalone' — enables on-prem deployment
    without surprises. ~0.5 day.
    4. docker-compose.dev.yml with Postgres + MinIO + ClamAV sidecar — gives developers a
     fully-local stack mirroring production. ~1 day.
    5. Backup script — scripts/db:backup running pg_dump, S3 upload, retention policy.
    ~0.5 day.
    6. Runbook — "deploying to GDCC" + "rotating Neon → on-prem" + "incident response."
    ~0.5 day docs.
  
    Total: ~4 dev days of pre-production polish, all schedulable during the dual-write
    soak window.
  
    Key cost insight
  
    The big jump from $0 → $128/mo (Phase A→B) is mostly virus scan ($30) + Vercel Pro
    ($20) + Neon Scale ($69) + auth VM ($7). The on-prem path (Phase C) cuts the ~$120 of
     those four to roughly $0 — assuming agency hardware already exists.
  
    If budget pressure ever appears:
    - Drop Cloudmersive virus scan ($30) → run ClamAV on a $7 VM. Saves $23/mo.
    - Drop Neon Scale ($69) → run Postgres on the same $7 VM (PgBouncer for connection
    pool). Saves $62/mo.
    - Drop Vercel Pro ($20) → self-host on a $7 VM via Docker. Saves $13/mo.
    - New total: ~$15–$30/mo for a fully-self-hosted "production lite" if Phase C (real
    on-prem) isn't ready.
  
    End-of-turn summary. Provided three-column stack/cost comparison (Demo $0, Prod-cloud
     ~$128/mo, Prod-on-prem ~$90–150/mo + labor); mapped what's already abstracted (most
    things), what's hard (auth, Vercel→on-prem hosting, NotificationSender); recommended
    3-phase rollout (A: free demo → B: cloud prod ~$128/mo → C: on-prem/GDCC) leveraging
    the strangler-fig design for ~8–10 dev days total transition work.


++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++

Demo Tech Stack — What you have + what to set up

  ✅ Already in place (no action needed)

  Confirmed by inspecting the repo + recent commits:

  ┌──────────────────┬──────────────────────────────────────┬──────────────────────┐
  │      Layer       │              Component               │        Status        │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Runtime          │ Node 22 + npm 11                     │ ✅ Installed         │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Framework        │ Next.js 14.2 + TypeScript strict     │ ✅ Shipping          │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ UI               │ Ant Design 5 + Tailwind CSS +        │ ✅ Shipping          │
  │                  │ Inter/Noto Sans Thai                 │                      │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Charts           │ ECharts 5 + echarts-for-react        │ ✅ Shipping          │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Drag-drop        │ @dnd-kit                             │ ✅ Shipping          │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ State            │ TanStack Query 5 + Zustand 5         │ ✅ Shipping          │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Date/Buddhist    │ dayjs +                              │ ✅ Shipping          │
  │                  │ formatThaiDate/toBuddhistYear        │                      │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Validation       │ Zod schemas at every API boundary    │ ✅ Shipping          │
  │                  │ (PR-04)                              │                      │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Tests            │ Vitest + Playwright + pglite — 459   │ ✅ Shipping          │
  │                  │ tests                                │                      │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ ORM              │ Drizzle ORM + postgres-js + pglite   │ ✅ Code complete; DB │
  │                  │ (PR-19)                              │  not yet provisioned │
  ├──────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Repository      │ getRepositories() strangler-fig      │ ✅ Shipping          │
  │ abstraction     │ (PR-18)                              │                      │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Dual-write      │ dualWrite(InMemory, Database)        │ ✅ Shipping;         │
  │ wrapper         │ (PR-20)                              │ env-gated            │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ File storage    │ Vercel Blob                          │ ✅ Shipping (private │
  │                 │                                      │  since PR-06)        │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Document        │                                      │ ✅ Shipping          │
  │ security        │ size/MIME/hash/scan-hook (PR-06)     │ (virus-scan = stub   │
  │                 │                                      │ for demo)            │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Audit           │ Structured AuditEvent + JSON/CSV     │ ✅ Shipping          │
  │                 │ export (PR-05)                       │                      │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Authz           │ 21-action × 7-role matrix (PR-03)    │ ✅ Shipping          │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │                 │ Cookie pqm_user_id — insecure,       │ ✅ Shipping;         │
  │ Auth (demo)     │ prototype-only                       │ deferred per         │
  │                 │                                      │ stakeholder Q5       │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Persistence     │ InMemory + blob snapshot             │ ✅ Shipping          │
  │ (current)       │                                      │                      │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ GitHub repo     │ SubhajL/nsm-pqm-prototype with       │ ✅ Set up            │
  │                 │ branch protection                    │                      │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ gh CLI          │ Authenticated as SubhajL with repo + │ ✅ Set up            │
  │                 │  workflow scopes                     │                      │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Vercel project  │ Already deployed at *.vercel.app     │ ✅ Set up (Hobby     │
  │                 │                                      │ plan)                │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ Vercel CI hook  │ Automatic preview deploy on PR       │ ✅ Set up            │
  ├─────────────────┼──────────────────────────────────────┼──────────────────────┤
  │ CI workflow     │ GitHub Actions vercel-checks.yml —   │ ⚠️  Task #21 —        │
  │                 │ broken (no runner)                   │ separate fix         │
  └─────────────────┴──────────────────────────────────────┴──────────────────────┘

  ⚙️  Needs setup — sequential walkthrough for Option B

  This is the dual-write soak prerequisite. Once done, B is in progress and we converge
   on A (PR-21 cutover) when soak is clean.

  ---
  Step 1 — Create Neon Postgres account + project [5 min, $0]

  Why: Provides the real Postgres database that PR-19's Drizzle schema will land on.
  Free tier = 0.5 GB storage + 191.9 compute-hrs/mo (way more than demo needs).

  Action (you):
  1. Open https://console.neon.tech in your browser
  2. Sign in with GitHub OAuth (it'll see your existing SubhajL account — no separate
  password)
  3. Click Create project:
    - Name: nsm-pqm-prototype
    - Region: Singapore (ap-southeast-1) — closest to Thailand, lowest latency
    - Postgres version: 16 (default)
  4. From the project dashboard, copy the Connection string (looks like
  postgres://neondb_owner:abc123XYZ@ep-cool-darkness-12345678.ap-southeast-1.aws.neon.t
  ech/neondb?sslmode=require)

  Validation: You should see a green "Active" indicator on the project page.

  Save the URL: keep it handy in a password manager or sticky note for the next steps.

  ---
  Step 2 — Install Vercel CLI locally [2 min, $0]

  Why: Needed to add env vars to your Vercel project + trigger preview deploys.

  Action (you, in terminal):
  npm install -g vercel
  vercel login
  # Choose "Continue with GitHub", browser opens, authorize, return to terminal
  vercel link
  # Run from /Users/subhajlimanond/dev/nsm-pqm-prototype
  # Choose: existing project → nsm-pqm-prototype

  Validation:
  vercel project ls
  # Should show nsm-pqm-prototype

  ---
  Step 3 — Run the schema migration against Neon [3 min, $0]

  Why: Creates the 18 tables in your Neon database. PR-19's migration file lives at
  drizzle/migrations/0000_initial.sql.

  Action (you, in terminal, from project root):
  # Export the Neon URL for this shell session
  export DATABASE_URL='postgres://neondb_owner:abc...@ep-...ap-southeast-1.aws.neon.tec
  h/neondb?sslmode=require'

  # Run the migration
  npm run db:migrate

  Expected output: Drizzle prints "Migrations completed!" or similar. Takes ~5 seconds.

  Validation:
  # Connect with psql to verify tables exist (optional)
  psql "$DATABASE_URL" -c '\dt'
  # Should list ~18 tables: projects, wbs, boq, gantt, ... audit_events

  Troubleshooting: if psql isn't installed: brew install postgresql@16 (Mac) gives you
  the client only.

  ---
  Step 4 — Backfill from JSON fixtures [3 min, $0]

  Why: Populates the Neon database with the same seed data the InMemory store has.
  Without this, dual-write would create empty rows on the Postgres side and
  parity-check would show "secondary missing data."

  Action (you, terminal, same shell with DATABASE_URL exported):
  npm run db:seed

  Expected output: "Seeded N projects, N users, N WBS nodes..." etc. ~10 seconds.

  Validation:
  psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM projects;'
  # Should match: 5 (the prototype's 5 demo projects)

  ---
  Step 5 — Add Vercel env vars [3 min, $0]

  Why: Tells the deployed Vercel preview to (a) connect to Neon and (b) enable
  dual-write mode.

  Action (you, terminal):
  # Add DATABASE_URL to preview environment only (NOT production)
  vercel env add DATABASE_URL preview
  # When prompted: paste the Neon URL → press Enter

  # Add PERSISTENCE_BACKEND
  vercel env add PERSISTENCE_BACKEND preview
  # When prompted: type "dual" → press Enter

  Validation:
  vercel env ls
  # Should show: DATABASE_URL (preview) + PERSISTENCE_BACKEND (preview)
  # Production env: unset (leaves prod alone — defensive)

  ---
  Step 6 — Deploy a preview [5 min, $0]

  Why: Creates a Vercel preview URL running with PERSISTENCE_BACKEND=dual so writes hit
   both InMemory and Neon.

  Action (you, terminal, from project root):
  vercel deploy
  # Prints a preview URL when done, e.g.:
  # https://nsm-pqm-prototype-abc123.vercel.app

  Validation:
  1. Open the preview URL in browser
  2. Log in (any user from the demo login list)
  3. Create a new project, edit some WBS, log a daily report
  4. Each write should land silently in BOTH backends

  Note: Vercel build will run npm install → npm run build. This means the CI runner
  issue (task #21) doesn't affect vercel deploy — Vercel uses its own build
  environment, not GitHub Actions runners.

  ---
  Step 7 — Verify dual-write is working [5 min, $0]

  Why: Confirms PR-20's wrapper actually wrote to Neon, not just InMemory.

  Action A (you, browser): Open the preview URL → /api/audit-logs/export?format=json
  (admin only — log in as System Admin first). Look for events with
  action='dual_write_secondary_failed'. Expected: empty.

  Action B (you, terminal, with DATABASE_URL still exported):
  # Run parity check
  npm run db:parity-check
  # Expected: exit 0 with "Parity confirmed across all 18 domains"

  Troubleshooting:
  - Some events have dual_write_secondary_failed: open one, read the error. Common
  causes: schema mismatch (unlikely — contract tests caught these), connection pool
  exhaustion (raise pool size in src/lib/db/client.ts), or auth (check Neon connection
  string includes ?sslmode=require).
  - Parity-check fails with drift: compare the specific rows; likely a backfill missed
  a fixture. Re-run npm run db:seed.

  ---
  Step 8 — Soak window [user-driven; days to a week]

  Why: Real bugs surface only under realistic usage. Per MVP plan: ≥1 week ideal;
  pragmatic minimum for a prototype is 24–48 hours across a few exercise sessions.

  Action (you):
  - Use the preview URL for any RID/NSM demo sessions you'd normally run
  - Once a day or so: re-run npm run db:parity-check to spot drift
  - Once a day or so: check /api/audit-logs/export?format=json for new
  dual_write_secondary_failed events

  Success criterion: at least one full E2E demo flow (create project → WBS → Gantt →
  daily report → quality inspection → handover) without any dual_write_secondary_failed
   events and with clean parity-check.

  ---
  Step 9 — Tell me "soak good" → I launch PR-21 (cutover)

  Why: Per the strict workflow, PR-21 lands only after operational validation that
  PR-20 has been collecting.

  Action (you): Just message me. I'll launch the PR-21 sub-agent which will:
  - Flip PERSISTENCE_BACKEND default to 'db'
  - Delete the 18 src/lib/*-store.ts files (their job done — Database is authoritative)
  - Delete src/lib/project-demo-state.ts
  - Update CLAUDE.md with the new persistence reality
  - Update vercel.json env-var defaults

  Followed by admin merge + sync per the per-PR workflow.

  ---
  ⚠️  Optional cleanup (not blocking)

  Task #21 — GitHub Actions CI runner outage

  Status: broken, has been admin-bypass merged on every PR
  Impact on B: ZERO. Vercel deploy doesn't use GitHub Actions.
  Impact on future PRs: every merge needs admin-bypass; safety hole.
  Fix: check https://github.com/settings/billing → Plans → Actions usage. If hit the
  free tier limit (2,000 min/mo private repos): wait for monthly reset or upgrade plan.
   If billing-paused: re-add payment method.
  My recommendation: fix during the soak window since you're waiting anyway.

  Custom domain (post-MVP)

  Demo works fine on the auto-assigned *.vercel.app URL. Custom domain (.go.th, .com)
  is post-MVP polish, not required for the demo.

  Summary table — sequence + estimated time

  ┌─────┬───────────────────────────────┬─────────┬─────┬──────────────────┐
  │  #  │             Step              │  Time   │ $$$ │       Who        │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 1   │ Create Neon account + project │ 5 min   │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 2   │ Install Vercel CLI            │ 2 min   │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 3   │ npm run db:migrate            │ 3 min   │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 4   │ npm run db:seed               │ 3 min   │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 5   │ vercel env add × 2            │ 3 min   │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 6   │ vercel deploy                 │ 5 min   │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 7   │ Verify dual-write             │ 5 min   │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 8   │ Soak (background)             │ 24h–1wk │ $0  │ You              │
  ├─────┼───────────────────────────────┼─────────┼─────┼──────────────────┤
  │ 9   │ Tell me "soak good" → PR-21   │ depends │ $0  │ Me (you trigger) │
  └─────┴───────────────────────────────┴─────────┴─────┴──────────────────┘

  Total active time: ~30 minutes of clicks/commands. Total wall-clock: 1–7 days of
  soak.

  End-of-turn summary. Cataloged what's already in place (most of the demo stack) vs
  what needs setup (Neon provisioning + Vercel env wiring + soak monitoring — 9 steps,
  $0, ~30 min active). Once soak completes, I launch PR-21 cutover and we move to Phase
   7 (Option C — RID workflows). The CI runner issue is parallel-track during the soak
  window.

++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++

Honest answer: No, this is a real RID-fit gap

  You're right to flag it. The dropdown shows the original NSM ProjectType enum
  (Construction / IT / Equipment / Academic / Renovation), not the RID ProjectClass
  enum we agreed on in PR-13 (Construction / IT / Consulting / Research / Maintenance).

  We have two parallel fields in the type system right now:

  Field: ProjectType
  Source: Original NSM (src/types/project.ts:7)
  Values: construction | it | equipment | academic | renovation
  Used by: New-project form dropdown (this screenshot)
  ────────────────────────────────────────
  Field: ProjectClass
  Source: PR-13 RID vocabulary (src/types/rid/vocabulary.ts)
  Values: construction | it | consulting | research | maintenance
  Used by: Defined but not surfaced in UI yet

  PR-13 added the RID vocabulary but didn't migrate the existing NSM ProjectType to use
   it. So the form is still NSM-flavored even though the underlying types are
  RID-aware.

  Other NSM-residual surfaces likely visible in your demo

  I haven't audited exhaustively, but quick suspects:
  - Sidebar header "อพวช." (NSM Thai abbreviation) — should be parameterized for RID
  demos
  - The "Demo: Scenario 1 ก่อสร้างครบวงจร" banner at top-right
  - Project descriptions in seed data (5 of them are NSM-flavored: นิทรรศการดาราศาสตร์,
  etc.)
  - Login screen title "เข้าสู่ระบบต้นแบบ PQM" (generic — probably fine)
  - Header brand "PQM อพวช." (NSM)
  - Possibly status badges or labels that reference NSM-specific work patterns

  Is this OK for the demo?

  For soak validation (current step): Yes, totally fine — soak is about persistence
  parity, not RID-fit. Don't let this block soak completion.

  For a RID-targeted bid demo: No, this would be a visible mismatch a RID reviewer
  would catch immediately ("why does it say อพวช? this is for RID"). Worth fixing
  before any RID-stakeholder demo.

  Two follow-up PRs I'd propose (after soak + PR-21)

  PR-RID-A: ProjectType → ProjectClass migration

  What it does:
  - Deletes ProjectType enum from src/types/project.ts
  - Renames the field Project.type → Project.projectClass (uses PR-13's ProjectClass)
  - Updates the new-project form dropdown to show the 5 RID classes
  - Migrates seed data old → new with a mapping you confirm (proposed):
    - construction → construction
    - it → it
    - equipment → maintenance (equipment-mgmt fits O&M better than research)
    - academic → research
    - renovation → construction (renovation is a construction sub-type)
  - Updates DB schema + migration script + characterization tests

  Effort: M (~1 day). Type migration across ~10 files.

  PR-RID-B: Brand / context parameterization

  What it does:
  - Replace hardcoded "อพวช." in sidebar/header with env var NEXT_PUBLIC_AGENCY_NAME
  (default "RID" for our use)
  - Add NEXT_PUBLIC_AGENCY_NAME_THAI ("กรมชลประทาน" for RID)
  - Remove or replace the "Demo: Scenario 1" banner
  - Optionally: regenerate the 5 seed projects with RID-flavored content
  (irrigation/dam/canal projects instead of museum exhibits)

  Effort: S (~0.5 day) for branding only; M (~1 day) if including seed regeneration.

  Recommendation

  Wait until after PR-21 cutover to do these. Reasons:
  1. Both PRs touch types + seed data — same files PR-21 modifies (deleting InMemory
  stores). Doing PR-RID-A first creates rebase pain.
  2. The soak is what matters right now; both PRs would generate new audit events
  (dual_write_secondary_failed would be your signal), which would slightly muddy the
  soak signal.
  3. Bundling them as Phase 6.5 (RID-fit polish) after PR-21 lands gives them a clean
  diff base.

  But two product decisions I need from you before I can launch them:

  Q1. Mapping for ProjectType → ProjectClass:
  - Option A (my proposal): equipment→maintenance, academic→research,
  renovation→construction
  - Option B: equipment→consulting (NSM equipment projects often involve consultancy)
  - Option C: tell me your preferred mapping

  Q2. Agency-name parameterization scope:
  - Option A: just env var (toggle "อพวช." / "RID" / custom)
  - Option B: env var + also regenerate seed data with RID-flavored irrigation/dam
  projects (canal-001, ฝายฯ-002, etc.)
  - Option C: don't parameterize — hard-code as "RID" since that's the target
  stakeholder

  Tell me your answer to Q1 and Q2 when you have time — no rush. I'll queue PR-RID-A
  and PR-RID-B as follow-ups to launch after PR-21 lands.

  For now: keep soaking. Don't interrupt soak progress for this.

  End-of-turn summary. Project Type dropdown still NSM
  (Construction/IT/Equipment/Academic/Renovation) instead of PR-13's RID ProjectClass
  (Construction/IT/Consulting/Research/Maintenance) — real RID-fit gap, but not
  soak-blocking. Recommend bundling as Phase 6.5 (PR-RID-A: type migration; PR-RID-B:
  brand parameterization) AFTER PR-21 cutover to avoid rebase pain. Need product
  decisions on type mapping (Q1) and branding scope (Q2) before launching.
