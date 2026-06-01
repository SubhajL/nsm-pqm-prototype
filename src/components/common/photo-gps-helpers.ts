/**
 * PR-D1b — Pure helpers backing the `PhotoCaptureField` rich-capture
 * component. Kept in a `.ts` file so they unit-test under the project's
 * node-env vitest config (no jsdom).
 *
 * The capture flow needs (1) a deterministic bilingual GPS label for
 * thumbnails and (2) a thin Promise wrapper around `navigator.geolocation`
 * so tests can mock it cleanly.
 */

export interface GpsCoords {
  lat: number;
  lng: number;
}

/**
 * Render bilingual `lat/lng` text. Returns the fallback string when
 * either coordinate is non-finite (NaN, ±Infinity) so the UI never paints
 * misleading "GPS: NaN, NaN".
 */
export function formatGpsLabel(
  coords: { lat: number | null | undefined; lng: number | null | undefined } | null | undefined,
  fallback = 'ไม่มีพิกัด GPS (No GPS)',
): string {
  if (!coords) return fallback;
  const { lat, lng } = coords;
  if (
    lat === null ||
    lat === undefined ||
    lng === null ||
    lng === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return fallback;
  }
  return `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Promise wrapper around `navigator.geolocation.getCurrentPosition`. Tests
 * mock the global `navigator` directly; in production, browsers without
 * permission resolve to `{ ok: false, reason: 'denied' | 'unsupported' | 'error' }`
 * so the UI can fall back to manual lat/lng inputs.
 */
export type GpsResult =
  | { ok: true; lat: number; lng: number; timestamp: string }
  | { ok: false; reason: 'unsupported' | 'denied' | 'error'; message?: string };

export function requestGpsAsync(): Promise<GpsResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        // 1 = PERMISSION_DENIED in the W3C Geolocation spec
        const reason: GpsResult & { ok: false } extends infer R ? R : never =
          error.code === 1
            ? { ok: false, reason: 'denied', message: error.message }
            : { ok: false, reason: 'error', message: error.message };
        resolve(reason);
      },
      { timeout: 10_000, enableHighAccuracy: false },
    );
  });
}
