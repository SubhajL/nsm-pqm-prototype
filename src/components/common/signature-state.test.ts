import { describe, expect, it } from 'vitest';

import {
  blankSignature,
  clearSignature,
  isSignatureComplete,
  markSignatureSigned,
} from './signature-state';

describe('markSignatureSigned', () => {
  const now = new Date('2026-06-01T10:00:00Z');

  it('flips signed=true and stamps timestamp', () => {
    const next = markSignatureSigned(blankSignature('Alice'), now);
    expect(next.signed).toBe(true);
    expect(next.timestamp).toBe('2026-06-01T10:00:00.000Z');
    expect(next.name).toBe('Alice');
  });

  it('preserves an existing name on a redraw', () => {
    const initial = { name: 'Bob', signed: true, timestamp: '2025-01-01T00:00:00Z' };
    const next = markSignatureSigned(initial, now);
    expect(next.name).toBe('Bob');
    expect(next.timestamp).toBe('2026-06-01T10:00:00.000Z');
  });

  it('uses defaultName when prev is null', () => {
    const next = markSignatureSigned(null, now, 'Default');
    expect(next.name).toBe('Default');
    expect(next.signed).toBe(true);
  });
});

describe('clearSignature', () => {
  it('keeps the name, flips signed=false, wipes timestamp', () => {
    const initial = { name: 'Alice', signed: true, timestamp: '2026-06-01T10:00:00Z' };
    const cleared = clearSignature(initial);
    expect(cleared.name).toBe('Alice');
    expect(cleared.signed).toBe(false);
    expect(cleared.timestamp).toBeNull();
  });

  it('produces a blank shape when prev is null', () => {
    expect(clearSignature(null)).toEqual({ name: '', signed: false, timestamp: null });
  });
});

describe('blankSignature', () => {
  it('produces unsigned shape with the provided name', () => {
    expect(blankSignature('Carol')).toEqual({ name: 'Carol', signed: false, timestamp: null });
  });
});

describe('isSignatureComplete', () => {
  it('is true only when signed AND has timestamp', () => {
    expect(isSignatureComplete(null)).toBe(false);
    expect(isSignatureComplete(blankSignature('A'))).toBe(false);
    expect(isSignatureComplete({ name: 'A', signed: true, timestamp: null })).toBe(false);
    expect(isSignatureComplete({ name: 'A', signed: false, timestamp: '2026-01-01T00:00:00Z' })).toBe(false);
    expect(isSignatureComplete({ name: 'A', signed: true, timestamp: '2026-01-01T00:00:00Z' })).toBe(true);
  });
});
