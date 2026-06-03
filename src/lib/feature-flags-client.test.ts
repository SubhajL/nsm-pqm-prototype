import { afterEach, describe, expect, it } from 'vitest';

import { isRidPaymentFlowClientEnabled } from './feature-flags-client';

/**
 * The client mirror reads the statically-inlined
 * `process.env.NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW`. In vitest (node env,
 * no Next build inlining) the access is a live `process.env` lookup, so we
 * can drive it by mutating the var per case.
 */
const KEY = 'NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW';
const original = process.env[KEY];

afterEach(() => {
  if (original === undefined) {
    delete process.env[KEY];
  } else {
    process.env[KEY] = original;
  }
});

describe('isRidPaymentFlowClientEnabled', () => {
  it.each(['true', '1', 'on', 'TRUE', 'On', ' true '])(
    'returns true for the truthy literal %p',
    (value) => {
      process.env[KEY] = value;
      expect(isRidPaymentFlowClientEnabled()).toBe(true);
    },
  );

  it.each(['false', '0', 'off', '', '  ', 'yes', 'enabled'])(
    'returns false for the non-truthy literal %p',
    (value) => {
      process.env[KEY] = value;
      expect(isRidPaymentFlowClientEnabled()).toBe(false);
    },
  );

  it('returns false when the var is unset', () => {
    delete process.env[KEY];
    expect(isRidPaymentFlowClientEnabled()).toBe(false);
  });
});
