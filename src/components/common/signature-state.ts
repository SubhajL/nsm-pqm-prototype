/**
 * PR-D1b — Pure signature-state helpers backing `SignatureCaptureField`.
 *
 * Drawing on a canvas is a side effect we can't unit-test in node; what we
 * CAN test is the state transitions ("user drew something" → mark signed
 * with timestamp; "user pressed clear" → wipe signed + timestamp but keep
 * the name).
 */

export interface SignatureState {
  name: string;
  signed: boolean;
  /** ISO timestamp of the most recent signing event, or null when cleared. */
  timestamp: string | null;
}

/**
 * Returns a `SignatureState` reflecting "the user just drew on the pad."
 * Idempotent: a second draw keeps `signed=true` but bumps `timestamp` to
 * `now`. The name is preserved.
 */
export function markSignatureSigned(
  prev: SignatureState | null | undefined,
  now: Date,
  defaultName = '',
): SignatureState {
  return {
    name: prev?.name ?? defaultName,
    signed: true,
    timestamp: now.toISOString(),
  };
}

/**
 * Returns a `SignatureState` reflecting "the user pressed Clear." The name
 * is preserved (clearing the drawing shouldn't wipe who was about to sign),
 * but `signed` resets to `false` and `timestamp` resets to `null`.
 */
export function clearSignature(prev: SignatureState | null | undefined): SignatureState {
  return {
    name: prev?.name ?? '',
    signed: false,
    timestamp: null,
  };
}

/** Returns a fresh unsigned state. Used when initialising form values. */
export function blankSignature(name = ''): SignatureState {
  return { name, signed: false, timestamp: null };
}

/** Returns `true` if the user has actually signed (drew + has a timestamp). */
export function isSignatureComplete(value: SignatureState | null | undefined): boolean {
  if (!value) return false;
  return value.signed && value.timestamp !== null && value.timestamp.length > 0;
}
