/**
 * PR-23 — Feature flag helper.
 *
 * Server-side env-var driven flags. Behavior is deliberately conservative:
 *   - Unset / empty → OFF.
 *   - "true" / "1" / "on" (case-insensitive) → ON.
 *   - Anything else → OFF.
 *
 * Tests use direct env-var stubs (no module-state cache) so each it block
 * is independent. The implementation does NOT memoise — reading
 * `process.env` on every call is cheap and matches Next.js route
 * semantics where the same module is reused across requests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isFeatureEnabled } from './feature-flags';

const FLAG = 'FEATURE_RID_PAYMENT_FLOW';
const ORIGINAL = process.env[FLAG];

describe('isFeatureEnabled', () => {
  beforeEach(() => {
    delete process.env[FLAG];
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env[FLAG];
    } else {
      process.env[FLAG] = ORIGINAL;
    }
  });

  it('returns false when the env var is unset', () => {
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('returns false when the env var is an empty string', () => {
    process.env[FLAG] = '';
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('returns true for "true"', () => {
    process.env[FLAG] = 'true';
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it('returns true for "1"', () => {
    process.env[FLAG] = '1';
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it('returns true for "on"', () => {
    process.env[FLAG] = 'on';
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it('is case-insensitive for "TRUE"', () => {
    process.env[FLAG] = 'TRUE';
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it('returns false for "false"', () => {
    process.env[FLAG] = 'false';
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('returns false for "0"', () => {
    process.env[FLAG] = '0';
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('returns false for unknown truthy-looking strings', () => {
    process.env[FLAG] = 'yes';
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it('re-reads on each invocation (no memoisation)', () => {
    expect(isFeatureEnabled(FLAG)).toBe(false);
    process.env[FLAG] = 'true';
    expect(isFeatureEnabled(FLAG)).toBe(true);
    process.env[FLAG] = '';
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });
});
