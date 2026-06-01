import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatGpsLabel, requestGpsAsync } from './photo-gps-helpers';

describe('formatGpsLabel', () => {
  it('renders 5-decimal lat/lng', () => {
    expect(formatGpsLabel({ lat: 13.7563, lng: 100.5018 })).toBe('GPS: 13.75630, 100.50180');
  });

  it('returns bilingual fallback when null', () => {
    expect(formatGpsLabel(null)).toMatch(/No GPS/);
    expect(formatGpsLabel(undefined)).toMatch(/No GPS/);
  });

  it('returns fallback when either coord is missing', () => {
    expect(formatGpsLabel({ lat: 13.7, lng: null })).toMatch(/No GPS/);
    expect(formatGpsLabel({ lat: null, lng: 100 })).toMatch(/No GPS/);
  });

  it('returns fallback when either coord is non-finite', () => {
    expect(formatGpsLabel({ lat: NaN, lng: 100 })).toMatch(/No GPS/);
    expect(formatGpsLabel({ lat: Infinity, lng: 100 })).toMatch(/No GPS/);
  });

  it('honours a custom bilingual fallback', () => {
    expect(formatGpsLabel(null, 'ระบุพิกัดเอง (Enter manually)')).toMatch(/Enter manually/);
  });
});

describe('requestGpsAsync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves unsupported when navigator.geolocation is missing', async () => {
    vi.stubGlobal('navigator', { geolocation: undefined });
    const result = await requestGpsAsync();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unsupported');
  });

  it('resolves with lat/lng when geolocation returns a position', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: (p: GeolocationPosition) => void) => {
          success({
            coords: {
              latitude: 13.75,
              longitude: 100.5,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.parse('2026-06-01T10:00:00Z'),
            toJSON: () => ({}),
          } as GeolocationPosition);
        },
      },
    });

    const result = await requestGpsAsync();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lat).toBeCloseTo(13.75);
      expect(result.lng).toBeCloseTo(100.5);
      expect(result.timestamp).toBe('2026-06-01T10:00:00.000Z');
    }
  });

  it('resolves denied when permission code is 1', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          _success: (p: GeolocationPosition) => void,
          error: (e: GeolocationPositionError) => void,
        ) => {
          error({
            code: 1,
            message: 'permission denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      },
    });

    const result = await requestGpsAsync();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('denied');
  });

  it('resolves error for non-1 error codes (unavailable/timeout)', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          _success: (p: GeolocationPosition) => void,
          error: (e: GeolocationPositionError) => void,
        ) => {
          error({
            code: 3,
            message: 'timeout',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      },
    });

    const result = await requestGpsAsync();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('error');
  });
});
