# NSM PQM — MVP Execution Plan (30 numbered PRs / ~33 review units)

> **Status:** Draft v3 — stakeholder-confirmed for the 5 decisions logged in §Decisions log; further sign-off gates listed in §Stakeholder review gates
> **Author:** Claude (synthesizing senior team-lead review rounds 1–3 + product owner answers)
> **Last updated:** 2026-05-27
> **Target:** Technically excellent, demoable MVP that accommodates RID construction projects (small/medium/large, in-house and outsourced) and RID IT projects.
>
> **PR count clarification:** 30 numbered PRs comprise approximately **33 actual review units** once explicitly-stacked sub-PRs are counted separately:
> - PR-22 = `22a + 22b + 22c` (one per oversized page batch)
> - PR-30 = `30a + 30b` (IT class extensions + integration discovery)
> - All other numbered PRs are single review units.
>
> **Authentication scope note:** Phase 1 builds **production-grade controls** (authorization, validation, audit, document security) **around a demo-identity authentication model.** Real authentication (SSO/OIDC) replacing the demo userId login is **post-MVP** per stakeholder decision. The MVP is therefore demoable and operationally hardened *for its identity scope* — not production-ready in the full-public-deployment sense.

---

## Executive summary

This plan executes 30 numbered pull requests in 9 phases, taking the current prototype to a demoable, RID-aligned MVP. The numbering is sequential, but execution is **not fully serial**: several PRs can run in parallel as long as their merge order respects the dependency graph and route/data-model conflict zones.

The sequencing optimizes for six safety rules:

1. **Docs before code** — wrong CLAUDE.md poisons every downstream PR (including AI-assisted ones).
2. **Tests before refactors** — characterization tests pin behavior so refactors cannot silently regress.
3. **Production controls before more writes** — authorization, validation, audit, document security land before persistence migration.
4. **Types before persistence** — RID-aligned types finalize before Postgres schema is written, so the DB is never migrated twice.
5. **Strangler-fig over big-bang** — repository abstraction sits between API routes and persistence, so the DB swap is one swap point, not 18.
6. **Validation before adapter** — every external integration starts as discovery + validated fixture, never a speculative adapter.

---

## Stakeholder decisions applied (2026-05-27)

| Question | Decision | Impact on plan |
|---|---|---|
| Hosting target | **Neon** (Postgres) for demoable MVP; on-prem/GDCC deferred | PR-19 uses portable Postgres only; no Neon-specific extensions |
| PMQA scope | **PM-related categories only** | PR-28 scoped to OPDC PMQA categories 2 (strategy) + 6 (process management) + 7 (results) — not full 6-category compliance |
| PFMS-SP2/PBMS validation owner | **Validate live at demo** with RID IT stakeholder | PR-30b ships discovery + fixtures; validation conversation happens during the demo, not before MVP |
| Public participation (was PR-27) | **Post-MVP** | Dropped from the 30; reused slot for change-request + approval workflow completion |
| Real auth replacement | **Deferred; keep demo userId login** | No PR-31; demo-only auth banner stays |

---

## Phase overview

| Phase | PRs | Theme | Output |
|---|---|---|---|
| 0 — Truth & Safety | 1–2 | Docs + characterization tests | Trustworthy docs, safety net for refactors |
| 1 — Operational controls¹ | 3–7 | Authz, validation, audit, doc security, persist fix | Every write is authorized, validated, audited, durable |
| 2 — Tech cleanups | 8–12 | Dead code, color tokens, JSON data, hydration fix, `'use client'` | Codebase ready for refactor wave |
| 3 — RID vocabulary | 13 | Canonical type system | Single source of truth for RID terminology |
| 4 — RID type shapes | 14–17 | Size tier, delivery method, lifecycle, org tree | Types reflect RID reality before DB lands |
| 5 — Foundation switch | 18–21 | Repo abstraction → Postgres → cutover | Durable, scalable persistence |
| 6 — Page-shape cleanup | 22 (a/b/c) | Split oversized pages | Maintainable surface for RID feature work |
| 7 — RID workflows | 23–27 | งวดงาน, procurement, permits, handover, change-request | RID construction operational coverage |
| 8 — Reporting & quality | 28–29 | PMQA + RID report templates | Audit/reporting fit for ก.พ.ร. |
| 9 — IT class + integrations | 30a–30b | IT extensions + external-system discovery | Multi-project-class coverage + integration readiness |

¹ *Production-grade write-path controls around the demo identity model. Real authentication remains demo userId per stakeholder decision; SSO/OIDC replacement is post-MVP.*

---

## PR-by-PR detail

### Phase 0 — Truth & Safety

#### PR-01 — chore(docs): correct CLAUDE.md inaccuracies
- **Scope:** Project `CLAUDE.md` (remove `(mobile)/`, `src/i18n/`, "resets on restart" claims); `src/components/gantt/CLAUDE.md` (remove all dhtmlxGantt references — the package is not installed; Gantt is hand-rolled with AntD); `IMPLEMENTATION_PLAN.md` (update stack line).
- **Blocked by:** none — first PR
- **Test plan:** doc-only; grep verifies referenced files actually exist
- **Risk:** zero
- **Rollback:** revert
- **Size:** S (1h)

#### PR-02 — test: Vitest + characterization tests for derivation libs
- **Scope:** Add Vitest config + `npm test` script. Characterization tests for: `evm-metrics.ts`, `wbs-progress-normalization.ts`, `project-progress-derivations.ts`, `project-execution-sync.ts`, `risk-issue-consistency.ts`, `quality-consistency.ts`. Tests capture **current behavior** including quirks — they are a safety net for upcoming refactors.
- **Blocked by:** none
- **Test plan:** the tests themselves; CI gate adds `npm test`
- **Risk:** low (additive)
- **Size:** M (1d)

---

### Phase 1 — Production controls

#### PR-03 — feat(security): authorization policy layer
- **Scope:** Add `canPerformProjectAction(user, projectId, action)` to `src/lib/project-api-access.ts` alongside the existing visibility check. Action enum: `view | edit_basic | edit_schedule | edit_budget | approve_milestone | manage_team | delete_project | sign_handover | submit_change_request | approve_change_request | upload_document | approve_document | …`. Authorization matrix table per role × action lives in `src/lib/authz-matrix.ts`. Every write route gates on it. Matrix-test fixture covers all role × action cells.
- **Blocked by:** PR-02
- **Blocks:** PR-07 + every later write PR
- **Test plan:** matrix-completeness unit test; E2E that asserts 403 for forbidden actions
- **Risk:** medium (touches every mutating route, but mechanically)
- **Size:** M (2d)

#### PR-04 — feat(security): Zod runtime validation at API boundary
- **Scope:** Schemas co-located with types (`src/types/<domain>.ts` + `src/types/<domain>.schema.ts`). Routes validate request bodies before any store mutation. Concrete first targets: `documents/[projectId]/route.ts:36`, `daily-reports/route.ts:56`, `documents` POST, `change-requests` POST, every other route that casts `await request.json()` directly. Validation errors return 400 with field-level details.
- **Blocked by:** PR-02
- **Blocks:** PR-19 (DB must not accept invalid shapes)
- **Test plan:** schema unit tests; E2E that asserts 400 on malformed input
- **Risk:** low (rejects what was previously silently accepted)
- **Size:** M (2d)

#### PR-05 — feat(audit): immutable audit-event model
- **Scope:** Replace text-record audit logs with structured immutable events: `{ id, timestamp, requestId, actorId, actorRole, action, resourceType, resourceId, before, after, decisionReason, authorityBasis, ipAddress, userAgent }`. Append-only store (no update/delete). Export to JSON/CSV for ก.พ.ร./auditor review. Request ID is generated in middleware and propagated.
- **Blocked by:** PR-03 (so authority decisions are recorded)
- **Test plan:** every mutating route asserted to write exactly one event; immutability test; export-format snapshot
- **Risk:** medium (touches every write path)
- **Size:** L (3d)

#### PR-06 — feat(security): document security controls
- **Scope:** File size cap (configurable, default 50MB); type allowlist (PDF, DOCX, XLSX, JPG, PNG, DWG by default); SHA-256 hash on upload; access policy per folder per role (read/write/approve); version locks (no overwrite of approved versions); virus-scan hook (stub by default, ClamAV adapter shape ready); retention metadata. Blob `access: 'public'` becomes `'private'` with signed-URL fetch.
- **Blocked by:** PR-03, PR-05
- **Test plan:** size/type rejection tests; hash collision test; signed-URL expiry test
- **Risk:** medium-high (hot path)
- **Size:** L (3-4d)

#### PR-07 — fix(persistence): admin/org/user mutations must persist
- **Scope:** Concrete gap in current code: `src/app/api/users/route.ts` and `src/app/api/org-structure/route.ts` mutate stores but never call `persistProjectDemoState()`. Add the call. Add tests that survive a server restart.
- **Blocked by:** PR-03 (writes guarded), PR-04 (input validated)
- **Test plan:** E2E that creates a user, simulates restart, asserts the user is still there
- **Risk:** low
- **Size:** S (3h)

---

### Phase 2 — Tech cleanups

#### PR-08 — chore: remove dead `useNotificationStore`
- **Scope:** `src/stores/useNotificationStore.ts:9` hardcodes `unreadCount: 8` and `setUnreadCount`/`decrementUnread` are never called. Wire to `useNotifications` React Query unread count, OR delete the store and read the count inline in `Header.tsx:45`. Recommend the latter — it's simpler.
- **Blocked by:** none
- **Test plan:** Playwright assertion that Header bell reflects real unread count
- **Risk:** low
- **Size:** S (1-2h)

#### PR-09 — refactor: COLORS palette + replace hardcoded literals
- **Scope:** Extend `src/theme/antd-theme.ts` `COLORS` with `neutralGray`, `surfaceMuted`, `baselineBar`, etc. Replace 108 hex literals + 10 hardcoded `฿` symbols. Add `no-restricted-syntax` ESLint rule preventing regression (catches hex regex in `src/` files outside `theme/` + `export-utils.ts`).
- **Blocked by:** none
- **Test plan:** Playwright visual screenshots on representative pages
- **Risk:** low (pure substitution)
- **Size:** M (1d)

#### PR-10 — refactor: `generated-project-data.ts` → JSON fixtures
- **Scope:** Split the 1,749-line TS file into per-entity JSON files under `src/data/generated/`. TS aggregator becomes a thin re-export or is deleted.
- **Blocked by:** PR-02
- **Test plan:** data-shape Vitest tests; existing E2E unchanged
- **Risk:** low
- **Size:** M (4h)

#### PR-11 — fix: move `getXxxStore()` inside API handlers
- **Scope:** 11 routes capture store references at module-load before any hydration: `quality/inspections`, `boq/[wbsId]`, `wbs/[projectId]`, `risks/[projectId]`, `daily-reports`, `daily-reports/[id]`, `evm/[projectId]`, `issues/[projectId]`, `change-requests`, `quality/gates/[projectId]`. Move `const store = getXxxStore();` inside the handler after `await ensureProjectDemoStateHydrated();`. Latent bug today only because `replaceArrayContents` uses in-place `splice`.
- **Blocked by:** PR-02 (tests pin behavior)
- **Blocks:** PR-18 (cleaner refactor target)
- **Test plan:** existing E2E + targeted regression test simulating pre-hydration handler call
- **Risk:** low
- **Size:** S (2-3h)

#### PR-12 — perf: targeted `'use client'` cleanup
- **Scope:** Audit every `'use client'` file. Drop the directive ONLY from files with no hooks and no event handlers. Concrete exclusions per senior review: do NOT touch `KPICard.tsx` (has handlers), do NOT touch `(dashboard)/layout.tsx` (uses AntD breakpoint hooks + Zustand). Also gate the 12-route prefetch loop in `(dashboard)/layout.tsx:23-42` to `NODE_ENV === 'development'`.
- **Blocked by:** none
- **Test plan:** existing Playwright (visual unchanged); Lighthouse first-paint budget on representative pages
- **Risk:** low
- **Size:** S (3h)

---

### Phase 3 — RID vocabulary

#### PR-13 — feat(rid): canonical RID domain vocabulary
- **Scope:** One PR that establishes the entire RID type vocabulary so subsequent PRs share names. Glossary lives at `src/types/rid/README.md`. Establishes:
  - `projectClass: 'construction' | 'it' | 'consulting'`
  - `deliveryMethod: 'in_house' | 'outsourced' | 'consultant_supervised'` — **aliased to existing `internal | outsourced`** in `src/types/project.ts:4` for back-compat during migration
  - `contractingModel: 'lump_sum' | 'unit_price' | 'cost_plus' | 'design_build'`
  - `projectSizeTier: 'small' | 'medium' | 'large'` with budget thresholds defined as constants (small ≤ 50M฿, medium 50M–500M฿, large > 500M฿ — confirm with RID stakeholder)
  - `ridLifecycleStage: 'planning' | 'survey_design' | 'procurement' | 'construction' | 'handover' | 'om'`
  - `ridOrgUnit` taxonomy with discriminator type (department, bureau, regional office, construction office, provincial office, O&M project, basin overlay)
- **Blocked by:** **stakeholder confirmation** on terminology before merge
- **Test plan:** type-only; no runtime change
- **Risk:** low
- **Size:** M (1d)

---

### Phase 4 — RID type shapes (all behind flags OFF)

#### PR-14 — feat(rid): `projectSizeTier` + budget thresholds + approval authority
- **Scope:** Extend `Project` with `sizeTier` (default `medium` for existing rows); tier-driven budget thresholds; approval-authority table per tier (small: section head; medium: bureau director; large: deputy director-general).
- **Blocked by:** PR-13
- **Risk:** low
- **Size:** S (4h)

#### PR-15 — feat(rid): `deliveryMethod` + `contractingModel` reconciled with existing types
- **Scope:** Migrate `ProjectExecutionModel` callers from `internal | outsourced` → `in_house | outsourced` (renamed); add `consultant_supervised` (Full Vision); add `contractingModel`. Provide back-compat alias during the migration. Update the EVM mode-switching logic that already exists per coding-log `internal-vs-outsourced-evm-model`.
- **Blocked by:** PR-13
- **Test plan:** EVM math regression tests under each mode
- **Risk:** medium (touches existing logic, but with alias safety net)
- **Size:** M (1d)

#### PR-16 — feat(rid): RID lifecycle-stage model (SEPARATE from QualityGatePipeline)
- **Scope:** New `<RidLifecycleGates>` component for the 6-stage RID construction lifecycle. `QualityGatePipeline` retained unchanged for ITP/inspection gates — two distinct domain concepts, two distinct components. Project detail page renders both. Lifecycle gates have artifact requirements (e.g., construction stage requires SOP 8.2 approval doc).
- **Blocked by:** PR-13
- **Test plan:** snapshot tests of both components side-by-side
- **Risk:** medium (visible workflow component)
- **Size:** M (1-2d)

#### PR-17 — feat(rid): rich RID org tree
- **Scope:** Multi-tier org model: กรม → สำนัก → กอง / สำนักงานชลประทาน 1–17 → สำนักงานก่อสร้าง 1–24 (with ขนาดเล็ก/กลาง/ใหญ่ qualifier) → โครงการชลประทานจังหวัด → โครงการส่งน้ำและบำรุงรักษา. Plus basin/geography overlay and cost-center mapping. Existing flat data migrates under a default tree root so the admin page renders unchanged.
- **Blocked by:** PR-13, PR-07 (admin writes persist)
- **Test plan:** tree-traversal unit tests; existing admin E2E green
- **Risk:** low (additive; existing data preserved)
- **Size:** L (2-3d)

---

### Phase 5 — Foundation switch

#### PR-18 — refactor: repository abstraction over stores
- **Scope:** Define `interface ProjectRepository`, `interface WbsRepository`, etc., one per domain. Implement `InMemoryProjectRepository` wrapping today's `getProjectStore()`. **Every API route calls the repository, not the store.** Stores still exist underneath; nothing observable changes. The 18 `*-store.ts` files survive but become implementation detail.
- **Blocked by:** PR-04 (validated input), PR-11 (clean hydration), PR-13–17 (types finalized)
- **Test plan:** contract tests per repository interface — these become the DB-impl tests in PR-19
- **Risk:** medium (mechanical change across many files)
- **Size:** L (3d)

#### PR-19 — feat(infra): Postgres adapter — schema + backfill
- **Scope:** Provision Neon Postgres (demo); define Drizzle schema reflecting RID-aligned types from Phase 3–4. Migration scripts. `DatabaseProjectRepository` etc. implementing the PR-18 interfaces. Backfill script that hydrates DB from current JSON fixtures + blob state. **Not wired into routes yet.** Schema uses portable Postgres only — no Neon-specific extensions — so on-prem/GDCC migration later is a deployment swap.
- **Blocked by:** PR-18
- **Test plan:** PR-18 contract tests run against DB repo; data-parity test asserting fresh hydration matches current blob state
- **Risk:** medium
- **Size:** L (3-4d)

#### PR-20 — feat(infra): dual-write soak
- **Scope:** Repository writes go to both blob AND DB; reads stay on blob. Feature flag `PERSISTENCE_BACKEND=dual`. 1-week preview-environment soak before next PR. Data-parity Playwright suite runs nightly comparing blob vs. DB query results.
- **Blocked by:** PR-19
- **Test plan:** parity suite; concurrency stress test
- **Risk:** medium (write-amplification cost; race conditions)
- **Size:** M (1-2d)

#### PR-21 — feat(infra): cut reads to DB; retire stores + blob persistence ✅
- **Scope:** Flip `PERSISTENCE_BACKEND=db`. Blob retained as cold archive for one release. After soak: delete 18 `*-store.ts` files, delete `project-demo-state.ts`, update CLAUDE.md. The store-factory consolidation comes for free here (no factory ever needed to be built).
- **Blocked by:** PR-20 (clean soak)
- **Test plan:** full E2E suite on DB-only backend
- **Risk:** **HIGH** — biggest single PR; mitigated by flag-based rollback (flip back to `dual`)
- **Rollback:** flip env var; data parity preserved by dual-write window
- **Size:** L (2-3d)
- **Status (2026-05-30):** **Complete.** Landed in two PRs:
  - **PR-21 (#28):** blob-snapshot retirement
    (`project-demo-state.ts` deleted; `ensureProjectDemoStateHydrated()`
    / `persistProjectDemoState()` calls stripped; `ensureDatabaseReady()`
    introduced). Redundant test runners removed. Parity helper +
    script re-pointed at DB ↔ DB for future blue/green migrations.
  - **PR-21b:** in-place-mutation refactor (12+ routes converted to
    explicit `.update()`), default flip to `db`, deletion of 18
    `*-store.ts` files + dual-write infrastructure, async auth helpers,
    `ensureDatabaseSeeded()` bootstrap with fixture seed. `'dual'`
    accepted as no-op alias for back-compat.

---

### Phase 6 — Page-shape cleanup

#### PR-22 — refactor: split oversized pages into `_components/` [EPIC, stack as 3]
- **Scope:** All 8 offenders:
  - 22a: `projects/[id]/gantt/page.tsx` (1,420 → ~150 + `_components/`)
  - 22b: `projects/[id]/daily-report/page.tsx` (1,333 → ~150 + `_components/`)
  - 22c: `projects/new`, `documents`, `s-curve`, `admin`, `wbs`, `dashboard` (6 files in one PR — smaller each)
- **Blocked by:** PR-21 (persistence settled; avoids merge conflict storm)
- **Test plan:** Playwright E2E unchanged; screenshot diff catches render regressions
- **Risk:** medium (lots of moved code); mitigation = strict "move, don't change" rule
- **Size:** L (3-5d total)

---

### Phase 7 — RID workflow features

#### PR-23 — feat(rid): งวดงาน-driven milestone & payment flow
- **Scope:** New `WorkPeriod` (งวดงาน) entity linked to project + milestone. Per period: deliverable list, ใบส่งมอบงาน (delivery slip generator), committee inspection record (with PR-05 audit-event integration), payment voucher state. State machine driven by `deliveryMethod`. Behind flag `FEATURE_RID_PAYMENT_FLOW`.
- **Blocked by:** PR-16 (lifecycle gates), PR-21 (DB), PR-15 (delivery method)
- **Test plan:** state-machine unit tests; full-flow E2E
- **Risk:** medium (new domain area; feature-flagged)
- **Size:** L (1 week)

#### PR-24 — feat(rid): procurement package + TOR + estimate + contract
- **Scope:** RID-fit gap. Models: ProcurementPackage, TOR document with template, BOQ-based EngineeringEstimate, AwardedContract with terms, ContractAmendment. Links upstream to Project, downstream to งวดงาน. Includes contractor pre-qualification record (PQ-AHP reference; full AHP scoring deferred post-MVP).
- **Blocked by:** PR-21, PR-15 (contracting model)
- **Test plan:** entity-relationship integrity tests; document export snapshot tests
- **Risk:** medium (new domain)
- **Size:** L (1 week)

#### PR-25 — feat(rid): permits + environment + social + land-acquisition controls
- **Scope:** RID-fit gap. Land acquisition and asset compensation are documented top-3 delay drivers (Tiyarathtagarn thesis). EIA/IEE checkpoints; public-hearing records (lightweight — full public participation deferred per stakeholder decision); permit register; "pre-construction conditions met" gate added to PR-16 lifecycle.
- **Blocked by:** PR-16, PR-21
- **Test plan:** gate-blocking E2E (construction stage cannot start until conditions met)
- **Risk:** low (additive)
- **Size:** L (4d)

#### PR-26 — feat(rid): water/asset/O&M handover workflow
- **Scope:** RID-fit gap. Implements RID SOP 8.1 (`การส่งมอบ-รับมอบ`) and 8.10 (operational quality). Handover artifacts (as-built drawings register, O&M manual link, warranty period start, asset registration in RID asset-system-compatible format). Transition from construction stage to O&M stage gated on artifact completeness.
- **Blocked by:** PR-16, PR-21, PR-24 (contract for warranty terms)
- **Test plan:** handover-checklist completeness test; as-built register upload test
- **Risk:** low
- **Size:** L (4d)

#### PR-27 — feat: change-request + project-approval workflow completion
- **Scope:** Fills MVP gap from `CURRENT_IMPLEMENTATION_TRACKER.md` (change-request and approval currently read-only API). Two flows:
  - **Change request:** submit → impact analysis (schedule/cost/scope) → role-based approval (small CRs at PM level, medium at bureau, large requires committee per PR-14 authority table) → applied or rejected, audit-event-recorded
  - **Project approval workflow:** the project-creation approval path (currently `approval/page.tsx` with no API)
- Change orders are a documented top-3 cost-overrun driver per Tiyarathtagarn — first-class RID concept.
- **Blocked by:** PR-21, PR-03 (authz), PR-05 (audit)
- **Test plan:** end-to-end change-request lifecycle E2E; approval routing tests per role × tier
- **Risk:** medium (new write surfaces)
- **Size:** L (1 week)

---

### Phase 8 — Reporting & quality

#### PR-28 — feat(rid): PMQA dashboard (PM-related categories only)
- **Scope:** Per stakeholder decision, scope to OPDC PMQA categories most relevant to project management:
  - **Category 2 — Strategic Planning:** strategy-to-project alignment KPIs
  - **Category 6 — Process Management:** process maturity per lifecycle stage; on-time stage transitions
  - **Category 7 — Results:** project outcomes (on-time%, on-budget%, quality-gate pass rate)
  - Categories 1, 3, 4, 5 (Leadership, Customer Focus, Measurement, Workforce) deferred post-MVP unless PMQA reviewer requires.
- Executive page rollup from project metrics; export in ก.พ.ร. audit-friendly format (PDF/Excel).
- **Blocked by:** PR-17 (org tree for rollup), PR-21
- **Test plan:** KPI calculation unit tests; export snapshot test
- **Risk:** low (read-only)
- **Size:** M (3d)

#### PR-29 — feat(rid): RID progress-reporting templates — RESEARCH + IMPLEMENT
- **Scope:** Two-phase PR:
  - **(a) Discovery commit:** pull the actual progress-report template from current RID e-GP contract clauses (sample procurement docs from procurement.rid.go.th). Stakeholder review checkpoint.
  - **(b) Implement commit:** report generator with snapshot test against the cited template. Supports monthly + งวด-completion + ad-hoc delay reports. PDF export.
- **Blocked by:** PR-23 (งวดงาน data exists)
- **Test plan:** snapshot tests against the cited template
- **Risk:** low (additive; gated on cited reference)
- **Size:** M (2-3d implement + research)

---

### Phase 9 — IT class + integrations

#### PR-30a — feat(rid-it): IT project class extensions
- **Scope:** For `projectClass='it'`:
  - **Vendor contract module** (SOW per phase, UAT acceptance criteria, deliverable signoff, warranty)
  - **Sprint board** (Kanban already exists) nested inside lifecycle stage — Hybrid-Agile per PMI Thailand Chapter publications
  - **Knowledge-area tabs** named per **RID's own DT6 Digital Project Management Document**, not PMBOK directly: integration, communication plan, formal procurement plan
- Per stakeholder note: don't impose PMBOK terminology; align to DT6.
- **Blocked by:** PR-15, PR-21, PR-24 (contract entity)
- **Test plan:** routing tests; visual snapshots
- **Risk:** medium (UI complexity)
- **Size:** L (1 week)

#### PR-30b — feat(integrations): external-system discovery + validated contract fixtures
- **Scope:** Per stakeholder decision (validate live at demo, not before MVP), four-track discovery:
  - **e-GP** — pull real procurement reference format from procurement.rid.go.th sample; store as fixture; entity linking ready
  - **GFMIS** — disbursement record format; exportable fixture; new GFMIS Thai endpoint structure documented
  - **PFMS-SP2** — fixture only; validation conversation to happen at demo with RID IT stakeholder (per Q3 decision)
  - **PBMS** — fixture only; same caveat
- **Output:** documented contracts + sandbox tests + go/no-go decision pending demo conversation + roadmap entries for actual adapters as **post-MVP work**.
- **Blocked by:** PR-21, PR-23 (payment flow exists to integrate against), PR-17 (org tree → GFMIS cost-center mapping)
- **Test plan:** fixture-format snapshot tests; sandbox integration tests where APIs exist publicly
- **Risk:** low (research; not building adapters)
- **Size:** M (research-heavy, 3-4d)

---

## Dependency graph

This graph reflects the per-PR `blocked by` declarations verbatim. Phase 1 PRs are **not** strictly serial — PR-03 and PR-04 can run in parallel, PR-07 depends on both but not on PR-05/06, etc.

```
PR-01 (docs) ─── independent ─── ship day 1

PR-02 (tests) ─┬── PR-03 (authz) ─┬── PR-05 (audit) ─── PR-06 (doc security)
               │                  └─┐
               ├── PR-04 (validation) ┼── PR-07 (persist admin writes)
               ├── PR-10 (JSON data extraction)
               └── PR-11 (hydration-order fix)

PR-08 (dead Zustand), PR-09 (color tokens), PR-12 ('use client') ─── parallel with Phase 0/1; no Phase-1 deps

PR-13 (vocabulary) ─┬── PR-14 (size tier)
                    ├── PR-15 (delivery method)
                    ├── PR-16 (lifecycle gates)
                    └── PR-17 (org tree)   [also blocked by PR-07]

PR-04 + PR-11 + PR-13–17 ─── PR-18 (repo abstraction) ─── PR-19 (postgres adapter)
                                                              │
                                                              └─── PR-20 (dual write soak) ─── PR-21 (cutover)

PR-21 ─── PR-22a/b/c (page splits, stacked)

PR-21 ─┬── PR-23 (งวดงาน) ──────────────┬── PR-29 (RID reports — needs งวดงาน data)
       ├── PR-24 (procurement) ──┐       │
       ├── PR-25 (permits/land)  │       │
       ├── PR-26 (handover) ◀────┤       │
       ├── PR-27 (change request)│       │
       ├── PR-28 (PMQA)          ▼       │
       └─────────────────── PR-30a (IT — needs PR-24)
       └─────────────────── PR-30b (integrations — needs PR-23 + PR-17)
```

**Critical-path note:** PR-18 → PR-19 → PR-20 → PR-21 is a **hard serial chain** — each blocks the next, with PR-20 requiring a 1-week soak period. This chain dominates total schedule length and cannot be parallelized.

---

## Parallel execution model

Yes — multiple PRs can run in parallel. The safe parallelism is mostly in cleanups, type-shape work, research/discovery, page splits, and post-cutover RID workflows. The persistence chain remains serial.

| Workstream | PRs that can run in parallel | Preconditions | Merge rule |
|---|---|---|---|
| Day-1 docs/tests/cleanups | PR-01, PR-02, PR-08, PR-09, PR-12 | None | PR-01 should merge first if it changes contributor guidance; the others can merge independently |
| Phase 1 controls | PR-03 and PR-04 | PR-02 merged | PR-07 waits for both; PR-05 waits for PR-03; PR-06 waits for PR-05 |
| Phase 2 refactors | PR-10 and PR-11 | PR-02 merged | Can run beside Phase 1, but PR-11 touches API routes and should coordinate with PR-03/04/05 route edits |
| RID type-shape fanout | PR-14, PR-15, PR-16 | PR-13 signed off | Can merge independently after PR-13; PR-17 also joins once PR-07 is merged |
| Research-only discovery | PR-29a discovery, parts of PR-30b fixture research | Stakeholder scope agreed | Can start before PR-21, but implementation/merge waits for formal blockers |
| Page split stack | PR-22a, PR-22b, PR-22c | PR-21 merged | Can branch in parallel by page ownership; merge one at a time with screenshot checks |
| RID workflow fanout | PR-23, PR-24, PR-25, PR-27, PR-28 | PR-21 merged and earlier domain blockers satisfied | Can run in parallel if each PR owns distinct models/routes/pages; PR-26 waits for PR-24 |
| Final dependent work | PR-29b, PR-30a, PR-30b finalization | PR-23/24 complete as applicable | PR-29b waits for PR-23; PR-30a waits for PR-24; PR-30b waits for PR-23 |

**Do not parallelize:** PR-18 → PR-19 → PR-20 → PR-21. This is the persistence critical path. Branching ahead here increases rebase cost and raises the chance that the repository contract, Drizzle schema, dual-write behavior, and cutover semantics drift apart.

**Conditional parallelism:** PR-22 page splits and Phase 7 feature work may overlap after PR-21, but only if each developer owns a page or domain boundary. If a feature requires heavy edits to a page currently being split, finish that page split first and then layer the feature on top.

---

## Suggested calendar — single developer

| Week | Work in flight |
|---|---|
| 1 | PR-01, 02, 08, 09, 12 (parallel quick wins) |
| 2 | PR-03, 04 |
| 3 | PR-05, 06 |
| 4 | PR-07, 10, 11; start PR-13 |
| 5 | PR-13 stakeholder review; PR-14, 15 |
| 6 | PR-16, 17 |
| 7 | PR-18 (repo abstraction) |
| 8 | PR-19 (Postgres) |
| 9 | PR-20 (dual write — soak period) |
| 10 | PR-21 (cutover) |
| 11–12 | PR-22 (page splits, 3 sub-PRs) |
| 13–14 | PR-23 (งวดงาน) |
| 15 | PR-24 (procurement) |
| 16 | PR-25 (permits/land) |
| 17 | PR-26 (handover) |
| 18 | PR-27 (change request) |
| 19 | PR-28 (PMQA) + PR-29 (reports) |
| 20 | PR-30a (IT) |
| 21 | PR-30b (integrations discovery) |
| 22 | MVP demo with RID stakeholder; PFMS-SP2/PBMS validation conversation |

**Single-dev total: ~22 weeks.**

## Suggested calendar — two developers (realistic, not "halved")

PR-18 → PR-19 → PR-20 → PR-21 is a hard serial critical path that must run on a single developer (Dev A). Dev B works parallel tracks that do not contend with the persistence chain or that explicitly do not block on PR-21. The result is roughly an **18% calendar compression**, not 50%; more aggressive overlap is possible but raises page-split and feature-branch rebase risk.

| Week | Dev A | Dev B |
|---|---|---|
| 1 | PR-01, 02 | PR-08, 09 |
| 2 | PR-03 | PR-04 |
| 3 | PR-05 | PR-12, 10 |
| 4 | PR-06 | PR-11, start PR-13 draft |
| 5 | PR-07 | PR-13 stakeholder review, PR-14 |
| 6 | PR-15 | PR-16 |
| 7 | **PR-17** (org tree, gates PR-18) | PR-29a discovery (research only — read RID e-GP templates) |
| 8 | **PR-18** (repo abstraction) | PR-30b discovery half (fixture research only — e-GP/GFMIS formats) |
| 9 | **PR-19** (Postgres adapter) | continue PR-30b research; draft PR-22 splitting strategy doc |
| 10 | **PR-20** (dual write soak begins) | PR-22a draft (gantt split) — held in branch, can't merge until PR-21 |
| 11 | **PR-20 soak continues** | PR-22b draft (daily-report split) — held in branch |
| 12 | **PR-21** (cutover) | merge PR-22a immediately after cutover |
| 13 | PR-22b merge; start PR-23 | PR-22c (remaining 6 pages) |
| 14 | PR-23 (งวดงาน) cont. | PR-24 (procurement) |
| 15 | PR-25 (permits/land) | PR-26 (handover) |
| 16 | PR-27 (change request) | PR-28 (PMQA) |
| 17 | PR-29b (reports — implement) | PR-30a (IT class) |
| 18 | PR-30b finalize | MVP demo prep + PFMS/PBMS validation conversation |

**Two-dev total: ~18 weeks (~18% faster than single-dev's 22 weeks, not 50%).**

Why not a true halving: the persistence chain (weeks 7–12) keeps Dev A occupied serially for 6 weeks; Dev B can only do research/discovery during that window since most feature PRs block on PR-21. Adding a third developer beyond two does not compress the critical path further — it would only enable more discovery work in parallel, which is not on the critical path.

---

## Risk matrix

| PR | Risk | Mitigation |
|---|---|---|
| PR-05 (audit) | Touches every write path | Land after PR-03/04 so authz+validation are stable |
| PR-06 (doc security) | Changes hot path | Feature flag for signed-URL transition; keep blob public read for 1 release as fallback |
| PR-15 (delivery method) | Renames existing types | Alias old names during migration |
| PR-16 (lifecycle gates) | Visible workflow component | Side-by-side render with QualityGatePipeline during transition |
| PR-18 (repo abstraction) | Touches every API route | Mechanical; one domain per commit |
| PR-19 (Postgres) | Vendor lock | Portable Postgres only; no Neon extensions |
| PR-20 (dual write) | Race conditions | 1-week soak in preview before cutover |
| PR-21 (cutover) | **Highest single risk** | Flag-based rollback (`PERSISTENCE_BACKEND=dual` revert); blob kept as cold archive |
| PR-22 (page splits) | Lots of moved code | Strict "move, don't change" rule; screenshot diffs |
| PR-23 (งวดงาน) | New domain + payment semantics | Feature flag; payment voucher is mock until PR-30b GFMIS validation |
| PR-30a (IT) | UI complexity | Use existing Kanban component; nest in lifecycle gates |
| PR-30b (integrations) | External validation pending | Discovery only; no production adapters in MVP |

---

## Out of MVP (post-MVP roadmap)

- **PR-X1:** Public-participation module (per stakeholder Q4)
- **PR-X2:** Real auth (SSO/OIDC) replacing demo userId login (per stakeholder Q5 — deferred decision)
- **PR-X3:** Production adapter implementations for e-GP, GFMIS, PFMS-SP2, PBMS (depends on PR-30b validation outcomes)
- **PR-X4:** Mobile-specific UX (currently `(mobile)/` group is absent — IMPLEMENTATION_PLAN.md placeholder only)
- **PR-X5:** Advanced search (Elasticsearch) over documents
- **PR-X6:** AI features (auto-summarization, anomaly detection on EVM trends, etc.)
- **PR-X7:** Remaining 4 PMQA categories (Leadership, Customer Focus, Measurement, Workforce) if PMQA reviewer requires
- **PR-X8:** Full PQ-AHP contractor scoring (currently stubbed in PR-24 as reference)
- **PR-X9:** GDCC / on-prem Postgres deployment (PR-19 schema is portable; deployment-only change)

---

## Stakeholder review gates

These PRs require explicit sign-off before merge:

1. **PR-13** — RID terminology vocabulary
2. **PR-14** — Budget tier thresholds (50M / 500M cutoffs need RID confirmation)
3. **PR-16** — Lifecycle stage names and artifact requirements
4. **PR-17** — Org tree taxonomy (which RID office types are first-class)
5. **PR-28** — PMQA category selection (current scope: 2, 6, 7)
6. **PR-29a** — Cited progress-report template
7. **PR-30b** — Demo-time validation of PFMS-SP2/PBMS scope

---

## Open questions still to resolve

- **PR-14 budget thresholds** — what are RID's actual size-tier cutoffs in THB?
- **PR-17 cost-center mapping** — does GFMIS require a specific cost-center code format from RID projects?
- **PR-23 payment voucher** — is the demo enough or does the bid require a real GFMIS-compatible voucher PDF?
- **PR-24 PQ-AHP weights** — use the published Sripatum weights (25 / 55 / 12 / 8) or RID's current weights if different?
- **PR-30b validation contacts** — confirm correct stakeholder name + role at RID IT before the MVP demo

---

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| **งวดงาน** | Work period — a defined slice of contracted work with its own deliverable list, inspection, and payment trigger |
| **ใบส่งมอบงาน** | Delivery slip — formal handover document per งวดงาน |
| **Full Vision** | RID contract type where a consultant fully supervises construction on RID's behalf |
| **PMQA** | Public Sector Management Quality Award — OPDC framework all Thai gov agencies report against |
| **PMBOK** | PMI Project Management Body of Knowledge — referenced by RID's DT6 doc, not officially mandated |
| **DT6** | RID's own "Digital Project Management Document" — PMBOK-aligned but RID-specific vocabulary |
| **e-GP** | Thai government electronic procurement system (Comptroller General's Department) |
| **GFMIS** | Government Fiscal Management Information System — mandatory for all Thai gov accounting |
| **PFMS-SP2** | RID's internal budget e-Form system (validation pending per stakeholder decision) |
| **PBMS** | Performance + budget tracking system (validation pending per stakeholder decision) |
| **OPDC** | Office of the Public Sector Development Commission (ก.พ.ร.) |
| **GDCC** | Government Data Center & Cloud — Thai gov cloud, sometimes mandatory |
| **Neon** | Serverless Postgres hosting; chosen for demoable MVP |

---

## Appendix B — Mapping back to original 20-fix list

| Original fix | Now lands in |
|---|---|
| T1 (hydration order) | PR-11 |
| T2 (CLAUDE.md fix) | PR-01 |
| T3 (Postgres migration) | PR-18, 19, 20, 21 |
| T4 (store factory) | Free as part of PR-21 (no separate PR needed) |
| T5 (page splits) | PR-22 |
| T6 (JSON data) | PR-10 |
| T7 (Vitest) | PR-02 |
| T8 (color tokens) | PR-09 |
| T9 (dead Zustand) | PR-08 |
| T10 (`'use client'`) | PR-12 |
| R1 (two-mode execution) | PR-15 |
| R2 (RID lifecycle) | PR-16 |
| R3 (size tier) | PR-14 |
| R4 (30-day report) | PR-29 |
| R5 (งวดงาน) | PR-23 |
| R6 (org hierarchy) | PR-17 |
| R7 (PMBOK for IT) | PR-30a (re-framed as DT6 + Hybrid-Agile) |
| R8 (vendor contracts) | PR-30a (folded into IT extensions) |
| R9 (PMQA) | PR-28 |
| R10 (integrations) | PR-30b (discovery, not adapters) |
| **(senior review additions)** | |
| Authorization policy | PR-03 |
| Runtime validation | PR-04 |
| Audit/evidence model | PR-05 |
| Document security | PR-06 |
| Persist admin/org writes | PR-07 |
| Procurement entity | PR-24 |
| Permits/land controls | PR-25 |
| Handover workflow | PR-26 |
| Change-request completion | PR-27 |

---

## Appendix C — Decisions log (2026-05-27)

- **Hosting:** Neon Postgres for MVP demo; schema portable for on-prem/GDCC migration later.
- **PMQA scope:** Categories 2 + 6 + 7 only; others deferred post-MVP.
- **External-system validation:** Discovery + fixtures in MVP; live validation conversation with RID IT happens at the demo, not before.
- **Public participation:** Post-MVP.
- **Real auth:** Deferred; demo userId login retained.

---

## Appendix D — Senior review history

| Round | Date | Focus | Key changes accepted |
|---|---|---|---|
| Round 1 | 2026-05-27 | Plan completeness | Added 5 production-control PRs (authz, validation, audit, doc security, persist admin writes); consolidated RID type PRs through a vocabulary PR; reframed integrations as discovery; corrected `'use client'` scope; renamed Neon → "Postgres adapter"; required cited template for RID reports; replaced PMBOK with RID-DT6 vocabulary; added 4 RID-fit-gap PRs (procurement, permits, handover, public participation [later dropped]) |
| Round 2 | 2026-05-27 | Plan accuracy | Clarified true PR count (~33 review units); softened "stakeholder-confirmed scope" header; fixed dependency-graph oversimplification of Phase 1; renamed "production controls" to "operational controls" with auth-scope caveat; replaced "halve with 2 devs" with realistic 2-dev calendar respecting serial persistence chain |
| Round 3 | 2026-05-27 | Parallel execution | Added explicit parallel-execution model; identified safe parallel PR groups; documented non-parallel persistence critical path; fixed two-dev schedule compression math |

---

*End of plan. Update this document as PRs land and stakeholder feedback arrives. Treat the PR specifications as binding contracts for scope; treat the calendar as advisory.*
