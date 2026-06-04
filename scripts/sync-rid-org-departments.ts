/**
 * One-off sync: bring an already-seeded Postgres DB in line with the
 * refreshed RID org structure (`src/data/org-structure.json`) and the
 * project / user department assignments.
 *
 * The normal backfill seeder (`npm run db:seed`) is insert-only — it skips
 * any row that already exists — so editing fixtures does NOT update rows
 * that are already in the DB. This script:
 *
 *   1. UPSERTs every org unit (insert new, update renamed/re-parented ones).
 *   2. Sets each fixture project's departmentId/departmentName to the
 *      fixture value; normalizes every OTHER project's departmentName to
 *      match its departmentId (kills the "two bars, same name" bug).
 *   3. Normalizes every user's `department` to match its departmentId.
 *
 * Run (dry-run, prints changes, writes nothing):
 *   DRY_RUN=1 npx tsx scripts/sync-rid-org-departments.ts
 * Run (apply):
 *   npx tsx scripts/sync-rid-org-departments.ts
 *
 * Requires DATABASE_URL in the environment — it refuses to run otherwise so
 * it can never silently mutate an ephemeral pglite instead of the target.
 */

import { eq } from 'drizzle-orm';

import seedOrg from '@/data/org-structure.json';
import seedProjects from '@/data/projects.json';
import seedUsers from '@/data/users.json';
import { getDb } from '@/lib/db/client';
import { orgUnits } from '@/lib/db/schema/org-structure.schema';
import { projects } from '@/lib/db/schema/project.schema';
import { users } from '@/lib/db/schema/user.schema';

type OrgFixture = {
  id: string;
  kind: string;
  name: string;
  nameEn: string | null;
  parentId: string | null;
  costCenter: string | null;
};
type ProjFixture = { id: string; departmentId: string; departmentName: string };
type UserFixture = { id: string; departmentId: string; department: string };

const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const DEFAULT_DEPT_ID = 'dept-002-1';
const DEFAULT_DEPT_NAME = 'สำนักบริหารโครงการ';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      '[sync] ABORT: DATABASE_URL is not set — refusing to run against ephemeral pglite.',
    );
    process.exit(1);
  }
  const db = getDb();
  console.log(`[sync] target: $DATABASE_URL  mode: ${DRY ? 'DRY-RUN (no writes)' : 'APPLY'}`);

  const org = seedOrg as OrgFixture[];
  const orgById = new Map(org.map((u) => [u.id, u]));

  // 1) Org units — upsert.
  const existing = await db.select().from(orgUnits);
  const existingById = new Map(existing.map((r) => [r.id, r]));
  let orgInserted = 0;
  let orgUpdated = 0;
  for (const u of org) {
    const row = {
      id: u.id,
      kind: u.kind as (typeof orgUnits.$inferInsert)['kind'],
      name: u.name,
      nameEn: u.nameEn,
      parentId: u.parentId,
      costCenter: u.costCenter,
      constructionTier: null,
    };
    const before = existingById.get(u.id);
    if (!before) {
      console.log(`  [org] INSERT ${u.id} "${u.name}"`);
      if (!DRY) await db.insert(orgUnits).values(row);
      orgInserted++;
    } else if (
      before.name !== u.name ||
      before.parentId !== u.parentId ||
      before.kind !== u.kind ||
      before.nameEn !== u.nameEn
    ) {
      console.log(`  [org] UPDATE ${u.id}: "${before.name}" -> "${u.name}"`);
      if (!DRY) await db.update(orgUnits).set(row).where(eq(orgUnits.id, u.id));
      orgUpdated++;
    }
  }
  console.log(`[sync] org units: +${orgInserted} inserted, ~${orgUpdated} updated`);

  // 2) Projects — fixture rows get fixture dept; strays normalized by id.
  const projFixtureById = new Map((seedProjects as ProjFixture[]).map((p) => [p.id, p]));
  const dbProjects = await db
    .select({
      id: projects.id,
      departmentId: projects.departmentId,
      departmentName: projects.departmentName,
    })
    .from(projects);
  let projUpdated = 0;
  for (const p of dbProjects) {
    const fixture = projFixtureById.get(p.id);
    let deptId = p.departmentId;
    let deptName = p.departmentName;
    if (fixture) {
      deptId = fixture.departmentId;
      deptName = fixture.departmentName;
    } else {
      const unit = orgById.get(p.departmentId);
      if (unit) {
        deptName = unit.name;
      } else {
        deptId = DEFAULT_DEPT_ID;
        deptName = DEFAULT_DEPT_NAME;
      }
    }
    if (deptId !== p.departmentId || deptName !== p.departmentName) {
      console.log(
        `  [project] ${p.id}: ${p.departmentId}/"${p.departmentName}" -> ${deptId}/"${deptName}"`,
      );
      if (!DRY) {
        await db
          .update(projects)
          .set({ departmentId: deptId, departmentName: deptName })
          .where(eq(projects.id, p.id));
      }
      projUpdated++;
    }
  }
  console.log(`[sync] projects: ~${projUpdated} updated of ${dbProjects.length} in DB`);

  // 3) Users — normalize department name from departmentId.
  const userFixtureById = new Map((seedUsers as UserFixture[]).map((u) => [u.id, u]));
  const dbUsers = await db
    .select({ id: users.id, departmentId: users.departmentId, department: users.department })
    .from(users);
  let userUpdated = 0;
  for (const u of dbUsers) {
    const fixture = userFixtureById.get(u.id);
    const target = fixture?.department ?? orgById.get(u.departmentId)?.name ?? u.department;
    if (target !== u.department) {
      console.log(`  [user] ${u.id}: "${u.department}" -> "${target}"`);
      if (!DRY) await db.update(users).set({ department: target }).where(eq(users.id, u.id));
      userUpdated++;
    }
  }
  console.log(`[sync] users: ~${userUpdated} updated of ${dbUsers.length} in DB`);

  console.log(`[sync] ${DRY ? 'DRY-RUN complete — no writes made.' : 'APPLY complete.'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[sync] FAILED:', err);
  process.exit(1);
});
