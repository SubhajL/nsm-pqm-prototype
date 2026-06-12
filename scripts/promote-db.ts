/**
 * Promote (merge / upsert) data from one database into another.
 *
 * Source defaults to the local dev DB. Target is derived from the Neon URL
 * in `.env.local`:  `--target preview` → neondb_preview,  `--target prod` → neondb.
 * (Or pass `--source-url` / `--target-url` explicitly.)
 *
 * Merge semantics: every row is INSERTed; on primary-key conflict the existing
 * target row is UPDATEd from the source. Rows that exist in the target but not
 * in the source are LEFT ALONE (non-destructive — see [[vercel_db_topology]]).
 *
 * Safety: dry-run by default (prints what it would do, writes nothing). Pass
 * `--apply` to write. Writing to production (`neondb`) additionally requires
 * `--confirm`.
 *
 * Usage:
 *   npx tsx scripts/promote-db.ts --target preview                 # dry-run
 *   npx tsx scripts/promote-db.ts --target preview --apply
 *   npx tsx scripts/promote-db.ts --target prod --apply --confirm
 *
 * Excludes Drizzle's migration bookkeeping table.
 */

import { readFileSync } from 'node:fs';
import postgres from 'postgres';

type Row = Record<string, unknown>;

const argv = process.argv.slice(2);
const has = (name: string) => argv.includes(`--${name}`);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const APPLY = has('apply');
const CONFIRM = has('confirm');
const LOCAL_URL = 'postgresql://localhost:5432/nsm_pqm_dev';
const EXCLUDE = new Set(['__drizzle_migrations']);
const CHUNK = 500;

function envLocalDatabaseUrl(): string | undefined {
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split('\n')
      .find((l) => l.startsWith('DATABASE_URL='));
    return line?.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '');
  } catch {
    return undefined;
  }
}

function resolveTargetUrl(): string {
  const explicit = opt('target-url');
  if (explicit) return explicit;
  const t = opt('target');
  const base = envLocalDatabaseUrl();
  if (!base) throw new Error('Pass --target-url, or ensure .env.local has DATABASE_URL for --target preview|prod');
  if (t === 'prod') return base;
  if (t === 'preview') return base.replace(/\/neondb(\?|$)/, '/neondb_preview$1');
  throw new Error('Specify --target preview|prod (or --target-url <url>)');
}

const dbName = (url: string) => url.match(/\/([^/?]+)(\?|$)/)?.[1] ?? '?';
const masked = (url: string) => url.replace(/:\/\/[^@]*@/, '://***@').replace(/\?.*/, '');

async function tablesInFkOrder(sql: postgres.Sql): Promise<string[]> {
  const tbls = (
    await sql<{ name: string }[]>`
      select table_name as name from information_schema.tables
      where table_schema='public' and table_type='BASE TABLE'`
  ).map((r) => r.name);
  const fks = await sql<{ child: string; parent: string }[]>`
    select conrelid::regclass::text as child, confrelid::regclass::text as parent
    from pg_constraint where contype='f'`;
  const strip = (q: string) => q.replace(/^public\./, '').replace(/"/g, '');
  const indeg = new Map(tbls.map((t) => [t, 0]));
  const adj = new Map<string, string[]>(tbls.map((t) => [t, []]));
  for (const f of fks) {
    const p = strip(f.parent);
    const c = strip(f.child);
    if (p !== c && indeg.has(c) && adj.has(p)) {
      adj.get(p)!.push(c);
      indeg.set(c, indeg.get(c)! + 1);
    }
  }
  const queue = tbls.filter((t) => indeg.get(t) === 0);
  const out: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    out.push(n);
    for (const m of adj.get(n)!) {
      indeg.set(m, indeg.get(m)! - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }
  for (const t of tbls) if (!out.includes(t)) out.push(t); // cycle fallback
  return out;
}

async function columnsOf(sql: postgres.Sql, table: string): Promise<string[]> {
  return (
    await sql<{ c: string }[]>`
      select column_name as c from information_schema.columns
      where table_schema='public' and table_name=${table}
      order by ordinal_position`
  ).map((r) => r.c);
}

async function pkOf(sql: postgres.Sql, table: string): Promise<string[]> {
  return (
    await sql<{ c: string }[]>`
      select a.attname as c
      from pg_index i
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = ${`public.${table}`}::regclass and i.indisprimary
      order by a.attnum`
  ).map((r) => r.c);
}

async function main(): Promise<void> {
  const sourceUrl = opt('source-url') ?? LOCAL_URL;
  const targetUrl = resolveTargetUrl();
  const targetIsProd = dbName(targetUrl) === 'neondb';

  console.log(`[promote] source : ${masked(sourceUrl)} (db=${dbName(sourceUrl)})`);
  console.log(`[promote] target : ${masked(targetUrl)} (db=${dbName(targetUrl)})`);
  console.log(`[promote] mode   : ${APPLY ? 'APPLY upsert' : 'DRY-RUN (no writes)'}`);

  if (APPLY && targetIsProd && !CONFIRM) {
    console.error('[promote] ABORT: target is production (neondb). Re-run with --confirm to write to prod.');
    process.exit(1);
  }

  const source = postgres(sourceUrl, { onnotice: () => {} });
  const target = postgres(targetUrl, { onnotice: () => {} });

  try {
    const tables = await tablesInFkOrder(source);
    let grand = 0;
    for (const table of tables) {
      if (EXCLUDE.has(table)) continue;
      const cols = await columnsOf(source, table);
      const pk = await pkOf(source, table);
      const rows = (await source`select ${source(cols)} from ${source(table)}`) as unknown as Row[];
      if (rows.length === 0) continue;
      if (pk.length === 0) {
        console.log(`  [skip]   ${table}: ${rows.length} rows (no primary key)`);
        continue;
      }
      if (!APPLY) {
        console.log(`  [dry]    ${table}: ${rows.length} rows → upsert on (${pk.join(', ')})`);
        grand += rows.length;
        continue;
      }
      const nonPk = cols.filter((c) => !pk.includes(c));
      for (let i = 0; i < rows.length; i += CHUNK) {
        const batch = rows.slice(i, i + CHUNK);
        if (nonPk.length === 0) {
          await target`insert into ${target(table)} ${target(batch, ...cols)}
                       on conflict (${target(pk)}) do nothing`;
        } else {
          const setMap = Object.fromEntries(
            nonPk.map((c) => [c, target`excluded.${target(c)}`]),
          );
          await target`insert into ${target(table)} ${target(batch, ...cols)}
                       on conflict (${target(pk)}) do update set ${target(setMap)}`;
        }
      }
      console.log(`  [upsert] ${table}: ${rows.length} rows`);
      grand += rows.length;
    }
    console.log(
      `[promote] ${APPLY ? 'APPLIED' : 'DRY-RUN'} — ${grand} rows ${APPLY ? 'upserted' : 'pending'} across ${tables.length} tables`,
    );
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error('[promote] FAILED:', err);
  process.exit(1);
});
