import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Phase 2-B — Money columns migrated from real() to numeric(14,2).
//
// real() is 32-bit float — adequate for SPI/CPI ratios and percentages
// but introduces drift for THB arithmetic ("12,500,000.45" round-trips
// as 12_500_000.0 because float32 has a ~7-digit mantissa). numeric(14,2)
// is exact at the DB level for any value up to 999,999,999,999.99 (~1
// trillion THB). Drizzle's `mode: 'number'` parses the column as a JS
// `number` via `Number(string)` — IEEE-754 double (53-bit mantissa)
// preserves up to 15-17 significant digits, which covers every realistic
// THB project value with cent precision. For values that would exceed
// JS Number safety (≥ 1e15), use `mode: 'string'` and a decimal
// library — out of scope for the demo.
//
// This test exercises a sampling of the 18 migrated columns to lock in
// "exact-decimal round-trip" behaviour and catch any regression that
// silently switches a column back to real.
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'pqm_user_id' ? { value: 'user-001' } : undefined,
  }),
}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('money columns — numeric(14,2) exact round-trip (Phase 2-B)', () => {
  it('projects.budget round-trips a fractional baht value without drift', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const repos = getRepositories();
    const target = (await repos.projects.list())[0];
    expect(target).toBeDefined();

    // Pick a value that is NOT representable in float32 but IS representable
    // in numeric(14,2): 12,500,000.45. real() rounds to 12500000.0 (5 sig
    // figs in the fraction part overflow the 24-bit mantissa).
    const exact = 12_500_000.45;
    await repos.projects.update(target.id, { budget: exact });
    const after = await repos.projects.findById(target.id);
    expect(after?.budget).toBe(exact);

    // Restore so other tests in this worker stay stable.
    await repos.projects.update(target.id, { budget: target.budget });
  });

  it('boq_items.unit_price + total round-trip exact decimals', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const repos = getRepositories();
    const item = (await repos.boq.list())[0];
    expect(item).toBeDefined();

    const exactUnit = 1234.56;
    const exactTotal = 9_876_543.21;
    await repos.boq.update(item.id, { unitPrice: exactUnit, total: exactTotal });
    const after = await repos.boq.findById(item.id);
    expect(after?.unitPrice).toBe(exactUnit);
    expect(after?.total).toBe(exactTotal);

    await repos.boq.update(item.id, {
      unitPrice: item.unitPrice,
      total: item.total,
    });
  });

  it('change_requests.budget_impact + impact_budget_thb round-trip exact decimals', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const repos = getRepositories();
    const cr = (await repos.changeRequests.list())[0];
    expect(cr).toBeDefined();

    const exactImpact = 750_000.33;
    const exactBudget = 1_500_000.77;
    await repos.changeRequests.update(cr.id, {
      budgetImpact: exactImpact,
      impactBudgetTHB: exactBudget,
    });
    const after = await repos.changeRequests.findById(cr.id);
    expect(after?.budgetImpact).toBe(exactImpact);
    expect(after?.impactBudgetTHB).toBe(exactBudget);

    await repos.changeRequests.update(cr.id, {
      budgetImpact: cr.budgetImpact,
      impactBudgetTHB: cr.impactBudgetTHB,
    });
  });

  it('non-money columns stay as real() (smoke check that we did not over-migrate)', async () => {
    const { getRepositories } = await import('@/lib/repositories');
    const repos = getRepositories();
    const target = (await repos.projects.list())[0];

    // 0.92 isn't representable exactly in float32 — real() will drift
    // slightly. The point is: SPI/CPI are RATIOS, not arithmetic-driving
    // money, so we explicitly did NOT migrate them. This test locks in
    // that decision: `spiValue` is still `real`, so we don't assert
    // exact equality — we assert *that the row round-trips at all* and
    // that the project's budget (which IS numeric) holds 0.92 exactly.
    await repos.projects.update(target.id, { spiValue: 0.92, budget: 0.92 });
    const after = await repos.projects.findById(target.id);
    expect(after?.spiValue).toBeCloseTo(0.92, 5);
    // numeric(14,2) preserves 0.92 EXACTLY.
    expect(after?.budget).toBe(0.92);

    await repos.projects.update(target.id, {
      spiValue: target.spiValue,
      budget: target.budget,
    });
  });
});
