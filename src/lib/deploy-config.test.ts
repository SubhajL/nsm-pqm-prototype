import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Pins the deploy-time migration contract.
//
// Per PR-21b + PR-2C: Postgres is the canonical and only persistence
// backend. The runtime has a lazy-bootstrap path (`ensureDatabaseSeeded`)
// that races to apply migrations on first request, but a fresh deploy
// against a new Neon database needs the schema applied BEFORE traffic
// hits — otherwise the very first request pays the migration cost,
// times out under cold-start, or 500s while runMigrations races.
//
// The intended pattern (per PR-2C team-lead audit) is to wire
// `npm run db:migrate` into Vercel's buildCommand so that schema
// is applied at deploy-time, deterministically, before the Next.js
// build artifact is uploaded.
//
// This test pins that contract. If a future edit drops `db:migrate`
// from the build chain, the test fails loudly.
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, '../..');

function readVercelConfig(): { buildCommand?: string } {
  const raw = readFileSync(resolve(REPO_ROOT, 'vercel.json'), 'utf8');
  return JSON.parse(raw) as { buildCommand?: string };
}

describe('vercel.json deploy contract', () => {
  it('declares a buildCommand', () => {
    const cfg = readVercelConfig();
    expect(typeof cfg.buildCommand).toBe('string');
    expect(cfg.buildCommand?.length ?? 0).toBeGreaterThan(0);
  });

  it('runs `npm run db:migrate` as part of the build chain', () => {
    const cfg = readVercelConfig();
    expect(cfg.buildCommand).toMatch(/npm run db:migrate\b/);
  });

  it('still runs the Next.js build', () => {
    const cfg = readVercelConfig();
    expect(cfg.buildCommand).toMatch(/npm run build\b/);
  });

  it('runs db:migrate BEFORE the Next.js build (so schema exists before bundle ships)', () => {
    const cfg = readVercelConfig();
    const cmd = cfg.buildCommand ?? '';
    const migrateAt = cmd.indexOf('npm run db:migrate');
    const buildAt = cmd.indexOf('npm run build');
    expect(migrateAt).toBeGreaterThanOrEqual(0);
    expect(buildAt).toBeGreaterThanOrEqual(0);
    expect(migrateAt).toBeLessThan(buildAt);
  });

  it('chains the two with `&&` so a migrate failure aborts the deploy', () => {
    const cfg = readVercelConfig();
    expect(cfg.buildCommand).toMatch(/db:migrate\s*&&\s*npm run build/);
  });
});
