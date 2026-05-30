import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  announce,
  getRegisteredLiveRegion,
  registerLiveRegion,
  resetAnnouncerForTests,
  unregisterLiveRegion,
} from './announcer';

interface FakeLiveRegion {
  textContent: string;
  setAttribute: ReturnType<typeof vi.fn>;
  getAttribute: (name: string) => string | null;
  attrs: Record<string, string>;
}

function makeFakeRegion(): FakeLiveRegion {
  const attrs: Record<string, string> = {};
  return {
    textContent: '',
    setAttribute: vi.fn((name: string, value: string) => {
      attrs[name] = value;
    }),
    getAttribute: (name: string) => attrs[name] ?? null,
    attrs,
  };
}

describe('announcer', () => {
  beforeEach(() => {
    resetAnnouncerForTests();
    vi.useRealTimers();
  });

  it('returns null when no region is registered', () => {
    expect(getRegisteredLiveRegion('polite')).toBeNull();
    expect(getRegisteredLiveRegion('assertive')).toBeNull();
  });

  it('routes the registered region to the matching politeness', () => {
    const polite = makeFakeRegion();
    const assertive = makeFakeRegion();
    registerLiveRegion('polite', polite as unknown as HTMLElement);
    registerLiveRegion('assertive', assertive as unknown as HTMLElement);

    expect(getRegisteredLiveRegion('polite')).toBe(polite);
    expect(getRegisteredLiveRegion('assertive')).toBe(assertive);
  });

  it('unregister clears only the specified politeness', () => {
    const polite = makeFakeRegion();
    const assertive = makeFakeRegion();
    registerLiveRegion('polite', polite as unknown as HTMLElement);
    registerLiveRegion('assertive', assertive as unknown as HTMLElement);

    unregisterLiveRegion('polite', polite as unknown as HTMLElement);

    expect(getRegisteredLiveRegion('polite')).toBeNull();
    expect(getRegisteredLiveRegion('assertive')).toBe(assertive);
  });

  it('unregister is a no-op if a different element re-registered in the meantime', () => {
    const first = makeFakeRegion();
    const second = makeFakeRegion();
    registerLiveRegion('polite', first as unknown as HTMLElement);
    registerLiveRegion('polite', second as unknown as HTMLElement);

    // Unmount of the first node should not wipe the active second region.
    unregisterLiveRegion('polite', first as unknown as HTMLElement);

    expect(getRegisteredLiveRegion('polite')).toBe(second);
  });

  it('announce writes the message to the registered polite region by default', () => {
    const polite = makeFakeRegion();
    registerLiveRegion('polite', polite as unknown as HTMLElement);

    announce('โครงการบันทึกแล้ว');

    expect(polite.textContent).toBe('โครงการบันทึกแล้ว');
  });

  it('announce routes to the assertive region when level is assertive', () => {
    const polite = makeFakeRegion();
    const assertive = makeFakeRegion();
    registerLiveRegion('polite', polite as unknown as HTMLElement);
    registerLiveRegion('assertive', assertive as unknown as HTMLElement);

    announce('เกิดข้อผิดพลาด', 'assertive');

    expect(polite.textContent).toBe('');
    expect(assertive.textContent).toBe('เกิดข้อผิดพลาด');
  });

  it('announce is a no-op when no matching region is registered', () => {
    expect(() => announce('orphan message')).not.toThrow();
    expect(() => announce('orphan error', 'assertive')).not.toThrow();
  });

  it('announce clears the region after the configured timeout so the same message can replay', () => {
    vi.useFakeTimers();
    const polite = makeFakeRegion();
    registerLiveRegion('polite', polite as unknown as HTMLElement);

    announce('first', 'polite', { clearAfterMs: 500 });
    expect(polite.textContent).toBe('first');

    vi.advanceTimersByTime(499);
    expect(polite.textContent).toBe('first');

    vi.advanceTimersByTime(1);
    expect(polite.textContent).toBe('');
  });

  it('announce does not auto-clear when clearAfterMs is 0', () => {
    vi.useFakeTimers();
    const polite = makeFakeRegion();
    registerLiveRegion('polite', polite as unknown as HTMLElement);

    announce('sticky', 'polite', { clearAfterMs: 0 });
    vi.advanceTimersByTime(10_000);
    expect(polite.textContent).toBe('sticky');
  });

  it('an empty message is rejected (otherwise screen readers re-announce stale state)', () => {
    const polite = makeFakeRegion();
    registerLiveRegion('polite', polite as unknown as HTMLElement);

    announce('');
    announce('   ');

    expect(polite.textContent).toBe('');
  });
});
